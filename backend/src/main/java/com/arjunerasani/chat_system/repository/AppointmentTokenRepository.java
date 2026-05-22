package com.arjunerasani.chat_system.repository;

import com.arjunerasani.chat_system.entity.AppointmentToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppointmentTokenRepository extends JpaRepository<AppointmentToken, Long> {
}
