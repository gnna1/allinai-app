/**
 * Claude API Adapter (Anthropic)
 * Uses Anthropic's native API format, converts from OpenAI format internally
 */
export class ClaudeAdapter {
  async chat(modelConfig, messages, options = {}) {
    const apiKey = modelConfig.apiKey || process.env.CLAUDE_API_KEY;
    const baseUrl = modelConfig.apiBaseUrl || process.env.CLAUDE_API_BASE || "https://api.anthropic.com/v1";
    const model = options.model || "claude-sonnet-4-20250514";

    // Convert OpenAI messages to Anthropic format
    const systemMsg = messages.find(m => m.role === "system");
    const nonSystemMessages = messages.filter(m => m.role !== "system");

    const anthropicMessages = nonSystemMessages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemMsg?.content || "",
        messages: anthropicMessages,
        stream: true,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    return this._parseStream(response.body);
  }

  async *_parseStream(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          yield { content: "", done: true };
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield { content: parsed.delta.text, done: false };
          }
          if (parsed.type === "message_stop") {
            yield { content: "", done: true };
            return;
          }
        } catch {
          // SSE event parsing for Anthropic's native SSE format
          if (trimmed.startsWith("event:") || trimmed.startsWith("data:") || trimmed.startsWith("id:")) {
            continue;
          }
        }
      }
    }
    yield { content: "", done: true };
  }
}
