package com.arjunerasani.chat_system.service;

import com.arjunerasani.chat_system.entity.Appointment;
import com.arjunerasani.chat_system.entity.Staff;
import com.arjunerasani.chat_system.entity.Status;
import com.arjunerasani.chat_system.repository.AppointmentRepository;
import com.arjunerasani.chat_system.repository.StaffRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AppointmentTimeoutService {
    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private StaffRepository staffRepository;

    @Value("${app.waiting.timeout-minutes}")
    private int waitingTimeoutMinutes;

    @Value("${app.user-return.timeout-minutes}")
    private int userReturnTimeoutMinutes;

    @Value("${app.abandoned.timeout-minutes}")
    private int abandonedTimeoutMinutes;

    // runs every 30 seconds to check for timed out appointments
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void checkWaitingTimeouts() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(waitingTimeoutMinutes);

        List<Appointment> timedOut = appointmentRepository.findByStatusAndRequestedAtBefore(Status.WAITING, cutoff);

        for (Appointment appointment : timedOut) {
            appointment.setStatus(Status.WAITING_FOR_STAFF);
        }

        if (!timedOut.isEmpty()) {
            appointmentRepository.saveAll(timedOut);
        }
    }

    // runs every 60 seconds to expire appointments where user never returned
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void checkUserReturnTimeouts() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(userReturnTimeoutMinutes);

        List<Appointment> timedOut = appointmentRepository.findByStatusAndAssignedAtBefore(Status.WAITING_FOR_USER_RETURN, cutoff);

        for (Appointment appointment : timedOut) {
            appointment.setStatus(Status.EXPIRED);
        }

        if (!timedOut.isEmpty()) {
            appointmentRepository.saveAll(timedOut);
        }
    }

    // expires WAITING_FOR_STAFF appointments where user never left an email
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void checkAbandonedNoEmail() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(waitingTimeoutMinutes + 10);
        List<Appointment> abandoned = appointmentRepository.findByStatusAndEmailIsNullAndRequestedAtBefore(Status.WAITING_FOR_STAFF, cutoff);

        for (Appointment appointment : abandoned) {
            appointment.setStatus(Status.EXPIRED);
        }

        if (!abandoned.isEmpty()) {
            appointmentRepository.saveAll(abandoned);
        }
    }

    // expires appointments where user closed browser and stopped polling
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void checkAbandonedByPolling() {
        // if user hasn't polled in 3x the polling interval (3.5s * 3 = ~10s) they're gone
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(abandonedTimeoutMinutes);

        List<Appointment> abandoned = appointmentRepository.findByStatusInAndLastSeenAtBefore(List.of(Status.WAITING, Status.WAITING_FOR_STAFF), cutoff);

        for (Appointment appointment : abandoned) {
            // only expire if no email was provided, otherwise keep waiting
            if (appointment.getEmail() == null || appointment.getEmail().isBlank()) {
                appointment.setStatus(Status.EXPIRED);
            }
        }

        if (!abandoned.isEmpty()) {
            appointmentRepository.saveAll(abandoned);
        }
    }

    @Scheduled(fixedRate = 20000)
    @Transactional
    public void checkStaffHeartbeats() {
        java.time.LocalDateTime deadThreshold = java.time.LocalDateTime.now().minusSeconds(15);

        List<Staff> activeStaff = staffRepository.findByStatus(com.arjunerasani.chat_system.entity.StaffStatus.ONLINE_AVAILABLE);
        for (Staff staff : activeStaff) {
            if (staff.getLastSeenAt().isBefore(deadThreshold)) {
                staff.setStatus(com.arjunerasani.chat_system.entity.StaffStatus.OFFLINE);
                staffRepository.save(staff);
            }
        }
    }
}
