package com.arjunerasani.chat_system.controller;

import com.arjunerasani.chat_system.entity.Appointment;
import com.arjunerasani.chat_system.entity.Staff;
import com.arjunerasani.chat_system.entity.StaffStatus;
import com.arjunerasani.chat_system.entity.Status;
import com.arjunerasani.chat_system.repository.AppointmentRepository;
import com.arjunerasani.chat_system.repository.StaffRepository;
import com.arjunerasani.chat_system.service.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
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

    @GetMapping("/status-check")
    public ResponseEntity<?> checkStatusAndAllocate(@RequestHeader("Authorization") String token) {
        try {
            // get the email hidden inside the jwt authorization header
            String staffEmail = jwtService.extractEmail(token);

            Staff staff = staffRepository.findByEmail(staffEmail);

            if (staff == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Staff profile not found in system"));
            }

            Long staffId = staff.getId();

            // check if the staff is currently handling a chat
            List<Status> activeStatuses = List.of(Status.ASSIGNED, Status.ACTIVE, Status.WAITING_FOR_USER_RETURN);
            Appointment currentChat = appointmentRepository.findByAssignedStaffIdAndStatusIn(staffId, activeStatuses);

            List<Appointment> globalWaitingPool = appointmentRepository.findByStatusOrderByRequestedAtAsc(Status.WAITING);

            if (currentChat != null) {
                return ResponseEntity.ok(Map.of("activeAssignment", currentChat, "waitingCount", globalWaitingPool.size(), "staffStatus", staff.getStatus()));
            }

            // automated queue allocation
            if (!globalWaitingPool.isEmpty()) {
                Appointment oldest = globalWaitingPool.get(0);

                int rowsUpdated = appointmentRepository.atomicClaimAppointment(oldest.getId(), staffId, Status.ACTIVE, Status.WAITING, LocalDateTime.now());

                if (rowsUpdated > 0) {
                    // current thread won the race condition
                    oldest.setStatus(Status.ACTIVE);
                    oldest.setAssignedStaffId(staffId);

                    staff.setStatus(StaffStatus.ONLINE_BUSY);
                    staffRepository.save(staff);

                    return ResponseEntity.ok(Map.of("activeAssignment", oldest, "waitingCount", globalWaitingPool.size() - 1, "staffStatus", staff.getStatus()));
                }
            }

            // no activeAssignment key at all when there's nothing assigned
            return ResponseEntity.ok(Map.of("waitingCount", globalWaitingPool.size(), "staffStatus", staff.getStatus()));
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

            staff.setStatus(StaffStatus.ONLINE_AVAILABLE);
            staffRepository.save(staff);

            return ResponseEntity.ok(Map.of("message", "Appointment completed successfully"));
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
