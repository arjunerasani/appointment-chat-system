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
    @Query("UPDATE Appointment a SET a.status = :newStatus, a.assignedStaffId = :staffId, a.assignedAt = :now WHERE a.id = :id AND a.status IN :expectedStatuses")
    int atomicClaimAppointment(@Param("id") Long id, @Param("staffId") Long staffId, @Param("newStatus") Status newStatus, @Param("expectedStatuses") List<Status> expectedStatuses, @Param("now") LocalDateTime now);

    Appointment findByUserSecureToken(String token);

    long countByStatusAndRequestedAtBefore(Status status, LocalDateTime requestedAt);

    List<Appointment> findByStatusAndRequestedAtBefore(Status status, LocalDateTime cutoff);

    List<Appointment> findByStatusAndAssignedAtBefore(Status status, LocalDateTime cutoff);

    List<Appointment> findByStatusInOrderByRequestedAtAsc(List<Status> statuses);

    // for finding abandoned appointments with no email
    List<Appointment> findByStatusAndEmailIsNullAndRequestedAtBefore(Status status, LocalDateTime cutoff);

    // for finding appointments where user stopped polling
    List<Appointment> findByStatusInAndLastSeenAtBefore(List<Status> statuses, LocalDateTime cutoff);
}
