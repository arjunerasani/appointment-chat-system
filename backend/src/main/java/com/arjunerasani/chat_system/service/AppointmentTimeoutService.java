package com.arjunerasani.chat_system.service;

import com.arjunerasani.chat_system.entity.Appointment;
import com.arjunerasani.chat_system.entity.Status;
import com.arjunerasani.chat_system.repository.AppointmentRepository;
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

    @Value("${app.waiting.timeout-minutes}")
    private int waitingTimeoutMinutes;

    @Value("${app.user-return.timeout-minutes}")
    private int userReturnTimeoutMinutes;

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
}
