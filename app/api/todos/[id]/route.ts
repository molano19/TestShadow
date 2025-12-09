import { NextResponse } from "next/server";
import { getById, updateTodo, deleteTodo } from "../../../../lib/todos.supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const todo = await getById(id);
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(todo);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log("PUT /api/todos/:id - id:", id);
    const body = await request.json();
    const patch = body || {};
    console.log("PUT patch:", patch);
    const updated = await updateTodo(id, patch);
    console.log("PUT updated result:", updated);
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT error:", err);
    const detail = process.env.NODE_ENV === "production" ? undefined : String(err);
    return NextResponse.json({ error: "failed to update todo", detail }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log("DELETE /api/todos/:id - id:", id);
    const ok = await deleteTodo(id);
    console.log("DELETE ok result:", ok);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE error:", err);
    const detail = process.env.NODE_ENV === "production" ? undefined : String(err);
    return NextResponse.json({ error: "failed to delete todo", detail }, { status: 500 });
  }
}
