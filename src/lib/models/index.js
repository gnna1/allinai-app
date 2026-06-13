/**
 * Model Adapter - Unified interface for all AI model providers.
 *
 * Each adapter implements:
 * - chat(messages, options) -> AsyncIterable<{content: string, done: boolean}>
 */

import { DeepSeekAdapter } from "./deepseek.js";
import { TongyiAdapter } from "./tongyi.js";
import { ZhipuAdapter } from "./zhipu.js";
import { DoubaoAdapter } from "./doubao.js";
import { KimiAdapter } from "./kimi.js";
import { OpenAIAdapter } from "./openai.js";
import { ClaudeAdapter } from "./claude.js";

const adapters = {
  deepseek: new DeepSeekAdapter(),
  tongyi: new TongyiAdapter(),
  zhipu: new ZhipuAdapter(),
  doubao: new DoubaoAdapter(),
  kimi: new KimiAdapter(),
  openai: new OpenAIAdapter(),
  claude: new ClaudeAdapter(),
};

export function getAdapter(provider) {
  const adapter = adapters[provider];
  if (!adapter) throw new Error(`Unknown provider: ${provider}`);
  return adapter;
}

export async function* chatStream(modelConfig, messages, options = {}) {
  const adapter = getAdapter(modelConfig.provider);
  const stream = await adapter.chat(modelConfig, messages, options);
  for await (const chunk of stream) {
    yield chunk;
  }
}
