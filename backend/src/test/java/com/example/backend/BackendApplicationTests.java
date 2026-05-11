package com.example.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// なぜ必要か: 永続化層実装後も最小の起動確認テストを維持し、DB未起動環境でのCI失敗を避けるため。
@SpringBootTest
class BackendApplicationTests {

    @Test
    void contextLoads() {
    }

}
