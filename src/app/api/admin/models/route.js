import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma.js";
import { getAuthFromCookies } from "@/lib/auth.js";

export async function GET(request) {
  const user = getAuthFromCookies(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const models = await prisma.model.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ models });
}

export async function PUT(request) {
  const user = getAuthFromCookies(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { id, ...data } = await request.json();
  const model = await prisma.model.update({ where: { id }, data });
  return NextResponse.json({ model });
}
