package com.example.backend.services.impl;

import com.example.backend.exception.BadRequestException;
import com.example.backend.exception.TodoNotFoundException;
import com.example.backend.model.Todo;
import com.example.backend.repository.TodoRepository;
import com.example.backend.repository.specification.TodoSpecifications;
import com.example.backend.services.TodoService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class TodoServiceImpl implements TodoService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final String DEFAULT_SORT = "updatedAt,desc";
    private static final Map<String, String> ALLOWED_SORT_FIELDS = Map.of(
            "updatedAt", "updatedAt",
            "createdAt", "createdAt",
            "title", "title",
            "completed", "completed"
    );

    private final TodoRepository todoRepository;

    public TodoServiceImpl(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    @Override
    public Page<Todo> listTodos(String ownerSubject, Boolean completed, String keyword, int page, int size, String sort) {
        // なぜ必要か: page/size/sort の契約逸脱を早期に弾き、クエリ実行前に安全な条件へ正規化するため。
        final int normalizedPage = normalizePage(page);
        final int normalizedSize = normalizeSize(size);
        final Sort normalizedSort = normalizeSort(sort);
        final String normalizedKeyword = normalizeKeyword(keyword);

        // なぜ必要か: owner_subject を必須条件に固定し、検索条件を追加しても所有者境界を崩さないため。
        final Specification<Todo> specification = TodoSpecifications.hasOwnerSubject(ownerSubject)
                .and(TodoSpecifications.hasCompleted(completed))
                .and(TodoSpecifications.containsKeyword(normalizedKeyword));

        return todoRepository.findAll(specification, PageRequest.of(normalizedPage, normalizedSize, normalizedSort));
    }

    @Override
    public Todo getTodo(String ownerSubject, Long todoId) {
        // なぜ必要か: ID検索時も所有者条件を同時適用し、他ユーザーの存在情報漏えいを防ぐため。
        return todoRepository.findByIdAndOwnerSubject(todoId, ownerSubject)
                .orElseThrow(() -> new TodoNotFoundException(todoId));
    }

    @Override
    @Transactional
    public Todo createTodo(String ownerSubject, String title, String description, Boolean completed) {
        // なぜ必要か: owner_subject をJWT由来の値で固定して保存し、リクエスト偽装を排除するため。
        final Todo todo = new Todo(
                ownerSubject,
                normalizeTitle(title),
                normalizeDescription(description),
                completed != null && completed
        );
        return todoRepository.save(todo);
    }

    @Override
    @Transactional
    public Todo updateTodo(String ownerSubject, Long todoId, String title, String description, Boolean completed) {
        // なぜ必要か: 更新対象を所有者条件付きで取得し、他ユーザーデータ更新を404で統一するため。
        final Todo todo = todoRepository.findByIdAndOwnerSubject(todoId, ownerSubject)
                .orElseThrow(() -> new TodoNotFoundException(todoId));

        if (completed == null) {
            throw new BadRequestException("completed is required");
        }

        // なぜ必要か: DB制約と整合する入力だけを反映し、不正値や空白タイトルを永続化しないため。
        todo.setTitle(normalizeTitle(title));
        todo.setDescription(normalizeDescription(description));
        todo.setCompleted(completed);
        return todoRepository.save(todo);
    }

    @Override
    @Transactional
    public void deleteTodo(String ownerSubject, Long todoId) {
        // なぜ必要か: 削除可否判定を所有者条件で先に行い、削除結果からの存在推測を防ぐため。
        if (!todoRepository.existsByIdAndOwnerSubject(todoId, ownerSubject)) {
            throw new TodoNotFoundException(todoId);
        }
        todoRepository.deleteByIdAndOwnerSubject(todoId, ownerSubject);
    }

    private int normalizePage(int page) {
        // なぜ必要か: 負数ページの受け付けを禁止し、DBアクセスの不整合を防ぐため。
        if (page < 0) {
            throw new BadRequestException("page must be greater than or equal to 0");
        }
        return page;
    }

    private int normalizeSize(int size) {
        // なぜ必要か: 契約上のデフォルト値と上限値を統一し、過大リクエストによる負荷増を抑えるため。
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private Sort normalizeSort(String sort) {
        // なぜ必要か: ソート対象を許可リストで制限し、未知プロパティ指定による実行時エラーを防ぐため。
        final String sortExpression = (sort == null || sort.isBlank()) ? DEFAULT_SORT : sort.trim();
        final String[] parts = sortExpression.split(",");
        if (parts.length == 0 || parts.length > 2) {
            throw new BadRequestException("sort must be '<field>' or '<field>,<asc|desc>'");
        }

        final String requestedField = parts[0].trim();
        final String entityField = ALLOWED_SORT_FIELDS.get(requestedField);
        if (entityField == null) {
            throw new BadRequestException("Unsupported sort field: " + requestedField);
        }

        final String direction = parts.length == 2 ? parts[1].trim().toLowerCase(Locale.ROOT) : "desc";
        final Sort.Direction sortDirection = switch (direction) {
            case "asc" -> Sort.Direction.ASC;
            case "desc" -> Sort.Direction.DESC;
            default -> throw new BadRequestException("sort direction must be asc or desc");
        };
        return Sort.by(sortDirection, entityField);
    }

    private String normalizeTitle(String title) {
        // なぜ必要か: タイトル空白値を防ぎ、DBの `title` 制約とAPI契約を同時に満たすため。
        if (title == null || title.isBlank()) {
            throw new BadRequestException("title is required");
        }
        return title.trim();
    }

    private String normalizeDescription(String description) {
        // なぜ必要か: 空文字descriptionをnullへ寄せ、検索・表示ロジックの揺らぎを減らすため。
        if (description == null) {
            return null;
        }
        final String normalizedDescription = description.trim();
        return normalizedDescription.isEmpty() ? null : normalizedDescription;
    }

    private String normalizeKeyword(String keyword) {
        // なぜ必要か: 検索語の先頭末尾空白による誤判定を避け、Specification側の判定を安定化するため。
        if (keyword == null) {
            return null;
        }
        final String normalizedKeyword = keyword.trim();
        return normalizedKeyword.isEmpty() ? null : normalizedKeyword;
    }
}
