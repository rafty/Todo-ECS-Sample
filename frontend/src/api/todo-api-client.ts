import { clearAuthSession, ensureAccessToken } from '../auth/oauth-client';
import type { RuntimeConfig } from '../types/runtime-config';
import type { ProblemDetails, TodoInput, TodoItem, TodoListResponse } from '../types/todo-api';

export class UnauthorizedApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedApiError';
  }
}

export class TodoApiError extends Error {
  public readonly status: number;
  public readonly problem: ProblemDetails | null;

  constructor(message: string, { status, problem }: { status: number; problem: ProblemDetails | null }) {
    super(message);
    this.name = 'TodoApiError';
    this.status = status;
    this.problem = problem;
  }
}

type CreateTodoApiClientInput = {
  runtimeConfig: RuntimeConfig;
  onUnauthorized?: () => void;
};

export type TodoApiClient = {
  fetchTodos: () => Promise<TodoListResponse>;
  createTodo: (todoInput: TodoInput) => Promise<TodoItem>;
  updateTodo: (todoId: number, todoInput: TodoInput) => Promise<TodoItem>;
  deleteTodo: (todoId: number) => Promise<void>;
};

function joinPath(basePath: string, relativePath: string): string {
  const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const normalizedRelativePath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${normalizedBasePath}${normalizedRelativePath}`;
}

async function parseProblemDetails(response: Response): Promise<ProblemDetails | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json') && !contentType.includes('application/problem+json')) {
    return null;
  }

  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return null;
  }
}

function createTodoPayload(todoInput: TodoInput): TodoInput {
  return {
    title: todoInput.title,
    description: todoInput.description,
    completed: todoInput.completed,
  };
}

export function buildProblemMessage(problemDetails: ProblemDetails | null, fallbackMessage: string): string {
  if (!problemDetails) {
    return fallbackMessage;
  }

  if (Array.isArray(problemDetails.errors) && problemDetails.errors.length > 0) {
    return problemDetails.errors
      .map((item) => {
        const field = typeof item.field === 'string' ? item.field : 'field';
        const message = typeof item.message === 'string' ? item.message : 'invalid';
        return `${field}: ${message}`;
      })
      .join(' / ');
  }

  if (typeof problemDetails.detail === 'string' && problemDetails.detail.length > 0) {
    return problemDetails.detail;
  }

  return fallbackMessage;
}

export function createTodoApiClient({ runtimeConfig, onUnauthorized }: CreateTodoApiClientInput): TodoApiClient {
  async function request<T>(relativePath: string, options: RequestInit = {}): Promise<T | null> {
    const accessToken = await ensureAccessToken(runtimeConfig);
    if (!accessToken) {
      clearAuthSession();
      onUnauthorized?.();
      throw new UnauthorizedApiError('認証が必要です。ログインし直してください。');
    }

    const requestHeaders = new Headers(options.headers ?? {});
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);

    if (options.body !== undefined && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    const response = await fetch(joinPath(runtimeConfig.apiBasePath, relativePath), {
      ...options,
      headers: requestHeaders,
    });

    if (response.status === 401) {
      clearAuthSession();
      onUnauthorized?.();
      throw new UnauthorizedApiError('セッションの有効期限が切れました。');
    }

    if (!response.ok) {
      const problemDetails = await parseProblemDetails(response);
      const fallbackMessage = `API 呼び出しに失敗しました (status=${response.status})`;
      throw new TodoApiError(buildProblemMessage(problemDetails, fallbackMessage), {
        status: response.status,
        problem: problemDetails,
      });
    }

    if (response.status === 204) {
      return null;
    }

    return (await response.json()) as T;
  }

  return {
    async fetchTodos(): Promise<TodoListResponse> {
      // なぜ必要か: 一覧取得の既定条件を固定し、UI と backend 契約の乖離を防ぐため。
      const listQuery = new URLSearchParams({
        page: '0',
        size: '100',
        sort: 'updatedAt,desc',
      });
      const response = await request<TodoListResponse>(`/todos?${listQuery.toString()}`);
      return response ?? { items: [] };
    },
    async createTodo(todoInput: TodoInput): Promise<TodoItem> {
      const response = await request<TodoItem>('/todos', {
        method: 'POST',
        body: JSON.stringify(createTodoPayload(todoInput)),
      });
      if (!response) {
        throw new TodoApiError('Todo 作成APIのレスポンスが空です。', {
          status: 500,
          problem: null,
        });
      }
      return response;
    },
    async updateTodo(todoId: number, todoInput: TodoInput): Promise<TodoItem> {
      const response = await request<TodoItem>(`/todos/${encodeURIComponent(String(todoId))}`, {
        method: 'PUT',
        body: JSON.stringify(createTodoPayload(todoInput)),
      });
      if (!response) {
        throw new TodoApiError('Todo 更新APIのレスポンスが空です。', {
          status: 500,
          problem: null,
        });
      }
      return response;
    },
    async deleteTodo(todoId: number): Promise<void> {
      await request<null>(`/todos/${encodeURIComponent(String(todoId))}`, {
        method: 'DELETE',
      });
    },
  };
}
