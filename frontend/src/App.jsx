import { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { TodoApiError, UnauthorizedApiError, createTodoApiClient } from './api/todo-api-client';
import {
  buildHostedUiLogoutUrl,
  clearAuthSession,
  completeHostedUiLogin,
  ensureAccessToken,
  initializeAuthRuntime,
  startHostedUiLogin,
} from './auth/oauth-client';
import { hasCognitoRuntimeConfig, loadRuntimeConfig } from './config/runtime-config';
import './App.css';

function toRouterPath(pathValue) {
  if (pathValue === '/') {
    return '';
  }

  return pathValue.replace(/^\/+/, '');
}

function formatDateTime(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return '-';
  }

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dateValue);
}

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Todo Frontend</h1>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

function StatusPanel({ title, message, actionLabel, onAction }) {
  return (
    <section className="status-panel" aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function AuthCallbackPage({ runtimeConfig, onAuthenticated, onAuthFailed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('認証レスポンスを処理しています。');

  useEffect(() => {
    let isActive = true;

    const exchangeCode = async () => {
      try {
        // なぜ必要か: callback で受け取った code/state を即時検証し、ブラウザ上に機微情報を残さないため。
        await completeHostedUiLogin(runtimeConfig, location.search);
        if (!isActive) {
          return;
        }
        onAuthenticated();
        navigate('/', { replace: true });
      } catch (error) {
        if (!isActive) {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : '認証レスポンスの処理中に予期しないエラーが発生しました。';
        setStatusMessage(errorMessage);
        onAuthFailed(errorMessage);
      }
    };

    exchangeCode();
    return () => {
      isActive = false;
    };
  }, [location.search, navigate, onAuthFailed, onAuthenticated, runtimeConfig]);

  return <StatusPanel title="サインイン処理中" message={statusMessage} />;
}

function TodoWorkspace({ apiClient }) {
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [operationMessage, setOperationMessage] = useState('');

  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingCompleted, setEditingCompleted] = useState(false);
  const [editingError, setEditingError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingTodoId, setDeletingTodoId] = useState(null);

  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    setOperationMessage('');

    try {
      const response = await apiClient.fetchTodos();
      const receivedTodos = Array.isArray(response?.items) ? response.items : [];
      setTodos(receivedTodos);
    } catch (error) {
      if (error instanceof UnauthorizedApiError) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Todo 一覧の取得中に予期しないエラーが発生しました。';
      setListError(message);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadTodos();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadTodos]);

  const resetEditForm = useCallback(() => {
    setEditingTodoId(null);
    setEditingTitle('');
    setEditingDescription('');
    setEditingCompleted(false);
    setEditingError('');
    setIsSavingEdit(false);
  }, []);

  const handleCreateTodo = useCallback(
    async (event) => {
      event.preventDefault();
      setCreateError('');
      setOperationMessage('');

      const normalizedTitle = createTitle.trim();
      if (normalizedTitle.length === 0) {
        setCreateError('タイトルは必須です。');
        return;
      }

      setIsCreating(true);
      try {
        await apiClient.createTodo({
          title: normalizedTitle,
          description: createDescription.trim().length > 0 ? createDescription.trim() : null,
          completed: false,
        });
        setCreateTitle('');
        setCreateDescription('');
        setOperationMessage('Todo を作成しました。');
        await loadTodos();
      } catch (error) {
        if (error instanceof UnauthorizedApiError) {
          return;
        }

        if (error instanceof TodoApiError) {
          setCreateError(error.message);
        } else {
          setCreateError('Todo の作成に失敗しました。');
        }
      } finally {
        setIsCreating(false);
      }
    },
    [apiClient, createDescription, createTitle, loadTodos],
  );

  const handleStartEdit = useCallback((todo) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title ?? '');
    setEditingDescription(todo.description ?? '');
    setEditingCompleted(Boolean(todo.completed));
    setEditingError('');
    setOperationMessage('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (editingTodoId === null) {
      return;
    }

    const normalizedTitle = editingTitle.trim();
    if (normalizedTitle.length === 0) {
      setEditingError('タイトルは必須です。');
      return;
    }

    setIsSavingEdit(true);
    setEditingError('');
    setOperationMessage('');

    try {
      await apiClient.updateTodo(editingTodoId, {
        title: normalizedTitle,
        description: editingDescription.trim().length > 0 ? editingDescription.trim() : null,
        completed: editingCompleted,
      });
      resetEditForm();
      setOperationMessage('Todo を更新しました。');
      await loadTodos();
    } catch (error) {
      if (error instanceof UnauthorizedApiError) {
        return;
      }

      if (error instanceof TodoApiError) {
        setEditingError(error.message);
      } else {
        setEditingError('Todo の更新に失敗しました。');
      }
    } finally {
      setIsSavingEdit(false);
    }
  }, [apiClient, editingCompleted, editingDescription, editingTitle, editingTodoId, loadTodos, resetEditForm]);

  const handleToggleCompleted = useCallback(
    async (todo) => {
      setOperationMessage('');
      setEditingError('');

      try {
        await apiClient.updateTodo(todo.id, {
          title: todo.title,
          description: todo.description,
          completed: !todo.completed,
        });
        setOperationMessage('完了状態を更新しました。');
        await loadTodos();
      } catch (error) {
        if (error instanceof UnauthorizedApiError) {
          return;
        }

        const message = error instanceof Error ? error.message : '完了状態の更新に失敗しました。';
        setEditingError(message);
      }
    },
    [apiClient, loadTodos],
  );

  const handleDeleteTodo = useCallback(
    async (todoId) => {
      const confirmed = window.confirm('この Todo を削除しますか？');
      if (!confirmed) {
        return;
      }

      setDeletingTodoId(todoId);
      setOperationMessage('');
      setEditingError('');

      try {
        await apiClient.deleteTodo(todoId);
        if (editingTodoId === todoId) {
          resetEditForm();
        }
        setOperationMessage('Todo を削除しました。');
        await loadTodos();
      } catch (error) {
        if (error instanceof UnauthorizedApiError) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Todo の削除に失敗しました。';
        setEditingError(message);
      } finally {
        setDeletingTodoId(null);
      }
    },
    [apiClient, editingTodoId, loadTodos, resetEditForm],
  );

  return (
    <div className="workspace">
      <section className="panel">
        <h2>Todo 作成</h2>
        <form className="todo-form" onSubmit={handleCreateTodo}>
          <label htmlFor="todo-title">タイトル</label>
          <input
            id="todo-title"
            type="text"
            value={createTitle}
            maxLength={255}
            onChange={(event) => setCreateTitle(event.target.value)}
            disabled={isCreating}
            required
          />

          <label htmlFor="todo-description">説明</label>
          <textarea
            id="todo-description"
            value={createDescription}
            maxLength={5000}
            onChange={(event) => setCreateDescription(event.target.value)}
            disabled={isCreating}
            rows={4}
          />

          <div className="inline-actions">
            <button type="submit" className="primary-button" disabled={isCreating}>
              {isCreating ? '作成中...' : '追加'}
            </button>
          </div>
        </form>
        {createError ? <p className="error-text">{createError}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Todo 一覧</h2>
          <button type="button" className="secondary-button" onClick={loadTodos} disabled={isLoading}>
            再読み込み
          </button>
        </div>

        {isLoading ? <p className="info-text">読み込み中です...</p> : null}
        {!isLoading && listError ? <p className="error-text">{listError}</p> : null}
        {!isLoading && !listError && todos.length === 0 ? (
          <p className="info-text">Todo はまだありません。</p>
        ) : null}

        {!isLoading && !listError && todos.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>タイトル</th>
                  <th>説明</th>
                  <th>完了</th>
                  <th>更新日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {todos.map((todo) => {
                  const isEditingRow = editingTodoId === todo.id;
                  return (
                    <tr key={todo.id}>
                      <td>
                        {isEditingRow ? (
                          <input
                            type="text"
                            value={editingTitle}
                            maxLength={255}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            disabled={isSavingEdit}
                          />
                        ) : (
                          todo.title
                        )}
                      </td>
                      <td>
                        {isEditingRow ? (
                          <textarea
                            value={editingDescription}
                            maxLength={5000}
                            onChange={(event) => setEditingDescription(event.target.value)}
                            disabled={isSavingEdit}
                            rows={2}
                          />
                        ) : todo.description ? (
                          todo.description
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {isEditingRow ? (
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={editingCompleted}
                              onChange={(event) => setEditingCompleted(event.target.checked)}
                              disabled={isSavingEdit}
                            />
                            完了
                          </label>
                        ) : todo.completed ? (
                          '完了'
                        ) : (
                          '未完了'
                        )}
                      </td>
                      <td>{formatDateTime(todo.updatedAt)}</td>
                      <td className="actions-cell">
                        {isEditingRow ? (
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="primary-button"
                              onClick={handleSaveEdit}
                              disabled={isSavingEdit}
                            >
                              {isSavingEdit ? '保存中...' : '保存'}
                            </button>
                            <button type="button" className="secondary-button" onClick={resetEditForm}>
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="inline-actions">
                            <button type="button" className="secondary-button" onClick={() => handleStartEdit(todo)}>
                              編集
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleToggleCompleted(todo)}
                            >
                              完了切替
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleDeleteTodo(todo.id)}
                              disabled={deletingTodoId === todo.id}
                            >
                              {deletingTodoId === todo.id ? '削除中...' : '削除'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {operationMessage ? <p className="success-text">{operationMessage}</p> : null}
        {editingError ? <p className="error-text">{editingError}</p> : null}
      </section>
    </div>
  );
}

function HomePage({ runtimeConfig, authStatus, authMessage, onLogin, onLogout, apiClient }) {
  if (!hasCognitoRuntimeConfig(runtimeConfig)) {
    return (
      <StatusPanel
        title="設定不足"
        message="runtime-config.json に Cognito の設定が不足しています。デプロイ設定を確認してください。"
      />
    );
  }

  if (authStatus === 'checking') {
    return <StatusPanel title="認証確認中" message="セッションを確認しています..." />;
  }

  if (authStatus !== 'authenticated') {
    return (
      <StatusPanel
        title="サインインが必要です"
        message={authMessage || 'Todo を利用するには Cognito Hosted UI でサインインしてください。'}
        actionLabel="ログイン"
        onAction={onLogin}
      />
    );
  }

  return (
    <>
      <div className="toolbar">
        <button type="button" className="secondary-button" onClick={onLogout}>
          ログアウト
        </button>
      </div>
      <TodoWorkspace apiClient={apiClient} />
    </>
  );
}

function App() {
  const [runtimeConfig, setRuntimeConfig] = useState(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [authStatus, setAuthStatus] = useState('checking');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadConfig = async () => {
      try {
        const resolvedRuntimeConfig = await loadRuntimeConfig();
        if (!isActive) {
          return;
        }
        setRuntimeConfig(resolvedRuntimeConfig);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setRuntimeError(
          error instanceof Error ? error.message : 'runtime-config.json の読み込みに失敗しました。',
        );
      }
    };

    loadConfig();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!runtimeConfig || !hasCognitoRuntimeConfig(runtimeConfig)) {
      return;
    }

    let isActive = true;
    const timerId = window.setTimeout(() => {
      setAuthStatus('checking');
    }, 0);

    const bootstrapAuth = async () => {
      // なぜ必要か: 画面初期化時に token ストアを構成し、既存セッションを継続利用できるようにするため。
      initializeAuthRuntime(runtimeConfig);

      const token = await ensureAccessToken(runtimeConfig);
      if (!isActive) {
        return;
      }

      if (token) {
        setAuthStatus('authenticated');
        return;
      }

      setAuthStatus('unauthenticated');
    };

    bootstrapAuth().catch(() => {
      if (!isActive) {
        return;
      }
      clearAuthSession();
      setAuthStatus('unauthenticated');
      setAuthMessage('認証セッションの復元に失敗しました。再ログインしてください。');
    });

    return () => {
      isActive = false;
      window.clearTimeout(timerId);
    };
  }, [runtimeConfig]);

  const handleUnauthorized = useCallback(() => {
    setAuthStatus('unauthenticated');
    setAuthMessage('認証期限が切れたため、再ログインが必要です。');
  }, []);

  const todoApiClient = useMemo(() => {
    if (!runtimeConfig) {
      return null;
    }

    return createTodoApiClient({
      runtimeConfig,
      onUnauthorized: handleUnauthorized,
    });
  }, [handleUnauthorized, runtimeConfig]);

  const handleLogin = useCallback(async () => {
    if (!runtimeConfig || !hasCognitoRuntimeConfig(runtimeConfig)) {
      return;
    }

    setAuthMessage('');

    try {
      await startHostedUiLogin(runtimeConfig);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'ログイン開始に失敗しました。');
    }
  }, [runtimeConfig]);

  const handleLogout = useCallback(() => {
    if (!runtimeConfig || !hasCognitoRuntimeConfig(runtimeConfig)) {
      return;
    }

    clearAuthSession();
    setAuthStatus('unauthenticated');
    window.location.assign(buildHostedUiLogoutUrl(runtimeConfig));
  }, [runtimeConfig]);

  const handleAuthenticated = useCallback(() => {
    setAuthMessage('');
    setAuthStatus('authenticated');
  }, []);

  const handleAuthFailed = useCallback((message) => {
    clearAuthSession();
    setAuthStatus('unauthenticated');
    setAuthMessage(message);
  }, []);

  const callbackRoutePath = useMemo(() => {
    if (!runtimeConfig) {
      return 'auth/callback';
    }
    return toRouterPath(runtimeConfig.callbackPath);
  }, [runtimeConfig]);

  if (runtimeError) {
    return (
      <AppShell>
        <StatusPanel title="初期化エラー" message={runtimeError} />
      </AppShell>
    );
  }

  if (!runtimeConfig) {
    return (
      <AppShell>
        <StatusPanel title="初期化中" message="runtime 設定を読み込んでいます..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route
          path={callbackRoutePath}
          element={
            <AuthCallbackPage
              runtimeConfig={runtimeConfig}
              onAuthenticated={handleAuthenticated}
              onAuthFailed={handleAuthFailed}
            />
          }
        />
        <Route
          path="*"
          element={
            <HomePage
              runtimeConfig={runtimeConfig}
              authStatus={authStatus}
              authMessage={authMessage}
              onLogin={handleLogin}
              onLogout={handleLogout}
              apiClient={todoApiClient}
            />
          }
        />
      </Routes>
    </AppShell>
  );
}

export default App;
