package com.arjunerasani.chat_system.controller;

import com.arjunerasani.chat_system.entity.AppointmentToken;
import com.arjunerasani.chat_system.repository.AppointmentTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/tokens")
@CrossOrigin(origins = "http://localhost:5173")
public class TokenVerificationController {
    private final AppointmentTokenRepository appointmentTokenRepository;

    public TokenVerificationController(AppointmentTokenRepository appointmentTokenRepository) {
        this.appointmentTokenRepository = appointmentTokenRepository;
    }

    @Transactional
    @GetMapping("/verify/{token}")
    public ResponseEntity<?> verifySecureLink(@PathVariable String token) {
        AppointmentToken appointmentToken = appointmentTokenRepository.findByToken(token);

        if (appointmentToken == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error",
                    "The link is invalid or has already been used"));
        }

        if (appointmentToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            appointmentTokenRepository.delete(appointmentToken);
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("error",
                    "This secure session link has expired"));
        }

        return ResponseEntity.ok(Map.of("appointmentNumber",
                appointmentToken.getAppointment().getAppointmentNumber(), "status",
                appointmentToken.getAppointment().getStatus(), "type", appointmentToken.getTokenType()));
    }
}
