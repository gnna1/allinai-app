"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, action: isLogin ? "login" : "register" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      router.push("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-sm mb-4">
          AI All in One
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
          AllInAI
        </h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto">
          无需海外手机号，一个账号使用所有顶尖 AI 模型。
          智能派发引擎自动为你选择最合适的模型。
        </p>
      </div>

      {/* Model badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {["DeepSeek V3", "GPT-4o", "Claude Sonnet", "通义千问", "智谱 GLM", "Kimi"].map((m) => (
          <span
            key={m}
            className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Auth form */}
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex mb-5">
          <button
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
              isLogin
                ? "text-brand-600 border-brand-600"
                : "text-gray-400 border-transparent"
            }`}
            onClick={() => setIsLogin(true)}
          >
            登录
          </button>
          <button
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
              !isLogin
                ? "text-brand-600 border-brand-600"
                : "text-gray-400 border-transparent"
            }`}
            onClick={() => setIsLogin(false)}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
              placeholder="至少6位"
              minLength={6}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "处理中..." : isLogin ? "登录" : "注册"}
          </button>
        </form>
      </div>

      {/* Feature highlights */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        {[
          { title: "一站通所有", desc: "DeepSeek、GPT-4o、Claude、通义、智谱、Kimi 全收录" },
          { title: "智能派发", desc: "你的任务自动匹配最强模型，不用纠结选哪个" },
          { title: "免海外手机", desc: "国内直接注册使用，无需翻墙无需海外卡" },
        ].map((f, i) => (
          <div key={i} className="text-center p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
