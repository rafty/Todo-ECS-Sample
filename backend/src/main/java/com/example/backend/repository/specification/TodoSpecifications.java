package com.example.backend.repository.specification;

import com.example.backend.model.Todo;
import org.springframework.data.jpa.domain.Specification;

// なぜ必要か: owner_subject を必須条件として拡張検索条件を安全に合成できるようにするため。
public final class TodoSpecifications {

    private TodoSpecifications() {
    }

    public static Specification<Todo> hasOwnerSubject(String ownerSubject) {
        return (root, query, cb) -> cb.equal(root.get("ownerSubject"), ownerSubject);
    }

    public static Specification<Todo> hasCompleted(Boolean completed) {
        return (root, query, cb) -> {
            if (completed == null) {
                return null;
            }
            return cb.equal(root.get("completed"), completed);
        };
    }

    public static Specification<Todo> containsKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            final String likeCondition = "%" + keyword.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")), likeCondition),
                    cb.like(cb.lower(root.get("description")), likeCondition)
            );
        };
    }
}
