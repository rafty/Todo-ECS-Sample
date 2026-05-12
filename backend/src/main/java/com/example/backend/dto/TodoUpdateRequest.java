package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// なぜ必要か: 更新APIで必須項目を明示し、曖昧な部分更新の混入を防ぐため。
public record TodoUpdateRequest(
        @NotBlank(message = "title is required")
        @Size(max = 255, message = "title must be 255 characters or less")
        String title,
        @Size(max = 5000, message = "description must be 5000 characters or less")
        String description,
        @NotNull(message = "completed is required")
        Boolean completed
) {
}
