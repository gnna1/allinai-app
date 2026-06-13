"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider.js";

const PLANS = [
  {
    name: "免费",
    price: 0,
    tokens: "每天 10 次",
    features: ["DeepSeek 基础模型", "普通对话速度", "无历史记录保留"],
    popular: false,
  },
  {
    name: "基础",
    price: 19.9,
    period: "月",
    tokens: "200万 tokens",
    features: ["全模型可用", "智能派发引擎", "7天对话历史", "正常速度"],
    popular: false,
  },
  {
    name: "专业",
    price: 69.9,
    period: "月",
    tokens: "1000万 tokens",
    features: ["全模型可用", "智能派发引擎", "无限历史保留", "优先速度", "文件上传"],
    popular: true,
  },
];

const RECHARGE_AMOUNTS = [10, 30, 50, 100, 200];

export default function BillingPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState(null);
  const [payType, setPayType] = useState("alipay");
  const [amount, setAmount] = useState(30);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [configOk, setConfigOk] = useState(true);

  useEffect(() => {
    fetch("/api/user").then(r => r.json()).then(d => {
      if (d.error) return router.push("/");
      setUser(d.user);
    });
    // 检查支付是否已配置
    fetch("/api/payment/create", { method: "POST", body: JSON.stringify({ amount: 1, type: "alipay" }) })
      .then(r => r.json()).then(d => {
        if (d.error === "支付系统暂未开放") setConfigOk(false);
      }).catch(() => {});
  }, []);

  async function startPayment(amt) {
    setAmount(amt);
    setLoading(true);
    setError("");
    setQrCode(null);
    setPaid(false);

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, type: payType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建支付失败");
      setQrCode(data.qrcode || data.payurl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <div className="h-screen flex items-center justify-center text-gray-400">加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d14]">
      <div className="h-12 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0d0d14] flex items-center px-4">
        <button onClick={() => router.push("/chat")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 text-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          返回
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{user.email}</span>
          <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-medium">
            ¥{user.balance?.toFixed(2) || "0.00"}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">套餐与充值</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">选择适合你的套餐，或按量充值</p>

        {!configOk && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              支付系统配置中，暂时通过联系管理员手动充值。
            </p>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PLANS.map(plan => (
            <div key={plan.name} className={`relative bg-white dark:bg-gray-800/60 rounded-xl border transition-all p-5 ${
              plan.popular ? "border-brand-600 dark:border-brand-500 shadow-md" : "border-gray-200 dark:border-gray-700"
            }`}>
              {plan.popular && <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-brand-600 text-white text-xs rounded-full font-medium">推荐</span>}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{plan.name}</h3>
              <div className="mb-3">
                {plan.price > 0 ? (
                  <><span className="text-2xl font-bold text-gray-900 dark:text-gray-100">¥{plan.price}</span><span className="text-sm text-gray-400">/{plan.period}</span></>
                ) : (
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">免费</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">含 {plan.tokens}</p>
              <ul className="space-y-1.5 mb-5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0 text-green-500"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.price > 0 && (
                <button onClick={() => { setAmount(plan.price); document.getElementById("pay-section")?.scrollIntoView({behavior: "smooth"}); }}
                  className="w-full py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-800 rounded-lg transition-colors">
                  {configOk ? "立即购买" : "联系购买"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Recharge section */}
        <div id="pay-section" className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">按量充值</h2>

          {/* Payment method */}
          <div className="flex gap-3 mb-4">
            <button onClick={() => setPayType("alipay")} className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
              payType === "alipay" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "border-gray-200 dark:border-gray-700 text-gray-500"
            }`}>
              支付宝
            </button>
            <button onClick={() => setPayType("wxpay")} className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
              payType === "wxpay" ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" : "border-gray-200 dark:border-gray-700 text-gray-500"
            }`}>
              微信支付
            </button>
          </div>

          {/* Amount */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {RECHARGE_AMOUNTS.map(amt => (
              <button key={amt} onClick={() => startPayment(amt)}
                className={`py-2 rounded-lg border text-sm transition-colors ${
                  amount === amt ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}>
                ¥{amt}
              </button>
            ))}
          </div>

          {/* QR Code */}
          {loading && (
            <div className="text-center py-8 text-sm text-gray-400">正在生成支付二维码...</div>
          )}

          {error && (
            <div className="text-center py-4">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              {error.includes("未配置") && (
                <p className="text-xs text-gray-400">请联系管理员开通支付，或通过微信/支付宝转账后由管理员手动充值</p>
              )}
            </div>
          )}

          {qrCode && !loading && (
            <div className="text-center py-4">
              <div className="inline-block p-4 bg-white rounded-xl border border-gray-200 mb-3">
                <img src={qrCode} alt="支付二维码" className="w-48 h-48 mx-auto" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                请使用{payType === "alipay" ? "支付宝" : "微信"}扫码支付
              </p>
              <p className="text-xs text-gray-400">
                金额: ¥{amount} · 支付完成后自动到账
              </p>
              {paid && (
                <div className="mt-3 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm">
                  支付成功！余额已更新
                </div>
              )}
            </div>
          )}

          {!qrCode && !loading && !error && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">选择一个金额开始充值</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
