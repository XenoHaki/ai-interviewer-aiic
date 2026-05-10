import { NextResponse } from "next/server";
import { requestModelReply } from "@/lib/modelClient";

type IncomingMessage = {
  role?: unknown;
  content?: unknown;
};

function isValidRole(role: unknown): role is "user" | "assistant" {
  return role === "user" || role === "assistant";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: IncomingMessage[] };

    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: "缺少 messages 参数。" }, { status: 400 });
    }

    const messages = body.messages
      .filter((message) => isValidRole(message.role) && typeof message.content === "string")
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: (message.content as string).slice(0, 8000),
      }));

    if (messages.length === 0) {
      return NextResponse.json({ error: "请先输入一条消息。" }, { status: 400 });
    }

    const reply = await requestModelReply(messages);

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器处理请求失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
