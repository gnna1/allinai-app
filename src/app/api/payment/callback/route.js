import prisma from "@/lib/db/prisma.js";
import { verifySign } from "@/lib/payment/yipay.js";

/**
 * 易支付异步通知回调
 *
 * 易支付在用户付款后会 GET 请求这个地址
 * 我们需要：
 * 1. 验证签名
 * 2. 验证金额
 * 3. 给用户加余额
 * 4. 返回 "success"
 */
export async function GET(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  try {
    // 获取商户 key
    const key = process.env.YIPAY_KEY;
    if (!key) {
      console.error("YIPAY_KEY 未配置");
      return new Response("fail");
    }

    // 验证签名
    if (!verifySign(params, key)) {
      console.error("支付回调签名验证失败", params);
      return new Response("fail");
    }

    // 检查支付状态
    if (params.trade_status !== "TRADE_SUCCESS") {
      return new Response("success"); // 未支付成功，不处理
    }

    const orderId = params.out_trade_no;
    const userId = params.param; // 创建订单时传入的 userId
    const amount = parseFloat(params.money);

    if (!userId || !amount) {
      console.error("支付回调缺少参数", params);
      return new Response("fail");
    }

    // 检查是否已经处理过（幂等性）
    const existing = await prisma.usageRecord.findFirst({
      where: { type: "payment_callback", modelSlug: orderId },
    });
    if (existing) {
      return new Response("success"); // 已处理过，直接返回成功
    }

    // 给用户加余额
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } },
    });

    // 记录充值记录
    await prisma.usageRecord.create({
      data: {
        userId,
        cost: -amount,
        type: "payment_callback",
        modelSlug: orderId,
      },
    });

    console.log(`充值成功: 用户 ${userId}, 金额 ¥${amount}, 订单 ${orderId}`);
    return new Response("success");
  } catch (err) {
    console.error("支付回调处理失败:", err);
    return new Response("fail");
  }
}
