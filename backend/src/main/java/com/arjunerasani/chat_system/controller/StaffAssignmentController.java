package com.arjunerasani.chat_system.controller;

import com.arjunerasani.chat_system.entity.Appointment;
import com.arjunerasani.chat_system.entity.Staff;
import com.arjunerasani.chat_system.entity.StaffStatus;
import com.arjunerasani.chat_system.entity.Status;
import com.arjunerasani.chat_system.repository.AppointmentRepository;
import com.arjunerasani.chat_system.repository.StaffRepository;
import com.arjunerasani.chat_system.service.EmailNotificationService;
import com.arjunerasani.chat_system.service.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff")
@CrossOrigin(origins = "http://localhost:5173")
public class StaffAssignmentController {
    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private JWTService jwtService;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @GetMapping("/status-check")
    public ResponseEntity<?> checkStatusAndAllocate(@RequestHeader("Authorization") String token) {
        try {
            String staffEmail = jwtService.extractEmail(token);
            Staff staff = staffRepository.findByEmail(staffEmail);

            if (staff == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Staff profile not found in system"));
            }

            staff.setLastSeenAt(LocalDateTime.now());
            staff = staffRepository.save(staff); // Persist it immediately!

            Long staffId = staff.getId();

            List<Status> activeStatuses = List.of(Status.ASSIGNED, Status.ACTIVE, Status.WAITING_FOR_USER_RETURN);
            Appointment currentChat = appointmentRepository.findByAssignedStaffIdAndStatusIn(staffId, activeStatuses);

            List<Appointment> globalWaitingPool = appointmentRepository
                    .findByStatusInOrderByRequestedAtAsc(List.of(Status.WAITING, Status.WAITING_FOR_STAFF));

            if (currentChat != null) {
                return ResponseEntity.ok(Map.of("activeAssignment", currentChat, "waitingCount", globalWaitingPool.size(), "staffStatus", staff.getStatus()));
            }

            if (staff.getStatus() == StaffStatus.ONLINE_BUSY) {
                staff.setStatus(StaffStatus.ONLINE_AVAILABLE);
                staff = staffRepository.save(staff);
            }

            if (!globalWaitingPool.isEmpty()) {
                Appointment oldest = globalWaitingPool.get(0);
                boolean wasWaitingForStaff = oldest.getStatus() == Status.WAITING_FOR_STAFF;

                int rowsUpdated = appointmentRepository.atomicClaimAppointment(
                        oldest.getId(), staffId, Status.ACTIVE,
                        List.of(Status.WAITING, Status.WAITING_FOR_STAFF),
                        LocalDateTime.now());

                if (rowsUpdated > 0) {
                    oldest.setStatus(Status.ACTIVE);
                    oldest.setAssignedStaffId(staffId);

                    Staff freshStaff = staffRepository.findByEmail(staffEmail);
                    freshStaff.setStatus(StaffStatus.ONLINE_BUSY);
                    freshStaff.setLastSeenAt(LocalDateTime.now()); // Keep in sync
                    staffRepository.save(freshStaff);

                    if (wasWaitingForStaff && oldest.getEmail() != null && !oldest.getEmail().isBlank()) {
                        oldest.setStatus(Status.WAITING_FOR_USER_RETURN);
                        appointmentRepository.save(oldest);
                        emailNotificationService.notifyUserToReturn(oldest);
                    }

                    return ResponseEntity.ok(Map.of("activeAssignment", oldest, "waitingCount", globalWaitingPool.size() - 1, "staffStatus", freshStaff.getStatus()));
                }
            }

            Staff finalStaffState = staffRepository.findByEmail(staffEmail);

            return ResponseEntity.ok(Map.of("waitingCount", globalWaitingPool.size(), "staffStatus", finalStaffState.getStatus()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed system state resolution."));
        }
    }

    @PutMapping("/complete/{appointmentId}")
    public ResponseEntity<?> completeAppointment(@PathVariable("appointmentId") Long appointmentId, @RequestHeader("Authorization") String token) {
        try {
            String staffEmail = jwtService.extractEmail(token);
            Staff staff = staffRepository.findByEmail(staffEmail);

            if (staff == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Staff profile not found in system"));
            }

            Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);

            if (appointment == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));
            }

            // make sure this staff member actually is assigned to this appointment
            if (!appointment.getAssignedStaffId().equals(staff.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not your appointment"));
            }

            appointment.setStatus(Status.COMPLETED);
            appointment.setCompletedAt(LocalDateTime.now());
            appointmentRepository.save(appointment);

            // immediately check queue instead of waiting for next poll
            List<Appointment> waitingPool = appointmentRepository.findByStatusInOrderByRequestedAtAsc(List.of(Status.WAITING, Status.WAITING_FOR_STAFF));

            if (!waitingPool.isEmpty()) {
                Appointment next = waitingPool.get(0);
                boolean wasWaitingForStaff = next.getStatus() == Status.WAITING_FOR_STAFF;

                int rowsUpdated = appointmentRepository.atomicClaimAppointment(
                        next.getId(), staff.getId(), Status.ACTIVE,
                        List.of(Status.WAITING, Status.WAITING_FOR_STAFF),
                        LocalDateTime.now());

                if (rowsUpdated > 0) {
                    next.setStatus(Status.ACTIVE);
                    next.setAssignedStaffId(staff.getId());

                    Staff freshStaff = staffRepository.findByEmail(staffEmail);
                    freshStaff.setStatus(StaffStatus.ONLINE_BUSY);
                    staffRepository.save(freshStaff);

                    if (wasWaitingForStaff && next.getEmail() != null && !next.getEmail().isBlank()) {
                        next.setStatus(Status.WAITING_FOR_USER_RETURN);
                        appointmentRepository.save(next);
                        emailNotificationService.notifyUserToReturn(next);
                    }

                    return ResponseEntity.ok(Map.of("message", "Appointment completed, next assigned", "nextAssignment", next, "staffStatus", freshStaff.getStatus()));
                }
            }

            Staff freshStaff = staffRepository.findByEmail(staffEmail);
            freshStaff.setStatus(StaffStatus.ONLINE_AVAILABLE);
            staffRepository.save(freshStaff);

            return ResponseEntity.ok(Map.of("message", "Appointment completed successfully", "staffStatus", freshStaff.getStatus()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to complete appointment."));
        }
    }

    @PutMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String token) {
        try {
            String staffEmail = jwtService.extractEmail(token);
            Staff staff = staffRepository.findByEmail(staffEmail);

            if (staff == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Staff not found"));
            }

            staff.setStatus(StaffStatus.OFFLINE);
            staff.setLastSeenAt(LocalDateTime.now());
            staffRepository.save(staff);

            return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Logout failed"));
        }
    }
}
