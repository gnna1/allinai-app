import { NextResponse } from "next/server";
import { createOrder, isConfigured } from "@/lib/payment/yipay.js";
import prisma from "@/lib/db/prisma.js";
import { getAuthFromCookies } from "@/lib/auth.js";

export async function POST(request) {
  const user = getAuthFromCookies(request);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ error: "支付系统暂未开放" }, { status: 503 });
  }

  try {
    const { amount, type } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "金额错误" }, { status: 400 });
    }
    if (!type || !["alipay", "wxpay"].includes(type)) {
      return NextResponse.json({ error: "支付方式错误" }, { status: 400 });
    }

    // 生成订单号
    const orderId = `AI${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

    // 创建支付订单
    const result = await createOrder(amount, orderId, type, user.id);

    // 记录订单到数据库
    await prisma.usageRecord.create({
      data: {
        userId: user.id,
        cost: 0,
        type: "payment_order",
        modelSlug: orderId,
      },
    });

    return NextResponse.json({
      success: true,
      orderId,
      qrcode: result.qrcode,
      payurl: result.payurl,
      img: result.img,
    });
  } catch (err) {
    console.error("Payment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
