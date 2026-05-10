import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser } from "@/lib/db";
import { signToken, buildCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = (await req.json()) as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json({ error: "用户名长度需在 2-20 字符之间" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码长度至少 6 位" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = createUser(username.trim(), hash);

    if (!user) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    const token = await signToken(user.id, user.username);
    const res = NextResponse.json({ user: { id: user.id, username: user.username } });
    res.headers.set("Set-Cookie", buildCookieHeader(token));
    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
