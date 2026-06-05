package com.arjunerasani.chat_system.config;

import com.arjunerasani.chat_system.entity.Appointment;
import com.arjunerasani.chat_system.entity.Staff;
import com.arjunerasani.chat_system.entity.StaffStatus;
import com.arjunerasani.chat_system.entity.Status;
import com.arjunerasani.chat_system.repository.AppointmentRepository;
import com.arjunerasani.chat_system.repository.StaffRepository;
import com.arjunerasani.chat_system.service.EmailNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class WebSocketEventListener {
    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String staffEmail = (String) accessor.getSessionAttributes().get("staffEmail");

        if (staffEmail == null) {
            return;
        }

        Staff staff = staffRepository.findByEmail(staffEmail);

        if (staff == null) {
            return;
        }

        List<Status> activeStatuses = List.of(Status.ASSIGNED, Status.ACTIVE);
        Appointment activeAppointment = appointmentRepository
                .findByAssignedStaffIdAndStatusIn(staff.getId(), activeStatuses);

        if (activeAppointment != null) {
            activeAppointment.setStatus(Status.WAITING);
            activeAppointment.setAssignedStaffId(null);
            appointmentRepository.save(activeAppointment);

            emailNotificationService.notifyEligibleStaff(activeAppointment);
        }
    }
}
