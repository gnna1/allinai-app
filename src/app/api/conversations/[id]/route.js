import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma.js";
import { getAuthFromCookies } from "@/lib/auth.js";

export async function GET(request, { params }) {
  const user = getAuthFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function DELETE(request, { params }) {
  const user = getAuthFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  await prisma.conversation.deleteMany({
    where: { id: params.id, userId: user.id },
  });

  return NextResponse.json({ success: true });
}
