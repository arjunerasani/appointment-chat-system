# Architectural Design Specification

---

## 1. Overall Architecture

The application is built around a decoupled client server model. The frontend is a single page application that handles presentation and user interaction, while the backend operates as a stateless REST API and transaction manager. Real time state sync between clients is handled through event driven WebSockets. Live video calling is handled by a dedicated media server (LiveKit) that sits alongside the core application, connected to it only through short lived signed tokens.

### 1.1 High Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│                                                                        │
│   ┌──────────────────────────────┐    ┌────────────────────────────┐   │
│   │   User Portal (React App)    │    │   Staff Portal (React)     │   │
│   └──────────────┬───────────────┘    └──────────────┬─────────────┘   │
└──────────────────┼───────────────────────────────────┼─────────────────┘
                   │                                   │
             HTTP / WebSockets                   HTTP / WebSockets
                   │                                   │
 ┌─────────────────▼───────────────────────────────────▼─────────────────┐
 │                        APPLICATION GATEWAY LAYER                      │
 │                                                                       │
 │  ┌─────────────────────────────────────────────────────────────────┐  │
 │  │                  Spring Security Filter Chain                   │  │
 │  │    • Stateless JWT Processing    • OAuth2 Login Delegation      │  │
 │  └────────────────────────────────┬────────────────────────────────┘  │
 └───────────────────────────────────┼───────────────────────────────────┘
                                     │
                        Internal Service Resolution
                                     │
 ┌───────────────────────────────────▼───────────────────────────────────┐
 │                          CORE LOGIC ENGINE                            │
 │                                                                       │
 │  ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────┐  │
 │  │   Queue Manager (FIFO)  │ │   Heartbeat Monitor     │ │  STOMP  │  │
 │  │   • Atomic Assertions   │ │   • Background Sweeper  │ │  Broker │  │
 │  └────────────┬────────────┘ └────────────┬────────────┘ └────┬────┘  │
 └───────────────┼───────────────────────────┼───────────────────┼───────┘
                 │                           │                   │
            JPA / JDBC                  JPA / JDBC         STOMP Frames
                 │                           │                   │
 ┌───────────────▼───────────────────────────▼───────────┐ ┌──────▼──────┐
 │                   PERSISTENCE LAYER                   │ │ EXTERNAL API│
 │                                                       │ │             │
 │                 PostgreSQL Database                   │ │ Gmail SMTP  │
 └───────────────────────────────────────────────────────┘ └─────────────┘

 ┌───────────────────────────────────────────────────────────────────────┐
 │                          MEDIA LAYER (LiveKit)                        │
 │                                                                       │
 │   Client requests a room token > LiveKitTokenService signs a JWT      │
 │   (HMAC SHA256, shared secret) > Client connects directly to the      │
 │   LiveKit media server over WebSocket (SFU architecture)              │
 │                                                                       │
 │   Note: this is a separate process from the Spring app, the backend  │
 │   only issues credentials, it never proxies audio/video traffic.      │
 └───────────────────────────────────────────────────────────────────────┘
```

### 1.2 Architectural Assumptions

- **Thread Safe Allocations:** Multiple support agents will hit the database queue at the same time, so concurrency controls live at the persistence layer rather than in application memory.
- **Network Stability:** Clients are assumed to have reasonably stable connections, but socket drops are expected. The system deliberately separates connection failures from business logic state changes so one doesn't accidentally trigger the other.
- **Single Concurrent Track:** A staff member handles one customer at a time to maintain quality of service.
- **Media Server Independence:** The LiveKit media server is treated as an external dependency, similar to Gmail SMTP. The Spring backend never handles raw audio/video data, it only issues the credentials that let clients talk to LiveKit directly.

### 1.3 Main Components & Modules

- **Client Interface (React + Vite):** A responsive SPA using `react-router-dom` for routing, `useState`/`useEffect` for local state, and reactive STOMP handlers for WebSocket communication.
- **Authentication Tier (OAuth2 + JWT):** Manages Google SSO handshakes on the backend, issues signed JWTs on successful login, and verifies incoming Bearer tokens without maintaining any server side session state.
- **Queue Engine (FIFO):** Allocates appointments strictly in arrival order (`requestedAt ASC`), validating client status before making any binding assignment.
- **Notification Engine (JavaMail):** Sends asynchronous emails containing short lived tokens, never raw database IDs or structural keys.
- **Video Call Layer (LiveKit):** The backend issues short lived, room scoped JWTs signed with a shared HMAC secret. The frontend hands that token directly to a LiveKit client SDK, which opens its own WebSocket connection straight to the LiveKit media server. Spring never touches the media stream itself, it is purely a credential broker.

---

## 2. System Data Flows

### 2.1 Allocation & Queue Flow

```
[User Submits Request] ──> Status: WAITING ──> Database Record Created
                                                     │
                                       (5 Second Background Poll)
                                                     │
                                                     ▼
