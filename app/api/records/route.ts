import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRecordsByUser, upsertRecord } from "@/lib/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const rows = getRecordsByUser(session.userId);
  const records = rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    summary: r.summary,
    messages: JSON.parse(r.messages),
    rounds: r.rounds,
    report: r.report ? JSON.parse(r.report) : null,
  }));

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      id: string;
      title: string;
      createdAt: string;
      summary: string;
      messages: unknown[];
      rounds: number;
      report?: unknown;
    };

    if (!body.id || !body.title || !body.messages) {
      return NextResponse.json({ error: "缺少必要字段" }, { status: 400 });
    }

    upsertRecord(
      body.id,
      session.userId,
      body.title,
      body.createdAt || new Date().toLocaleString("zh-CN", { hour12: false }),
      body.summary || "",
      JSON.stringify(body.messages),
      body.rounds || 0,
      body.report ? JSON.stringify(body.report) : undefined,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Save record error:", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
