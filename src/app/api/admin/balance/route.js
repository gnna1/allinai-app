import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma.js";
import { getAuthFromCookies } from "@/lib/auth.js";

// 管理员给用户手动充值
export async function POST(request) {
  const user = getAuthFromCookies(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { userId, amount, note } = await request.json();
  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { balance: { increment: amount } },
  });

  // 记录操作
  await prisma.usageRecord.create({
    data: {
      userId,
      cost: -amount, // 负值表示充值
      type: "manual_topup",
      modelSlug: note || "手动充值",
    },
  });

  // 更新 MEMORY.md 记录充值日志
  return NextResponse.json({ success: true });
}

// 获取所有用户信息（含余额）
export async function GET(request) {
  const user = getAuthFromCookies(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      balance: true,
      createdAt: true,
      _count: { select: { conversations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