[Staff Dashboard Polls] ──> Invokes Atomic Claim ──> Status: ACTIVE
                                                     │
                                                     ▼
[State Confirmed] <── Staff: ONLINE_BUSY <───────────┘
       │
       └──> Mounts WebSocket Channel ──> Real Time 1:1 Conversation
```

### 2.2 Lifecycle State Transitions

Appointments move through an explicit state machine driven by user actions and background checks:

| State | Description |
|---|---|
| `WAITING` | Entry state. Request is in the queue, waiting to be picked up. |
| `ASSIGNED` | A staff member has claimed the ticket, but the WebSocket channel isn't open yet. |
| `ACTIVE` | Both parties are connected to a live STOMP chat room. |
| `WAITING_FOR_USER_RETURN` | Staff is present but the user disconnected. A recovery email has been sent. |
| `COMPLETED` | Staff clicked the end session button. |
| `CANCELLED` | The user manually dropped their request while waiting. |
| `EXPIRED` | The background scheduler abandoned the ticket after the inactivity threshold was hit. |

### 2.3 Video Call Token Flow

```
[User Clicks "Join Video"] ──> GET /api/livekit/token ──> LiveKitTokenService
                                                                │
                                                    Signs JWT (roomJoin,
                                                    canPublish, canSubscribe)
                                                                │
                                                                ▼
                              [Client] <── {token} ──── LiveKitController
                                  │
                                  └──> Connects to LiveKit server (ws://.../rtc)
                                       using token as the sole credential
```

The appointment ID is mapped directly to a LiveKit room name (`appointment_{id}`), so each appointment gets its own isolated media room. The `/api/livekit/token` route is intentionally left open in the security config since the token itself, not a Spring session, is what gates access at the LiveKit server.

---

## 3. External Dependencies, Libraries & Services

### 3.1 Backend

| Dependency | Purpose |
|---|---|
| Spring Boot Starter Web & Data JPA | REST endpoints, ORM mappings, connection pooling |
| Spring Security & OAuth2 Client | Auth delegation, endpoint protection, Google SSO redirects |
| PostgreSQL Driver | Database communication layer |
| Spring Boot Starter Mail | SMTP email routing |
| io.jsonwebtoken (JJWT) | JWT construction, signing, and parsing |
| LiveKit Server SDK (JWT signing via JJWT) | Issues signed access tokens granting room join, publish, and subscribe permissions |

### 3.2 Frontend

| Dependency | Purpose |
|---|---|
| React & Vite | Component rendering and dev server |
| @stomp/stompjs & sockjs-client | WebSocket abstraction layer |
| lucide-react | Icon library |
| @livekit/components-react & @livekit/components-styles | Prebuilt video conferencing UI (`LiveKitRoom`, `VideoConference`) |

---

## 4. Implementation Details

### 4.1 Key Design Decisions

**Stateless API (`SessionCreationPolicy.STATELESS`)**
Server side sessions are disabled for all `/api/staff/` endpoints. This sidesteps a common cross origin issue where modern browser tracking protections silently strip cookies on requests between the React dev server (`localhost:5173`) and the Spring backend (`localhost:8080`).

**Decoupled Disconnect Handling**
Staff presence is tracked through proactive HTTP heartbeats and background workers rather than WebSocket disconnect events. This means a user closing a chat tab doesn't accidentally mark a staff member as offline, connection state and business state are kept separate intentionally.

**Token Based Media Authorization (Decoupled from Spring Security)**
LiveKit access control is handled entirely through short lived signed JWTs rather than Spring Security filters. The `/api/livekit/token` endpoint is intentionally `permitAll()`'d, since the JWT itself, not the session, is what gates room access downstream at the LiveKit server. This keeps the media layer decoupled from the app's own auth system, at the cost of needing the signing secret to be kept in sync between the Spring app and the LiveKit server config.

### 4.2 Key Classes & Services

**`SecurityConfig.java`**
Configures CORS, disables CSRF for stateless REST routes, and sets up access rules for public, protected, and token gated endpoints.

**`StaffAssignmentController.java`**
Exposes `/api/staff/status-check`, which does double duty: it acts as a heartbeat to confirm the staff member is still active, and it's the transactional trigger that kicks off queue assignment when a staff member becomes available.

**`AppointmentRepository.java`**
Enforces concurrency safety at the database level using atomic native queries:

```java
@Modifying
@Query("UPDATE Appointment a SET a.assignedStaffId = :staffId, a.status = :newStatus, a.assignedAt = :now " +
       "WHERE a.id = :appointmentId AND a.status IN :validStatuses")
int atomicClaimAppointment(...);
```

If two staff threads race to claim the same ticket, the database guarantees only one write goes through. The second thread gets back `0 rows updated` and safely moves on to the next available ticket.

**`LiveKitController.java`**
Exposes `/api/livekit/token`, generating a room scoped access token for a given appointment. The appointment ID is mapped directly to a LiveKit room name (`appointment_{id}`), giving each appointment its own isolated media room with no cross talk between concurrent calls.

**`LiveKitTokenService.java`**
Signs HMAC SHA256 JWTs granting `roomJoin`, `canPublish`, and `canSubscribe` permissions scoped to a single room. Requires the signing secret to be at least 256 bits, a secret shorter than 32 bytes throws at runtime rather than silently producing an insecure token.

---

## 5. Background Jobs & Schedulers

Background tasks run on recurring intervals via Spring's `@Scheduled` execution model.

### `AppointmentTimeoutService.java`

Monitors and enforces queue health across three areas:

- **Queue Wait Timeouts (`app.waiting.timeout-minutes`):** Tickets that have been sitting in `WAITING` for over 5 minutes with no available staff are moved to `WAITING_FOR_STAFF`, and the frontend prompts the user to enter their email for a recovery link.
- **Staff Heartbeat Monitoring:** If a staff client stops polling the backend for more than 15 seconds, the scheduler flips their status to `OFFLINE` so the queue engine stops trying to assign them tickets.
- **Dead Session Cleanup (`app.abandoned.timeout-minutes`):** Sessions where communication has permanently dropped are marked `EXPIRED` to keep the active queue clean.

---

## 6. Known Limitations

**Poll Driven Scaling**
The staff dashboard currently uses a flat 5 second HTTP poll loop to track system state. This works fine for small teams but scales linearly, every active staff member adds another database read every 5 seconds regardless of whether anything has changed.

**In Memory WebSocket Broker**
The app uses Spring's built in simple message broker. If you ever deploy this behind a load balancer across multiple server instances, messages sent from a user on Server A won't reach a staff member connected to Server B.

**Manually Synced Secrets Across Two Services**
The LiveKit signing secret lives in two places, Spring's `application.properties` and the LiveKit server's own config or environment variables, with nothing enforcing they stay in sync. A mismatch fails silently at the media layer (connection refused) rather than at the token issuing layer, which can be confusing to debug.

---

## 7. Future Improvements

### Short Term

- **Server Sent Events for the Staff Dashboard:** Replace the 5 second poll loop with a passive SSE stream so the backend only pushes updates when something actually changes, bringing polling overhead to zero.
- **Database Indexing:** Add B Tree indexes on `status`, `requestedAt`, and `assignedStaffId` to keep routing queries fast as the appointments table grows.
- **Secrets Management:** Move the LiveKit key and secret pair out of plaintext `application.properties` into a proper secrets store (environment variables at minimum, Vault or AWS Secrets Manager longer term) shared consistently across both services.

### Long Term

- **External Message Broker (RabbitMQ / ActiveMQ):** Swap out the in memory STOMP broker for an external message broker. This decouples message broadcasting from the app runtime and makes horizontal scaling behind a load balancer viable.
- **Redis for Session Metrics:** Move volatile, non-persistent data (like `lastSeenAt` heartbeat timestamps and connection states) out of PostgreSQL and into a Redis cluster to reduce disk I/O and speed up reads and writes on frequently updated fields.
- **Production LiveKit Deployment:** Local development talks to `livekit-server` directly over `ws://localhost:7880`. Production will need TURN and STUN configuration plus TLS (`wss://`) for clients behind restrictive NATs or firewalls, this local dev setup does not need it, but it cannot be skipped for a real deployment.
