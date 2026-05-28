package com.arjunerasani.chat_system.controller;

import com.arjunerasani.chat_system.entity.ChatMessage;
import com.arjunerasani.chat_system.repository.AppointmentRepository;
import com.arjunerasani.chat_system.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class ChatController {
    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;

    // handles incoming chat message over websocket
    // frontend sends to /app/chat/{appointmentId}
    @MessageMapping("/chat/{appointmentId}")
    public void handleMessage(@DestinationVariable Long appointmentId, @Payload Map<String, Object> payload) {
        ChatMessage message = new ChatMessage();

        message.setAppointmentId(appointmentId);
        message.setSenderType((String) payload.get("senderType"));
        message.setSenderId(Long.valueOf(payload.get("senderId").toString()));
        message.setMessageText((String) payload.get("messageText"));
        message.setCreatedAt(LocalDateTime.now());
        chatMessageRepository.save(message);

        // broadcast to everyone subscribed to this appointments topic
        simpMessagingTemplate.convertAndSend("/topic/appointment/" + appointmentId, message);
    }

    // endpoint to load chat history
    @GetMapping("/api/chat/history/{appointmentId}")
    public ResponseEntity<?> getChatHistory(@PathVariable Long appointmentId) {
        List<ChatMessage> history = chatMessageRepository.findByAppointmentIdOrderByCreatedAtAsc(appointmentId);

        return ResponseEntity.ok(history);
    }

}
