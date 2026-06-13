"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider.js";
import MarkdownMessage from "@/components/MarkdownMessage.js";

// ---------- helpers ----------
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "昨天";
  const days = Math.floor(diff / 86400000);
  return days < 7 ? `${days}天前` : d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

const MODEL_INFO = {
  "deepseek-chat": { short: "DeepSeek", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  "deepseek-reasoner": { short: "DeepSeek R1", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  "gpt-4o": { short: "GPT-4o", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  "gpt-4o-mini": { short: "GPT-4o Mini", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  "claude-sonnet-4-20250514": { short: "Claude", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  "qwen-turbo-latest": { short: "通义", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  "glm-4-flash": { short: "智谱", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  "moonshot-v1-8k": { short: "Kimi", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
};

// ---------- main ----------
export default function ChatPage() {
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConv, setCurrentConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");

  // load user + conversations
  useEffect(() => {
    fetch("/api/user").then(r => r.json()).then(d => {
      if (d.error) return router.push("/");
      setUser(d.user);
    });
    fetch("/api/models").then(r => r.json()).then(d => {
      setModels(d.models || []);
      if (d.models?.length > 0) setSelectedModel(d.models[0].slug);
    });
    loadConversations();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    const d = await res.json();
    setConversations(d.conversations || []);
  }

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function newConversation() {
    setCurrentConv(null);
    setMessages([]);
    setInput("");
    setError("");
    inputRef.current?.focus();
  }

  async function openConversation(conv) {
    setCurrentConv(conv);
    setError("");
    const res = await fetch(`/api/conversations/${conv.id}`);
    const d = await res.json();
    setMessages(d.conversation?.messages || []);
  }

  async function deleteConversation(id, e) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (currentConv?.id === id) { setCurrentConv(null); setMessages([]); }
    loadConversations();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setStreaming(true);
    setError("");

    const userMsg = { role: "user", content: text, _id: "u-" + Date.now() };
    const placeholder = { role: "assistant", content: "", _id: "a-" + Date.now(), streaming: true };
    setMessages(prev => [...prev, userMsg, placeholder]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConv?.id,
          message: text,
          modelSlug: autoMode ? null : selectedModel,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `请求失败 (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", fullContent = "", newConvId = currentConv?.id;
      let routeInfo = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const t = line.trim();
          if (!t || !t.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(t.slice(6));
            if (p.type === "route") routeInfo = p;
            else if (p.type === "chunk") {
              fullContent += p.content;
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: fullContent, routing: routeInfo } : m
              ));
            } else if (p.type === "done") {
              newConvId = p.conversationId;
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: fullContent, streaming: false, routing: routeInfo } : m
              ));
            } else if (p.type === "error") throw new Error(p.error);
          } catch (e) {
            if (e.message.startsWith("请求") || e.message.startsWith("DeepSeek")) throw e;
          }
        }
      }

      if (newConvId && newConvId !== currentConv?.id) setCurrentConv({ id: newConvId });
      loadConversations();
    } catch (err) {
      setError(err.message);
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: "", streaming: false, error: err.message } : m
      ));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white dark:bg-[#0d0d14]">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-200 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#12121a] flex flex-col overflow-hidden`}>
        <div className="h-13 flex items-center px-4 border-b border-gray-100 dark:border-gray-800 gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">AllInAI</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-300 dark:text-gray-600 hover:text-gray-500">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="p-3">
          <button onClick={newConversation} className="w-full py-2 px-3 bg-brand-600 hover:bg-brand-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            新对话
          </button>
        </div>
        <div className="px-3 mb-2">
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-600/30"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {filteredConversations.length === 0 && searchQuery && (
            <p className="text-xs text-gray-400 text-center py-4">无匹配结果</p>
          )}
          {filteredConversations.map(conv => (
            <div key={conv.id} onClick={() => openConversation(conv)}
              className={`px-3 py-2.5 rounded-lg cursor-pointer text-sm mb-0.5 group transition-colors ${
                currentConv?.id === conv.id
                  ? "bg-white dark:bg-gray-800 shadow-sm"
                  : "hover:bg-white/50 dark:hover:bg-gray-800/50"
              }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-gray-700 dark:text-gray-300 text-xs flex-1">{conv.title}</span>
                <button onClick={e => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3v6.5a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                </button>
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{formatDate(conv.updatedAt)}</p>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-medium">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="truncate">{user?.email || ""}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">余额</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">¥{user?.balance?.toFixed(2) || "0.00"}</span>
          </div>
          <button
            onClick={() => window.location.href = "/billing"}
            className="w-full py-1.5 text-xs text-center text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          >
            充值 / 套餐
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-3 bg-white dark:bg-[#0d0d14] flex-shrink-0">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          )}

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={autoMode} onChange={() => setAutoMode(!autoMode)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-600/20"/>
              <span className="text-xs text-gray-500 dark:text-gray-400">智能派发</span>
            </label>
            {!autoMode && (
              <select value={selectedModel || ""} onChange={e => setSelectedModel(e.target.value)}
                className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
                {models.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}
              </select>
            )}
          </div>

          <div className="flex-1" />

          <button onClick={toggleTheme} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1" title="切换主题">
            {theme === "light" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41M8 5a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 10.5A6 6 0 015.5 2.5 6 6 0 1013.5 10.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center pt-20">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-5">
                  <span className="text-brand-600 dark:text-brand-400 font-bold text-2xl">A</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">AllInAI</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-8">
                  输入问题，智能引擎自动选择最合适的AI模型回答
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {[
                    "分析这段代码有什么bug",
                    "用简单的话解释量子纠缠",
                    "把这段话翻译成地道的英文",
                    "帮我写一封商务开发邮件",
                  ].map((s, i) => (
                    <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left leading-relaxed">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={msg._id || i} className={`flex gap-3 msg-fade-in ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}>
                      {msg.role === "user" ? "U" : "A"}
                    </div>
                    <div className={`max-w-[80%] md:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      {/* routing badge */}
                      {msg.routing && (
                        <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                          <span className="text-xs text-gray-400 dark:text-gray-500">智能派发</span>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-300"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${MODEL_INFO[msg.routing.model]?.color || "bg-gray-100 text-gray-700"}`}>
                            {MODEL_INFO[msg.routing.model]?.short || msg.routing.modelName || msg.routing.model}
                          </span>
                          {msg.routing.category && (
                            <span className="text-xs text-gray-300 dark:text-gray-600">{msg.routing.category}</span>
                          )}
                        </div>
                      )}

                      {/* content */}
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-brand-600 text-white rounded-br-sm"
                          : "bg-gray-50 dark:bg-gray-800/60 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700/50"
                      }`}>
                        {msg.streaming && !msg.content ? (
                          <div className="flex items-center gap-1 py-1">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                          </div>
                        ) : msg.role === "user" ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <MarkdownMessage content={msg.content} />
                        )}
                        {msg.streaming && msg.content && (
                          <span className="inline-block w-1.5 h-4 bg-brand-600 dark:bg-brand-400 ml-0.5 animate-pulse rounded-sm" />
                        )}
                        {msg.error && (
                          <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
                            请求失败: {msg.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-white dark:bg-[#0d0d14]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand-600/20 focus-within:border-brand-600 dark:focus-within:border-brand-500 transition-all">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="输入问题，按 Enter 发送..."
                rows={1}
                className="flex-1 bg-transparent resize-none text-sm outline-none py-1 max-h-32 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed"
                disabled={streaming}
              />
              <button onClick={sendMessage} disabled={!input.trim() || streaming}
                className="w-8 h-8 rounded-lg bg-brand-600 hover:bg-brand-800 disabled:opacity-30 text-white flex items-center justify-center transition-colors flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8l12-5-4 10-3-3-3-3 8-2-8 2v2l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-1.5 text-center">{error}</p>
            )}
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1.5 text-center">
              AllInAI · 智能派发 · 支持 DeepSeek、GPT-4o、Claude、通义千问、智谱、Kimi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
