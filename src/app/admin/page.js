"use client";

import { useState, useEffect } from "react";

export default function AdminPage() {
  const [models, setModels] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("models");
  const [topupUserId, setTopupUserId] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [topupStatus, setTopupStatus] = useState("");

  function loadData() {
    fetch("/api/admin/models").then(r => r.json()).then(d => setModels(d.models || []));
    fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users || []));
  }

  useEffect(() => { loadData(); }, []);

  async function handleTopup(e) {
    e.preventDefault();
    setTopupStatus("充值中...");
    try {
      const res = await fetch("/api/admin/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: topupUserId, amount: parseFloat(topupAmount), note: topupNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopupStatus("充值成功！");
      setTopupAmount("");
      setTopupNote("");
      loadData();
      setTimeout(() => setTopupStatus(""), 3000);
    } catch (err) {
      setTopupStatus("失败: " + err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d14] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">AllInAI 管理后台</h1>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          {["models", "users", "topup"].map(t => (
            <button key={t}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? "text-brand-600 border-brand-600" : "text-gray-400 border-transparent"
              }`}
              onClick={() => setTab(t)}>
              {t === "models" ? "模型管理" : t === "users" ? "用户管理" : "手动充值"}
            </button>
          ))}
        </div>

        {/* 模型管理 */}
        {tab === "models" && (
          <div className="space-y-2">
            {models.map(m => (
              <div key={m.id} className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.provider} · {m.slug} · 输入 ¥{m.inputPrice}/M · 输出 ¥{m.outputPrice}/M</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${m.enabled ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {m.enabled ? "启用" : "禁用"}
                  </span>
                  <span className="text-xs text-gray-400">排序: {m.sortOrder}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 用户管理 */}
        {tab === "users" && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.email}</p>
                  <p className="text-xs text-gray-400">
                    {u.name || "未设置"} · 注册于 {new Date(u.createdAt).toLocaleDateString("zh-CN")} · {u._count?.conversations || 0} 个对话
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">¥{u.balance?.toFixed(2) || "0.00"}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                    {u.role === "admin" ? "管理员" : "用户"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 手动充值 */}
        {tab === "topup" && (
          <div className="max-w-lg">
            <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">手动为用户充值</h2>
              <p className="text-xs text-gray-400 mb-4">用户转账后，在这里给对应用户加余额</p>

              <form onSubmit={handleTopup} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">选择用户</label>
                  <select
                    value={topupUserId}
                    onChange={e => setTopupUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-600/30"
                    required
                  >
                    <option value="">请选择...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.email}（余额: ¥{u.balance?.toFixed(2) || "0.00"}）</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">充值金额（元）</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={topupAmount}
                    onChange={e => setTopupAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-600/30"
                    placeholder="10.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">备注（如：用户微信转账）</label>
                  <input
                    type="text"
                    value={topupNote}
                    onChange={e => setTopupNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-600/30"
                    placeholder="支付宝转账 2026-06-13"
                  />
                </div>

                <button type="submit" className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors">
                  确认充值
                </button>

                {topupStatus && (
                  <p className={`text-sm text-center ${topupStatus.includes("成功") ? "text-green-600" : "text-red-500"}`}>
                    {topupStatus}
                  </p>
                )}
              </form>
            </div>

            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>充值流程：</strong><br />
                1. 用户在充值页面联系你 → 2. 用户转账到你的微信/支付宝 → 3. 你来这里输入金额确认 → 4. 用户余额自动增加
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
