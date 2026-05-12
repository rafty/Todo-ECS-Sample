export type TodoItem = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  updatedAt: string;
  createdAt?: string;
};

export type TodoListResponse = {
  items: TodoItem[];
  [key: string]: unknown;
};

export type TodoInput = {
  title: string;
  description: string | null;
  completed: boolean;
};

export type ProblemFieldError = {
  field?: string;
  message?: string;
  [key: string]: unknown;
};

export type ProblemDetails = {
  detail?: string;
  errors?: ProblemFieldError[];
  [key: string]: unknown;
};
