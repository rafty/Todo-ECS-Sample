# TodoアプリケーションのJPAエンティティとデータベースマイグレーション設計

## コンテキスト

Todoアプリケーションのバックエンドでは、RESTful API で扱う Todo リソースを永続化する必要がある。
本アプリケーションは**複数ユーザが利用する前提**であり、認証基盤として **Amazon Cognito User Pool** を使用する。
そのため、Todo には「誰が所有しているか」を表す識別子が必要となる。

API 設計では、Todo リソースとして以下の項目を扱う。

- id
- ownerId
- title
- description
- completed
- createdAt
- updatedAt

また、一覧取得では完了状態による絞り込み、検索、ページング、ソートなどへの拡張を考慮する。

本アプリケーションでは、データベースとして Amazon Aurora Serverless v2 (PostgreSQL) を使用し、スキーマ変更管理には Flyway を使用する。

Cognito User Pool を認証基盤とするため、ユーザマスタをアプリケーションDBに最初から持つのではなく、**Todo テーブル側で Cognito のユーザ識別子を保持する**設計を採用する必要がある。

このため、Aurora PostgreSQL に適した JPA エンティティ設計、Repository 設計、Flyway マイグレーション方針を定める。

## 決定事項

Todo アプリケーションの永続化層として、以下を採用する。

- ORM: Spring Data JPA
- Entity: `Todo`
- Repository: `TodoRepository`
- Database: Amazon Aurora Serverless v2 (PostgreSQL)
- Migration Tool: Flyway

### ユーザ識別方針

- Todo の所有者は **Cognito User Pool の JWT `sub`** を基準に識別する
- DB カラムとして `owner_subject` を保持する
- `owner_subject` は Cognito User Pool の `sub` に対応する
- 初期段階ではアプリケーションDB内に `users` テーブルを作成しない
- ユーザ表示名、メールアドレス、Cognito username など**変更可能な属性は Todo の所有者識別子に使わない**

### JPA Entity

Todo の JPA Entity は以下の方針で設計する。

- テーブル名は `todos`
- 主キーは `BIGINT` の単一キー
- ID 採番は PostgreSQL の IDENTITY を使用する
- `owner_subject` は必須
- `title` は必須
- `description` は任意
- `completed` は必須、デフォルトは `false`
- `created_at` と `updated_at` は監査用カラムとして保持する
- `updated_at` は更新時に自動更新されるよう、DB 側でも制御する

### Spring Data JPA Repository

Repository は以下の方針で設計する。

- `JpaRepository<Todo, Long>` を継承する
- 一覧取得、単体取得、作成、更新、削除の基本 CRUD は `JpaRepository` に委譲する
- フィルタ、検索、ページング、ソートに対応するため `JpaSpecificationExecutor<Todo>` を併用する
- すべての検索条件に **owner_subject 条件** を含める
- デフォルトの一覧順は `updatedAt desc` を基本とする

### Flyway Migration

Flyway によりスキーマをコード管理する。

- 初期スキーマは `V1__create_todos_table.sql`
- PostgreSQL 向け DDL を使用する
- `updated_at` 自動更新のため、トリガー関数を作成する
- `owner_subject` を含む実用的な複合インデックスを作成する
- `completed`、`updated_at`、検索拡張を見据えたインデックス戦略を採用する

## JPA Entity 設計

### Entity 名

`Todo`

### テーブル名

`todos`

### カラム定義

| カラム名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT | Yes | 主キー |
| owner_subject | VARCHAR(128) | Yes | Cognito User Pool の JWT `sub` |
| title | VARCHAR(255) | Yes | Todoタイトル |
| description | TEXT | No | 詳細説明 |
| completed | BOOLEAN | Yes | 完了状態 |
| created_at | TIMESTAMPTZ | Yes | 作成日時 |
| updated_at | TIMESTAMPTZ | Yes | 更新日時 |

### Entity 設計方針

- `owner_subject` は Todo の所有者識別子であり、**必ず設定される**
- `owner_subject` はサーバ側で JWT から設定し、クライアント入力に依存しない
- `owner_subject` は更新不可とする
- Todo の単体取得・更新・削除は、`id` と `owner_subject` の両方で判定する
- 同一ユーザが多数の Todo を持つ前提で、`owner_subject` を先頭としたインデックスを作成する

### JPA Entity 例

```java
package com.example.todo.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(
    name = "todos",
    indexes = {
        @Index(name = "idx_todos_owner_subject_updated_at", columnList = "owner_subject, updated_at"),
        @Index(name = "idx_todos_owner_subject_completed_updated_at", columnList = "owner_subject, completed, updated_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_subject", nullable = false, length = 128, updatable = false)
    private String ownerSubject;

    @NotBlank(message = "title is required")
    @Size(max = 255, message = "title must be less than or equal to 255 characters")
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "completed", nullable = false)
    @Builder.Default
    private boolean completed = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
```

## Spring Data JPA Repository 設計

### Repository Interface

