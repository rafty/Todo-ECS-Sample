package com.example.backend.exception;

// なぜ必要か: 他ユーザー所有または未存在のTodoを同一レスポンス(404)で扱い、情報漏えいを防ぐため。
public class TodoNotFoundException extends RuntimeException {

    public TodoNotFoundException(Long todoId) {
        super("Todo not found: id=" + todoId);
    }
}
