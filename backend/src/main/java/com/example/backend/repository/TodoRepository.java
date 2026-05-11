package com.example.backend.repository;

import com.example.backend.model.Todo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

// なぜ必要か: owner_subject を前提にしたTodo取得をRepository層で共通化し、所有者境界を崩さないため。
public interface TodoRepository extends JpaRepository<Todo, Long>, JpaSpecificationExecutor<Todo> {

    Optional<Todo> findByIdAndOwnerSubject(Long id, String ownerSubject);

    boolean existsByIdAndOwnerSubject(Long id, String ownerSubject);

    void deleteByIdAndOwnerSubject(Long id, String ownerSubject);
}
