package com.arjunerasani.chat_system.service;

import com.arjunerasani.chat_system.entity.*;
import com.arjunerasani.chat_system.repository.AppointmentTokenRepository;
import com.arjunerasani.chat_system.repository.StaffRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EmailNotificationService {
    private final JavaMailSender mailSender;
    private final AppointmentTokenRepository appointmentTokenRepository;
    private final StaffRepository staffRepository;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.security.token-timeout-minutes}")
    private int tokenTimeoutMinutes;

    public EmailNotificationService(JavaMailSender mailSender, AppointmentTokenRepository appointmentTokenRepository, StaffRepository staffRepository) {
        this.mailSender = mailSender;
        this.appointmentTokenRepository = appointmentTokenRepository;
        this.staffRepository = staffRepository;
    }

    @Transactional
    public void notifyEligibleStaff(Appointment appointment) {
        List<Staff> availableStaff = staffRepository.findByStatus(StaffStatus.ONLINE_AVAILABLE);

        // don't send email if people are online
        if (!availableStaff.isEmpty()) {
            return;
        }

        // no one online/available then notify all staff so they can log in
        List<Staff> allStaff = staffRepository.findAll();

        for (Staff staff : allStaff) {
            String secureToken = generateSecureToken(appointment, TokenType.STAFF_CLAIM);
            String actionUrl = frontendBaseUrl + "/chat/staff/" + secureToken;

            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(staff.getEmail());
            mailMessage.setSubject("[Action Required] New Waiting Appointment");
            mailMessage.setText(String.format("Hello %s,\n\nA user is waiting in the chat queue.\n\n" +
                    "Summary:\n- User: %s\n- Reason: %s\n\n" +
                    "Click the secure link below to authenticate and claim this chat:\n%s\n\n" +
                    "Note: This link expires in %d minutes.", staff.getName(), appointment.getUsername(),
                    appointment.getReason(), actionUrl, tokenTimeoutMinutes));

            mailSender.send(mailMessage);
        }
    }

    @Transactional
    public void notifyUserToReturn(Appointment appointment) {
        if (appointment.getEmail() == null || appointment.getEmail().isBlank()) {
            return;
        }

        String secureToken = generateSecureToken(appointment, TokenType.USER_REJOIN);
        String actionUrl = frontendBaseUrl + "/chat/user/" + secureToken;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(appointment.getEmail());
        message.setSubject("Staff is Now Available! Return to your Chat");
        message.setText(String.format("Hello %s,\n\nA support staff member has joined your appointment request (#%s).\n\n" +
                "Click the link below to securely return to your live session:\n%s", appointment.getUsername(),
                appointment.getAppointmentNumber(), actionUrl
        ));
        mailSender.send(message);
    }

    private String generateSecureToken(Appointment appointment, TokenType type) {
        String uniqueToken = UUID.randomUUID().toString();
        AppointmentToken token = new AppointmentToken();
        token.setToken(uniqueToken);
        token.setTokenType(type);
        token.setAppointment(appointment);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(tokenTimeoutMinutes));

        appointmentTokenRepository.save(token);

        return uniqueToken;
    }
}
