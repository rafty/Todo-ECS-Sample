package com.example.backend.dto;

import com.example.backend.model.Todo;

import java.time.OffsetDateTime;

// なぜ必要か: APIレスポンス形式をEntityから分離し、将来の永続化変更から公開契約を守るため。
public record TodoResponse(
        Long id,
        String title,
        String description,
        boolean completed,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static TodoResponse from(Todo todo) {
        return new TodoResponse(
                todo.getId(),
                todo.getTitle(),
                todo.getDescription(),
                todo.isCompleted(),
                todo.getCreatedAt(),
                todo.getUpdatedAt()
        );
    }
}
