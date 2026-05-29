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

    // runs every 30 seconds to check for timed out appointments
    @Scheduled(fixedRate = 3000)
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
}
