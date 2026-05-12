package com.example.backend.exception;

// なぜ必要か: REST契約に反するリクエスト値を400系として明示し、実装依存エラー混入を防ぐため。
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