```java
package com.example.todo.repository;

import com.example.todo.model.Todo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface TodoRepository extends JpaRepository<Todo, Long>, JpaSpecificationExecutor<Todo> {

    Optional<Todo> findByIdAndOwnerSubject(Long id, String ownerSubject);

    boolean existsByIdAndOwnerSubject(Long id, String ownerSubject);

    void deleteByIdAndOwnerSubject(Long id, String ownerSubject);
}
```

### Repository 設計方針

- `findById` 単独ではなく、`findByIdAndOwnerSubject` を基本とする
- 一覧取得は `findAll(Specification<Todo>, Pageable pageable)` を使用する
- Specification に必ず `ownerSubject` 条件を含める
- API の以下の要件に対応する
    - ログイン中ユーザの Todo のみ取得
    - `completed=true|false` による絞り込み
    - `q` による title / description 検索
    - `page`, `size` によるページング
    - `sort=updatedAt,desc` などのソート

### Specification 利用例

```java
package com.example.todo.repository.specification;

import com.example.todo.model.Todo;
import org.springframework.data.jpa.domain.Specification;

public class TodoSpecifications {

    public static Specification<Todo> hasOwnerSubject(String ownerSubject) {
        return (root, query, cb) -> cb.equal(root.get("ownerSubject"), ownerSubject);
    }

    public static Specification<Todo> hasCompleted(Boolean completed) {
        return (root, query, cb) ->
            completed == null ? null : cb.equal(root.get("completed"), completed);
    }

    public static Specification<Todo> containsKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String like = "%" + keyword.trim().toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("title")), like),
                cb.like(cb.lower(root.get("description")), like)
            );
        };
    }
}
```

### Service 層での利用例

```java
Specification<Todo> spec = Specification
    .where(TodoSpecifications.hasOwnerSubject(ownerSubject))
    .and(TodoSpecifications.hasCompleted(completed))
    .and(TodoSpecifications.containsKeyword(q));

Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));

Page<Todo> todos = todoRepository.findAll(spec, pageable);
```

## Flyway マイグレーション設計

### 初期マイグレーション

ファイル名:

```sql
db/migration/V1__create_todos_table.sql
```

### マイグレーション例

```sql
CREATE TABLE todos (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    owner_subject VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_todos_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE INDEX idx_todos_owner_subject_updated_at
    ON todos (owner_subject, updated_at DESC);

CREATE INDEX idx_todos_owner_subject_completed_updated_at
    ON todos (owner_subject, completed, updated_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_todos_set_updated_at
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

## 設計上の意図

### `owner_subject` を使う理由

- Cognito User Pool の `sub` はユーザ識別子として安定している
- `username` や `email` のような変更可能属性を所有者識別子に使わずに済む
- バックエンドが JWT の `sub` をそのまま安全に取り込める
- Todo の所有権判定をシンプルに実装できる

### `users` テーブルを初期導入しない理由

- 認証の正本は Cognito User Pool にある
- Todo アプリ初期版では、所有権判定に必要なのは `sub` のみで十分
- アプリケーションDB内のユーザマスタ同期を避けられる
- 将来的にプロフィール情報が必要になった時点で別途追加できる

### `owner_subject` を先頭にしたインデックスを使う理由

- 一覧取得や完了状態絞り込みは、常にユーザ単位で行われる
- `owner_subject` を先頭にすることで、複数ユーザ環境での取得効率を確保しやすい
- `updated_at` を組み合わせることで、デフォルトソートと相性がよい

### `JpaSpecificationExecutor` を採用する理由

- Todo 一覧 API に必要な絞り込み条件を柔軟に組み合わせられる
- `ownerSubject` 条件を共通化しやすい
- 検索、完了状態、将来の追加条件に拡張しやすい

### `updated_at` を DB 側でも更新する理由

- Hibernate の `@UpdateTimestamp` のみだと DB 外更新に弱い
- データ整合性を DB 側でも担保できる

## 影響

### 正の影響

- 複数ユーザ前提の Todo アプリとして自然な永続化モデルになる
- Cognito User Pool 前提の認証設計と整合する
- Todo の所有権判定をシンプルに実装できる
- CRUD 実装が比較的シンプルなまま維持できる
- 完了状態フィルタ、検索、ページング、ソートに拡張しやすい
- Flyway によりスキーマ変更履歴を明示的に管理できる
- Aurora PostgreSQL へ適した DDL にできる

### 負の影響

- 単一ユーザ前提よりカラムと検索条件が増える
- `owner_subject` を常に検索条件へ含める必要がある
- 検索要件が増えると全文検索や別インデックス戦略が必要になる可能性がある
- ユーザプロフィールを DB に保持しないため、表示名などの要件には追加設計が必要になる

## 備考

- 初期版では `users` テーブルを作成しない
- 所有者識別子には Cognito User Pool の JWT `sub` を使用する
- 将来的にプロフィール情報が必要になった場合は、別途 `user_profiles` などを追加する
- 将来的に共有機能を追加する場合は、`todo_shares` のような関連テーブルを追加し、`owner` と `viewer/editor` を分離して扱う
- 検索要件が強くなった場合は PostgreSQL 全文検索や別検索基盤を検討する
- Flyway の依存関係は PostgreSQL 向けに合わせる
- JDBC ドライバは PostgreSQL 用を使用する

