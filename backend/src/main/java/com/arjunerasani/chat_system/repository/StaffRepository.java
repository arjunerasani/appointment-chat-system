package com.arjunerasani.chat_system.repository;

import com.arjunerasani.chat_system.entity.Staff;
import com.arjunerasani.chat_system.entity.StaffStatus;
import com.arjunerasani.chat_system.entity.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Long> {
    Staff findByEmail(String email);

    List<Staff> findByStatus(StaffStatus status);
}
