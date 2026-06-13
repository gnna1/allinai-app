import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma.js";
import { getAuthFromCookies } from "@/lib/auth.js";

export async function GET(request) {
  const user = getAuthFromCookies(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, balance: true, createdAt: true, _count: { select: { conversations: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
