package com.arjunerasani.chat_system.controller;

import com.arjunerasani.chat_system.entity.Appointment;
import com.arjunerasani.chat_system.entity.Status;
import com.arjunerasani.chat_system.repository.AppointmentRepository;
import com.arjunerasani.chat_system.repository.StaffRepository;
import com.arjunerasani.chat_system.service.EmailNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

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
            if (username == null || email == null || reason == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "All fields are required"));
            }

            Appointment appointment = new Appointment();
            appointment.setUsername(username);
            appointment.setEmail(email);
            appointment.setReason(reason);
            appointment.setStatus(Status.WAITING);
            appointment.setRequestedAt(LocalDateTime.now());

            // this should generate a random 6 digit reference number for the user
            long referenceNum = 100000L + new Random().nextInt(900000);
            appointment.setAppointmentNumber(referenceNum);

            // save it
            Appointment savedAppointment = appointmentRepository.save(appointment);

            emailNotificationService.notifyEligibleStaff(savedAppointment);

            return ResponseEntity.ok(Map.of("message", "Appointment successfully queued!",
                    "appointmentNumber", savedAppointment.getAppointmentNumber(),
                    "id",  savedAppointment.getId()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Server processing error"));
        }
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
}
