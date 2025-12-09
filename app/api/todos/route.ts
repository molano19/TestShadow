import { NextResponse } from "next/server";
import { getAll, createTodo } from "../../../lib/todos.supabase";

const WEBHOOK_URL = process.env.WEBHOOK_URL;

export async function GET() {
  const todos = await getAll();
  return NextResponse.json(todos);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, due, priority, step } = body || {};
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    let todo;
    try {
      todo = await createTodo({ title: title.trim(), due, priority, step });
      console.log("Created todo:", todo);
    } catch (err) {
      // Log the underlying error so you can inspect Supabase response in dev
      console.error("createTodo error:", err);
      const detail = process.env.NODE_ENV === "production" ? undefined : String(err);
      return NextResponse.json({ error: "failed to create todo", detail }, { status: 500 });
    }

    // Notify webhook if configured (non-blocking)
    if (WEBHOOK_URL) {
      try {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event: "todo.created", data: todo }),
        });
      } catch (err) {
        // swallow — webhook failures shouldn't break the API
        console.error("webhook error:", err);
      }
    }

    return NextResponse.json(todo, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
