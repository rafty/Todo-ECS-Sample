# Backend API 仕様

## この文書の対象

- Todo API の公開契約（`/api/todos`）
- 認証前提と所有者境界
- リクエスト/レスポンス形式とエラー形式

## 前提

- API ベースパスは `/api/todos` です。
- `/api/**` は Bearer JWT が必須です。
- 匿名アクセス可能なエンドポイントは `/actuator/health` のみです。
- エラー形式は Problem Details（`application/problem+json`）に統一します。

## 認証・認可

- 認証方式: Spring Security OAuth2 Resource Server
- principal: JWT `sub`
- 所有者境界: `owner_subject == principal(sub)`

`owner_subject` はクライアントから入力しません。  
サーバー側が JWT の `sub` から決定します。

## エンドポイント一覧

| メソッド | パス | 説明 | 主なステータス |
| --- | --- | --- | --- |
| GET | `/api/todos` | Todo 一覧取得 | `200`, `400`, `401` |
| GET | `/api/todos/{todoId}` | Todo 単票取得 | `200`, `401`, `404` |
| POST | `/api/todos` | Todo 作成 | `201`, `400`, `401` |
| PUT | `/api/todos/{todoId}` | Todo 更新（全項目） | `200`, `400`, `401`, `404` |
| DELETE | `/api/todos/{todoId}` | Todo 削除 | `204`, `401`, `404` |

## 一覧取得（GET `/api/todos`）

### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- | --- |
| `page` | number | 任意 | `0` | 0 始まり。負数は `400` |
| `size` | number | 任意 | `20` | 1 未満は `20` に補正。上限は `100` |
| `sort` | string | 任意 | `updatedAt,desc` | `<field>` または `<field>,<asc|desc>` |
| `completed` | boolean | 任意 | なし | 完了状態で絞り込み |
| `q` | string | 任意 | なし | `title` / `description` を部分一致検索 |

### `sort` で指定可能なフィールド

- `updatedAt`
- `createdAt`
- `title`
- `completed`

上記以外を指定した場合は `400 Bad Request` を返します。

## リクエストボディ

### 作成（POST `/api/todos`）

```json
{
  "title": "買い物",
  "description": "牛乳を買う",
  "completed": false
}
```

- `title`: 必須、空白不可、255 文字以下
- `description`: 任意、5000 文字以下
- `completed`: 任意（未指定時は `false`）

### 更新（PUT `/api/todos/{todoId}`）

```json
{
  "title": "買い物",
  "description": "牛乳と卵を買う",
  "completed": true
}
```

- `title`: 必須、空白不可、255 文字以下
- `description`: 任意、5000 文字以下
- `completed`: 必須

## レスポンス形式

### Todo 単票

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

### Todo 一覧

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

## エラー形式

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

- エラー詳細は `Todo not found` で統一します。
- 未存在と他ユーザー所有を区別しない設計です。

## 関連

- [設計・セキュリティ](./architecture-security.md)
- [データモデル](./data-model.md)
