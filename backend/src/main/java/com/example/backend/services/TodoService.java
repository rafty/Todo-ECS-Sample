package com.example.backend.services;

import com.example.backend.model.Todo;
import org.springframework.data.domain.Page;

public interface TodoService {

    Page<Todo> listTodos(String ownerSubject, Boolean completed, String keyword, int page, int size, String sort);

    Todo getTodo(String ownerSubject, Long todoId);

    Todo createTodo(String ownerSubject, String title, String description, Boolean completed);

    Todo updateTodo(String ownerSubject, Long todoId, String title, String description, Boolean completed);

    void deleteTodo(String ownerSubject, Long todoId);
}
