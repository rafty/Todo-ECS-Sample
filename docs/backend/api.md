# Backend API 仕様

## 結論

- Todo API のベースパスは `/api/todos` です。
- `/api/**` は JWT 認証が必須で、`/actuator/health` のみ匿名アクセス可能です。
- エラー形式は Problem Details（`application/problem+json`）に統一されます（バリデーション/業務エラー）。

## 認証・認可

- 認証方式: Bearer JWT（Spring Security OAuth2 Resource Server）
- principal: JWT `sub`
- 所有者境界: `owner_subject == principal(sub)` を必須条件として適用

## エンドポイント一覧

| メソッド | パス | 説明 | 主なステータス |
| --- | --- | --- | --- |
| GET | `/api/todos` | Todo 一覧取得 | `200`, `400`, `401` |
| GET | `/api/todos/{todoId}` | Todo 単票取得 | `200`, `401`, `404` |
| POST | `/api/todos` | Todo 作成 | `201`, `400`, `401` |
| PUT | `/api/todos/{todoId}` | Todo 更新（全項目） | `200`, `400`, `401`, `404` |
| DELETE | `/api/todos/{todoId}` | Todo 削除 | `204`, `401`, `404` |

## 一覧 API（GET `/api/todos`）

### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- | --- |
| `page` | number | 任意 | `0` | 0始まりページ番号。負数は `400` |
| `size` | number | 任意 | `20` | 1未満は `20` に補正。上限は `100` |
| `sort` | string | 任意 | `updatedAt,desc` | `<field>` または `<field>,<asc|desc>` |
| `completed` | boolean | 任意 | なし | 完了状態で絞り込み |
| `q` | string | 任意 | なし | `title` / `description` を部分一致検索 |

### `sort` の許可フィールド

- `updatedAt`
- `createdAt`
- `title`
- `completed`

許可されないフィールド指定は `400 Bad Request` になります。

## リクエストボディ

### 作成（POST `/api/todos`）

```json
{
  "title": "買い物",
  "description": "牛乳を買う",
  "completed": false
}
```

- `title`: 必須、空白不可、255文字以下
- `description`: 任意、5000文字以下
- `completed`: 任意（未指定時は `false`）
- `owner_subject` は入力不可（JWT `sub` からサーバー側で決定）

### 更新（PUT `/api/todos/{todoId}`）

```json
{
  "title": "買い物",
  "description": "牛乳と卵を買う",
  "completed": true
}
```

- `title`: 必須、空白不可、255文字以下
- `description`: 任意、5000文字以下
- `completed`: 必須

## レスポンス

### Todo 応答

```json
{
  "id": 1,
  "title": "買い物",
  "description": "牛乳を買う",
  "completed": false,
  "createdAt": "2026-05-12T10:00:00+09:00",
  "updatedAt": "2026-05-12T10:00:00+09:00"
}
```

### 一覧応答

```json
{
  "items": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0,
  "sort": "updatedAt,desc"
}
```

## エラー応答

### 400（バリデーションエラー例）

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "instance": "/api/todos",
  "errors": [
    {
      "field": "title",
      "message": "title is required"
    }
  ]
}
```

### 404（未存在または他ユーザー所有）

- レスポンス詳細は `Todo not found` で統一されます。
- 他ユーザー所有データと未存在データを区別しない仕様です。

## 備考

- `/actuator/health` は ALB ヘルスチェック用途で匿名アクセス可能です。
- 認証ヘッダー未指定時は `401 Unauthorized` になります。
