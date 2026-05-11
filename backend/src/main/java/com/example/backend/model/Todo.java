package com.example.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

// なぜ必要か: Todoの永続化仕様をJPAで明示し、Aurora PostgreSQLとのマッピングを固定するため。
@Entity
@Table(
        name = "todos",
        indexes = {
                @Index(name = "idx_todos_owner_subject_updated_at", columnList = "owner_subject, updated_at"),
                @Index(name = "idx_todos_owner_subject_completed_updated_at", columnList = "owner_subject, completed, updated_at")
        }
)
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_subject", nullable = false, length = 128, updatable = false)
    private String ownerSubject;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "completed", nullable = false)
    private boolean completed = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    // なぜ必要か: JPAがEntityインスタンスを生成するために引数なしコンストラクタを要求するため。
    protected Todo() {
    }

    // なぜ必要か: 新規Todo生成時に必須項目を漏れなく設定できる生成経路を用意するため。
    public Todo(String ownerSubject, String title, String description, boolean completed) {
        this.ownerSubject = ownerSubject;
        this.title = title;
        this.description = description;
        this.completed = completed;
    }

    public Long getId() {
        return id;
    }

    public String getOwnerSubject() {
        return ownerSubject;
    }

    public void setOwnerSubject(String ownerSubject) {
        this.ownerSubject = ownerSubject;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
