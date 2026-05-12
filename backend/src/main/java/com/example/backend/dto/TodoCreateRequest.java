package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// なぜ必要か: 新規作成APIの受け付け項目を固定し、owner_subject を入力対象から除外するため。
public record TodoCreateRequest(
        @NotBlank(message = "title is required")
        @Size(max = 255, message = "title must be 255 characters or less")
        String title,
        @Size(max = 5000, message = "description must be 5000 characters or less")
        String description,
        Boolean completed
) {
}
