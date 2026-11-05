package com.equipe.estoque.repository;

import com.equipe.estoque.entity.BootstrapOnboarding;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface BootstrapOnboardingRepository extends JpaRepository<BootstrapOnboarding, Short> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BootstrapOnboarding b WHERE b.id = :id")
    Optional<BootstrapOnboarding> findByIdForUpdate(Short id);
}
