package com.example.backend.dto;

import java.util.List;

// なぜ必要か: 一覧APIのページング契約を固定し、クライアント側の実装差分を減らすため。
public record TodoListResponse(
        List<TodoResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        String sort
) {
}
