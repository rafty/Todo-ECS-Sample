package com.example.backend.controllers;

import com.example.backend.model.Todo;
import com.example.backend.repository.TodoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// なぜ必要か: Todo APIの認証境界とレスポンス契約をHTTPレイヤで固定し、将来の回帰を防ぐため。
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TodoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TodoRepository todoRepository;

    @Test
    void shouldReturnUnauthorizedWhenJwtIsMissing() throws Exception {
        mockMvc.perform(get("/api/todos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldExposeActuatorHealthWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void shouldReturnNotFoundWhenAccessingAnotherUsersTodo() throws Exception {
        // なぜ必要か: 404統一方針を実際の認可境界で担保するため、他ユーザー所有データを事前作成する。
        final Todo ownersTodo = todoRepository.save(new Todo("owner-a", "first todo", "hidden", false));

        mockMvc.perform(
                        get("/api/todos/{todoId}", ownersTodo.getId())
                                .with(accessToken("owner-b"))
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldCreateAndListTodosWithPaginationContract() throws Exception {
        final String createBody = """
                {
                  "title": "task-1",
                  "description": "test",
                  "completed": false
                }
                """;

        mockMvc.perform(
                        post("/api/todos")
                                .with(accessToken("owner-a"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(createBody)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("task-1"));

        mockMvc.perform(
                        get("/api/todos")
                                .with(accessToken("owner-a"))
                                .param("page", "0")
                                .param("size", "10")
                                .param("sort", "updatedAt,desc")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.sort").value("updatedAt,desc"))
                .andExpect(jsonPath("$.items[0].title").value("task-1"));
    }

    @Test
    void shouldReturnProblemDetailsForValidationError() throws Exception {
        final String invalidBody = """
                {
                  "title": " ",
                  "description": "desc"
                }
                """;

        mockMvc.perform(
                        post("/api/todos")
                                .with(accessToken("owner-a"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidBody)
                )
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.valueOf("application/problem+json")))
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors").isArray());
    }

    private RequestPostProcessor accessToken(String subject) {
        // なぜ必要か: テストごとにCognito相当の access token 主体を明示し、owner_subject 判定を再現するため。
        return jwt().jwt(jwt -> jwt
                .subject(subject)
                .claim("token_use", "access")
                .claim("scope", "openid"));
    }
}
