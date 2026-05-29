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

    // this is staff disconnecting from active appointment
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        // get the staff email we stored in the session on connect
        String staffEmail = (String) accessor.getSessionAttributes().get("staffEmail");

        if (staffEmail == null) {
            return; // was a user connection, not staff
        }

        Staff staff = staffRepository.findByEmail(staffEmail);

        if (staff == null) {
            return;
        }

        staff.setStatus(StaffStatus.OFFLINE);
        staff.setLastSeenAt(LocalDateTime.now());
        staffRepository.save(staff);

        // return any active appointment back to the queue
        List<Status> activeStatuses = List.of(Status.ASSIGNED, Status.ACTIVE);
        Appointment activeAppointment = appointmentRepository
                .findByAssignedStaffIdAndStatusIn(staff.getId(), activeStatuses);

        if (activeAppointment != null) {
            activeAppointment.setStatus(Status.WAITING);
            activeAppointment.setAssignedStaffId(null);
            appointmentRepository.save(activeAppointment);

            // notify remained staff that this appointment is back in queue
            emailNotificationService.notifyEligibleStaff(activeAppointment);
        }
    }
}
