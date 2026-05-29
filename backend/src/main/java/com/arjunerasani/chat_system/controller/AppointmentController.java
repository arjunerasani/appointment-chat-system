package com.arjunerasani.chat_system.controller;

import com.arjunerasani.chat_system.entity.Appointment;
import com.arjunerasani.chat_system.entity.Status;
import com.arjunerasani.chat_system.repository.AppointmentRepository;
import com.arjunerasani.chat_system.repository.StaffRepository;
import com.arjunerasani.chat_system.service.EmailNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@RestController
@RequestMapping("/appointment")
@CrossOrigin(origins = "http://localhost:5173")
public class AppointmentController {
    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @PostMapping("/request")
    public ResponseEntity<?> requestAppointment(@RequestBody Map<String, String> requestData){
        try {
            String username = requestData.get("username");
            String email = requestData.get("email");
            String reason = requestData.get("reason");

            // validation check
            if (username == null || username.trim().isEmpty() || reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Name and Reason are required."));
            }

            Appointment appointment = new Appointment();
            appointment.setUsername(username);
            appointment.setEmail(email);
            appointment.setReason(reason);
            appointment.setStatus(Status.WAITING);
            appointment.setRequestedAt(LocalDateTime.now());

            appointment.setUserSecureToken(UUID.randomUUID().toString());
            appointment.setStaffSecureToken(UUID.randomUUID().toString());

            // this should generate a random 6 digit reference number for the user
            long referenceNum = 100000L + new Random().nextInt(900000);
            appointment.setAppointmentNumber(referenceNum);

            // save it
            Appointment savedAppointment = appointmentRepository.save(appointment);

            emailNotificationService.notifyEligibleStaff(savedAppointment);

            return ResponseEntity.ok(Map.of("message", "Appointment successfully queued!",
                    "appointmentNumber", savedAppointment.getAppointmentNumber(),
                    "id",  savedAppointment.getId(), "userToken", savedAppointment.getUserSecureToken()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to generate appointment."));
        }
    }

    @GetMapping("/status/{token}")
    public ResponseEntity<?> getAppointmentStatus(@PathVariable String token){
        Appointment appointment = appointmentRepository.findByUserSecureToken(token);

        if (appointment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Invalid routing key."));
        }

        // this is for metrics and queue number for the user
        long position = 0;

        if (appointment.getStatus() == Status.WAITING) {
            position = appointmentRepository.countByStatusAndRequestedAtBefore(Status.WAITING, appointment.getRequestedAt()) + 1;
        }

        return ResponseEntity.ok(Map.of("status", appointment.getStatus(), "appointmentNumber", appointment.getAppointmentNumber(),
                "username", appointment.getUsername(), "reason", appointment.getReason(), "position", position,
                "appointmentId", appointment.getId()));
    }

    @PutMapping("/cancel/{token}")
    public ResponseEntity<?> cancelAppointment(@PathVariable String token){
        Appointment appointment = appointmentRepository.findByUserSecureToken(token);

        if (appointment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ticket has already been assigned to staff."));
        }

        appointment.setStatus(Status.CANCELLED);
        appointment.setCancelledAt(LocalDateTime.now());
        appointmentRepository.save(appointment);

        return  ResponseEntity.ok(Map.of("success", "Appointment has been cancelled."));
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingAppointments() {
        try {
            // retrieve all records where the status is waiting ordering by oldest first
            java.util.List<Appointment> pendingList = appointmentRepository.findByStatusOrderByRequestedAtAsc(Status.WAITING);

            return ResponseEntity.ok(pendingList);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to retrieve queue data"));
        }
    }

    @PutMapping("/update-email/{token}")
    public ResponseEntity<?> updateEmail(@PathVariable String token, @RequestBody Map<String, String> body){
        Appointment appointment = appointmentRepository.findByUserSecureToken(token);

        if (appointment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Appointment not found"));
        }

        String email = body.get("email");

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        appointment.setEmail(email);
        appointmentRepository.save(appointment);

        return ResponseEntity.ok(Map.of("message", "Email saved"));
    }
}
