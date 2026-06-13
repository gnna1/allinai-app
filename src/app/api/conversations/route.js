import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma.js";
import { getAuthFromCookies } from "@/lib/auth.js";

export async function GET(request) {
  const user = getAuthFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json({ conversations });
}

export async function POST(request) {
  const user = getAuthFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { title } = await request.json();
  const conversation = await prisma.conversation.create({
    data: {
      title: title || "新对话",
      userId: user.id,
    },
  });

  return NextResponse.json({ conversation });
}
