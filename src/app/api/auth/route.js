import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma.js";
import { hashPassword, verifyPassword, createToken } from "@/lib/auth.js";

export async function POST(request) {
  try {
    const { email, password, action } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    if (action === "register") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
      }
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, name: email.split("@")[0], passwordHash },
      });
      const token = createToken(user);
      const response = NextResponse.json({ success: true });
      response.cookies.set("token", token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
        sameSite: "lax",
      });
      return response;
    }

    if (action === "login") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
      }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
      }
      const token = createToken(user);
      const response = NextResponse.json({ success: true });
      response.cookies.set("token", token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
        sameSite: "lax",
      });
      return response;
    }

    return NextResponse.json({ error: "无效操作" }, { status: 400 });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
