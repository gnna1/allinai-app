import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma.js";
import { getAuthFromCookies } from "@/lib/auth.js";

export async function GET(request) {
  const user = getAuthFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const models = await prisma.model.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ models });
}
