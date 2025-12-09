import { promises as fs } from "fs";
import path from "path";

export type Priority = "Low" | "Medium" | "High";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO
  due?: string; // YYYY-MM-DD
  priority: Priority;
  step?: string; // optional step/subtask
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "todos.json");

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch (err) {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function readTodos(): Promise<Task[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Task[];
  } catch (e) {
    return [];
  }
}

export async function writeTodos(todos: Task[]) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(todos, null, 2), "utf-8");
}

export async function getAll(): Promise<Task[]> {
  return await readTodos();
}

export async function getById(id: string): Promise<Task | undefined> {
  const todos = await readTodos();
  return todos.find((t) => t.id === id);
}

export async function createTodo({
  title,
  due,
  priority = "Medium",
}: {
  title: string;
  due?: string;
  priority?: Priority;
}): Promise<Task> {
  const todos = await readTodos();
  const newTask: Task = {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 8),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
    due: due || undefined,
    priority,
  };
  todos.unshift(newTask);
  await writeTodos(todos);
  return newTask;
}

export async function updateTodo(
  id: string,
  patch: Partial<Pick<Task, "title" | "completed" | "due" | "priority">>
): Promise<Task | undefined> {
  const todos = await readTodos();
  let updated: Task | undefined;
  const next = todos.map((t) => {
    if (t.id !== id) return t;
    updated = { ...t, ...(patch as any) } as Task;
    return updated;
  });
  if (!updated) return undefined;
  await writeTodos(next);
  return updated;
}

export async function deleteTodo(id: string): Promise<boolean> {
  const todos = await readTodos();
  const next = todos.filter((t) => t.id !== id);
  if (next.length === todos.length) return false;
  await writeTodos(next);
  return true;
}
