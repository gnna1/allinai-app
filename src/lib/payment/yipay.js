/**
 * 易支付 (YiPay) 对接模块
 *
 * 1. 用户到 yi-zhifu.com 注册 → 拿到 pid + key
 * 2. 填到 .env 里
 * 3. 自动生效
 */

import crypto from "crypto";

const config = {
  apiUrl: "https://zpayz.cn/mapi.php",
  pid: process.env.YIPAY_PID || "",
  key: process.env.YIPAY_KEY || "",
  notifyUrl: process.env.YIPAY_NOTIFY_URL || "",
};

export function isConfigured() {
  return !!(config.pid && config.key);
}

/**
 * 生成 MD5 签名
 * 参数按 ASCII 升序排列，拼接 key 后 MD5
 */
export function sign(params, key) {
  const keys = Object.keys(params).filter(k => k !== "sign" && k !== "sign_type" && params[k] !== "" && params[k] !== null);
  keys.sort();
  const str = keys.map(k => `${k}=${params[k]}`).join("&") + key;
  return crypto.createHash("md5").update(str).digest("hex");
}

/**
 * 验证回调签名
 */
export function verifySign(params, key) {
  const signParam = params.sign;
  const calculated = sign(params, key);
  return calculated === signParam;
}

/**
 * 创建支付订单
 * @param {number} amount - 金额（元）
 * @param {string} orderId - 订单号
 * @param {string} type - alipay | wxpay
 * @param {string} userId - 用户ID（附带到param字段）
 * @returns {Promise<{qrcode: string, payurl: string}>}
 */
export async function createOrder(amount, orderId, type, userId) {
  if (!config.pid || !config.key) {
    throw new Error("支付未配置，请在 .env 中设置 YIPAY_PID 和 YIPAY_KEY");
  }

  const params = {
    pid: config.pid,
    type,
    out_trade_no: orderId,
    notify_url: config.notifyUrl,
    name: "AllInAI 充值",
    money: amount.toFixed(2),
    param: userId,
    clientip: "0.0.0.0",
    sign_type: "MD5",
  };

  params.sign = sign(params, config.key);

  const formData = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => formData.append(k, v));

  const res = await fetch(config.apiUrl, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.code !== 1) {
    throw new Error(`易支付错误: ${data.msg || "未知错误"}`);
  }

  return {
    qrcode: data.qrcode || "",
    payurl: data.payurl || "",
    img: data.img || "",
    orderId: data.trade_no || orderId,
  };
}
