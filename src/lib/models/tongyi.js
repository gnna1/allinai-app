/**
 * Tongyi (通义千问) API Adapter
 */
export class TongyiAdapter {
  async chat(modelConfig, messages, options = {}) {
    const apiKey = modelConfig.apiKey || process.env.TONGYI_API_KEY;
    const baseUrl = modelConfig.apiBaseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    const model = options.model || "qwen-turbo-latest";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Tongyi API error: ${response.status} ${err}`);
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
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          yield { content: "", done: true };
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content) yield { content, done: false };
        } catch {
          // skip
        }
      }
    }
    yield { content: "", done: true };
  }
}
