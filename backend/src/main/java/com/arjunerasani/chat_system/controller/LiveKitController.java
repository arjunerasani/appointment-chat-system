package com.arjunerasani.chat_system.controller;

import com.arjunerasani.chat_system.service.LiveKitTokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/livekit")
@CrossOrigin(origins = "http://localhost:5173")
public class LiveKitController {
    @Autowired
    private LiveKitTokenService liveKitTokenService;

    @GetMapping("/token")
    public ResponseEntity<?> getRoomToken(@RequestParam String appointmentId, @RequestParam String name) {
        // treat the unique appointment id as the livekit room name
        String roomName = "appointment_" + appointmentId;
        String token = liveKitTokenService.generateToken(roomName, name);

        return ResponseEntity.ok(Map.of("token", token));
    }
}
