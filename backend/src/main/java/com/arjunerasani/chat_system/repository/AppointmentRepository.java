package com.arjunerasani.chat_system.repository;

import com.arjunerasani.chat_system.entity.Appointment;
import com.arjunerasani.chat_system.entity.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByStatusOrderByRequestedAtAsc(Status status);

    Appointment findByAssignedStaffIdAndStatusIn(Long assignedStaffId, List<Status> statuses);

    // this is for thread safety
    @Modifying
    @Transactional
    @Query("UPDATE Appointment a SET a.status = :newStatus, a.assignedStaffId = :staffId, a.assignedAt = :now " +
            "WHERE a.id = :appointmentId AND a.status = :requiredStatus")
    int atomicClaimAppointment(@Param("appointmentId") Long appointmentId, @Param("staffId") Long staffId,
                               @Param("newStatus") Status newStatus, @Param("requiredStatus") Status requiredStatus,
                               @Param("now") LocalDateTime now);

    Appointment findByUserSecureToken(String token);

    long countByStatusAndRequestedAtBefore(Status status, LocalDateTime requestedAt);
}
