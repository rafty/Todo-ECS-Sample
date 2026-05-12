import { clearAuthSession, ensureAccessToken } from '../auth/oauth-client';

export class UnauthorizedApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedApiError';
  }
}

export class TodoApiError extends Error {
  constructor(message, { status, problem }) {
    super(message);
    this.name = 'TodoApiError';
    this.status = status;
    this.problem = problem;
  }
}

function joinPath(basePath, relativePath) {
  const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const normalizedRelativePath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${normalizedBasePath}${normalizedRelativePath}`;
}

async function parseProblemDetails(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json') && !contentType.includes('application/problem+json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function createTodoPayload(todoInput) {
  return {
    title: todoInput.title,
    description: todoInput.description,
    completed: todoInput.completed,
  };
}

export function buildProblemMessage(problemDetails, fallbackMessage) {
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

export function createTodoApiClient({ runtimeConfig, onUnauthorized }) {
  async function request(relativePath, options = {}) {
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

    return response.json();
  }

  return {
    async fetchTodos() {
      // なぜ必要か: 一覧取得の既定条件を固定し、UI と backend 契約の乖離を防ぐため。
      const listQuery = new URLSearchParams({
        page: '0',
        size: '100',
        sort: 'updatedAt,desc',
      });
      return request(`/todos?${listQuery.toString()}`);
    },
    async createTodo(todoInput) {
      return request('/todos', {
        method: 'POST',
        body: JSON.stringify(createTodoPayload(todoInput)),
      });
    },
    async updateTodo(todoId, todoInput) {
      return request(`/todos/${encodeURIComponent(String(todoId))}`, {
        method: 'PUT',
        body: JSON.stringify(createTodoPayload(todoInput)),
      });
    },
    async deleteTodo(todoId) {
      return request(`/todos/${encodeURIComponent(String(todoId))}`, {
        method: 'DELETE',
      });
    },
  };
}
