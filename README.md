# Appointment Chat System
 
## Prerequisites
 
Before setting up the application, ensure you have the following installed on your machine:
 
- **Java Development Kit (JDK):** Version 17 or higher
- **Node.js:** v18.x or higher (includes `npm`)
- **PostgreSQL Server:** v14 or higher running locally
- **Google Cloud Console Developer Account:** To configure OAuth2 client credentials
---
 
## Environment Variables & Credentials
 
The application uses externalized environment variables to keep sensitive keys secure. You must acquire and configure credentials for **Google OAuth2**, **Gmail SMTP**, and a **custom JWT Secret token string** before launching the platform.
 
### 1. Google OAuth2 Client Keys
 
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and navigate to **API & Services > Credentials**.
3. Configure your OAuth Consent Screen, then select **Create Credentials > OAuth client ID**.
4. Set the Application type to **Web application**.
5. Add the following **Authorized redirect URI**:
   ```
   http://localhost:8080/login/oauth2/code/google
   ```
6. Save your generated **Client ID** and **Client Secret**.
### 2. Gmail SMTP App Password
 
To allow the system to send email notifications, your standard Gmail password will not suffice if 2 Step Verification is active.
 
1. Go to your [Google Account Settings](https://myaccount.google.com/).
2. Navigate to **Security** and select **2 Step Verification**.
3. Scroll to the bottom and select **App passwords**.
4. Generate an app password (e.g., name it "Appointment Chat System") and copy the 16 character code (no spaces).

---
 
## Installation & Setup
 
### Step 1: Clone the Repository
 
```bash
git clone https://github.com/arjunerasani/appointment-chat-system.git
cd appointment-chat-system
```
 
### Step 2: Database Initialization
 
Log into your local PostgreSQL instance and create the target database:
 
```sql
CREATE DATABASE appointment_chat_db;
```
 
### Step 3: Configure and Start the Backend
 
1. Navigate to the backend directory root (where `pom.xml` is located).
2. Set up your runtime environment variables. You can export these in your terminal profile, IDE run configuration (IntelliJ IDEA / Eclipse), or supply them directly:
```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export MAIL_USERNAME="your-gmail-address@gmail.com"
export MAIL_PASSWORD="your-16-digit-app-password"
export JWT_SECRET="your-chosen-long-secure-random-jwt-string-secret"
```
 
3. The core architecture defaults map to the following configuration in `src/main/resources/application.properties`:
```properties
spring.application.name=chat-system
 
# PostgreSQL Database Connection Settings
spring.datasource.url=jdbc:postgresql://localhost:5432/appointment_chat_db
spring.datasource.username=postgres
spring.datasource.password=root
spring.datasource.driver-class-name=org.postgresql.Driver
 
# Hibernate/JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
 
# Google OAuth
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
spring.security.oauth2.client.registration.google.scope=profile,email
 
# Spring Mail Properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
 
# Custom Token Security Limits & Timeouts
app.security.token-timeout-minutes=20
app.frontend.base-url=http://localhost:5173
app.waiting.timeout-minutes=5
app.user-return.timeout-minutes=60
app.abandoned.timeout-minutes=10
 
app.jwt.secret=${JWT_SECRET}
```
 
4. Launch the Spring Boot server using the Maven Wrapper:
```bash
# On Linux/macOS
./mvnw spring-boot:run
 
# On Windows (CMD/PowerShell)
mvnw.cmd spring-boot:run
```
 
The server will bind to port `8080`. Hibernate will automatically generate the database schemas inside `appointment_chat_db`.
 
### Step 4: Configure and Start the Frontend React Client
 
1. Open a new terminal and navigate to the React client directory root.
2. Install project dependencies:
```bash
npm install
```
 
3. Start the Vite development server:
```bash
npm run dev
```
 
The client will mount at [http://localhost:5173](http://localhost:5173).

### Step 5: Configure and Start the LiveKit Media Server

The support chat engine relies on LiveKit (WebRTC orchestration) to power real-time voice and video capabilities directly beside the text interface.

1. **Prerequisite:** Ensure **Docker Desktop** is installed, configured with WSL 2, and currently running on your host machine.
2. **Configure Credentials:** Open `src/main/resources/application.properties` and add the matching development gateway keys at the bottom:
```properties
# LiveKit Local Development Gateway Credentials
livekit.api.key=devkey
livekit.api.secret=+z/iCLtSkUgomILOE/qBxHJLe/fvPjF3olDIp/FJyeo=
   ```
3. **Launch the Container:** Open a terminal window and execute the following command to download, bind, and boot the LiveKit server instance:
```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp -e LIVEKIT_KEYS="devkey: +z/iCLtSkUgomILOE/qBxHJLe/fvPjF3olDIp/FJyeo=" livekit/livekit-server --bind 0.0.0.0
```

---
 
## Verifying Workflows & Simulating System Flows
 
To test the application across portals locally without data overlapping, use a **standard browser window** for the User Portal and an **Incognito/Private Window** for the Staff Portal.
 
### 1. Simulating an Instant Connection (FIFO Flow)
 
1. In your Incognito window, navigate to `http://localhost:5173/staff-dashboard` and click **Log In via Google**.
2. Upon successful authentication, your status will show as `ONLINE_AVAILABLE` and state tracking begins.
3. In your normal browser window, go to `http://localhost:5173/`, click **Request Appointment**, and fill in your details.
4. The system will immediately link the structures, the user is connected, the staff dashboard shifts to `ONLINE_BUSY`, and the real-time chat interface mounts on both screens.

### 2. Simulating a Queue Timeout & Rejoin Flow
 
1. Log out any active staff member or close the staff dashboard entirely.
2. Submit a new user ticket request. Because no staff members are available, the user remains on the waiting screen.
3. To bypass waiting the full 5 minutes in local testing, note that the background worker sweeps every **20 seconds**.
4. The system updates the ticket status to `WAITING_FOR_STAFF` and prompts the user to submit an email address.
5. Once a staff member logs in and claims the ticket, the user automatically receives a notification email containing a token-secured recovery link (`/chat/user/{secureToken}`) to rejoin their session.

 **Note: At least one staff account must be present in the database for appointment requests to successfully go through.**

### 3. Simulating Real Time Audio and Video Calls

1. Connect a User and a Staff member into an active chat room using the standard FIFO flow.
2. In the staff chat window, click the **"Join Video"** button.
3. Grant the browser explicit permissions to access your webcam/microphone arrays.
4. Once the media grid initializes, switch to the user chat window and click **"Join Video"** on that side. The WebRTC streams will negotiate automatically through the Docker proxy, displaying live streams.
 
---
 
## Core Architecture Documentation
 
For an in-depth review of architectural decisions, database models, background scheduler algorithms, and concurrency race condition mitigations, please refer to the `ARCHITECTURE.md` blueprint document.
