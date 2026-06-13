/**
 * ============================================
 * AllInAI Agent Dispatch Engine
 * ============================================
 *
 * The core differentiator: automatically analyzes
 * user tasks and routes them to the best AI model.
 *
 * Task categories:
 * - coding: code generation, debugging, architecture
 * - writing: long-form content, essays, reports
 * - creative: story writing, poetry, brainstorming
 * - analysis: data analysis, reasoning, math
 * - translation: text translation
 * - general: general Q&A
 * - long_context: long document processing
 * - vision: image analysis
 */

const MODEL_CAPABILITIES = {
  "deepseek-chat": {
    provider: "deepseek",
    strengths: ["coding", "reasoning", "analysis", "general"],
    speed: "fast",
    cost: "low",
    contextWindow: 64000,
  },
  "deepseek-reasoner": {
    provider: "deepseek",
    strengths: ["coding", "reasoning", "analysis", "math"],
    speed: "medium",
    cost: "medium",
    contextWindow: 64000,
  },
  "qwen-turbo-latest": {
    provider: "tongyi",
    strengths: ["general", "writing", "translation", "analysis"],
    speed: "fast",
    cost: "low",
    contextWindow: 32000,
  },
  "qwen-max": {
    provider: "tongyi",
    strengths: ["reasoning", "analysis", "coding", "general"],
    speed: "medium",
    cost: "medium",
    contextWindow: 128000,
  },
  "glm-4-flash": {
    provider: "zhipu",
    strengths: ["general", "writing", "creative", "translation"],
    speed: "fast",
    cost: "free",
    contextWindow: 128000,
  },
  "glm-4-plus": {
    provider: "zhipu",
    strengths: ["reasoning", "analysis", "coding", "general"],
    speed: "medium",
    cost: "low",
    contextWindow: 128000,
  },
  "moonshot-v1-8k": {
    provider: "kimi",
    strengths: ["long_context", "reading", "writing", "analysis"],
    speed: "medium",
    cost: "low",
    contextWindow: 8000,
  },
  "moonshot-v1-128k": {
    provider: "kimi",
    strengths: ["long_context", "reading", "writing", "analysis"],
    speed: "medium",
    cost: "medium",
    contextWindow: 128000,
  },
  "gpt-4o": {
    provider: "openai",
    strengths: ["coding", "reasoning", "analysis", "vision", "writing", "general"],
    speed: "fast",
    cost: "high",
    contextWindow: 128000,
  },
  "gpt-4o-mini": {
    provider: "openai",
    strengths: ["general", "writing", "coding", "analysis"],
    speed: "fast",
    cost: "low",
    contextWindow: 128000,
  },
  "claude-sonnet-4-20250514": {
    provider: "claude",
    strengths: ["coding", "writing", "analysis", "reasoning", "creative"],
    speed: "fast",
    cost: "high",
    contextWindow: 200000,
  },
  "claude-haiku-3-5": {
    provider: "claude",
    strengths: ["general", "writing", "coding", "analysis"],
    speed: "very_fast",
    cost: "medium",
    contextWindow: 200000,
  },
};

/**
 * Classify a user's task into categories.
 */
export function classifyTask(userMessage) {
  const text = userMessage.toLowerCase();
  const scores = {};

  // Heuristic-based classification
  const patterns = {
    coding: [
      "code", "program", "function", "bug", "debug", "algorithm",
      "react", "python", "javascript", "sql", "api", "implement",
      "refactor", "write a function", "script", "terminal",
    ],
    writing: [
      "write", "essay", "article", "blog", "report", "document",
      "draft", "compose", "email", "letter", "content",
    ],
    creative: [
      "story", "poem", "poetry", "creative", "brainstorm", "idea",
      "imagine", "fiction", "narrative", "dialogue",
    ],
    analysis: [
      "analyze", "compare", "explain", "why", "how does",
      "reasoning", "logic", "math", "calculate", "solve",
      "evaluate", "assess", "summarize",
    ],
    translation: [
      "translate", "translation", "into english", "into chinese",
      "translate to", "convert to",
    ],
    long_context: [
      "long document", "long article", "long text", "book",
      "thesis", "paper", "lengthy",
    ],
    vision: [
      "image", "picture", "photo", "see this", "look at",
      "what's in this image",
    ],
  };

  for (const [category, keywords] of Object.entries(patterns)) {
    scores[category] = keywords.filter((kw) => text.includes(kw)).length;
  }

  // Default to general if nothing matches
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return "general";
  return sorted[0][0];
}

/**
 * Select the best model for a task category.
 * Priority: capability match > speed > cost
 */
export function selectBestModel(taskCategory, availableModels, userPreference = null) {
  // If user explicitly selected a model, use it
  if (userPreference && availableModels.includes(userPreference)) {
    return userPreference;
  }

  // Find models that have this strength
  const candidates = Object.entries(MODEL_CAPABILITIES)
    .filter(([slug]) => availableModels.includes(slug))
    .filter(([, caps]) => caps.strengths.includes(taskCategory))
    .sort((a, b) => {
      const aScore = a[1].cost === "low" ? 3 : a[1].cost === "medium" ? 2 : 1;
      const bScore = b[1].cost === "low" ? 3 : b[1].cost === "medium" ? 2 : 1;
      return bScore - aScore; // prefer lower cost
    });

  if (candidates.length > 0) {
    // Prefer fast + cheap for simple tasks, capable for complex
    if (taskCategory === "coding" || taskCategory === "analysis") {
      // For complex tasks, prefer the most capable
      candidates.sort((a, b) => {
        const costP = { high: 3, medium: 2, low: 1 };
        return (costP[b[1].cost] || 0) - (costP[a[1].cost] || 0);
      });
    }
    return candidates[0][0];
  }

  // Fallback to first available
  return availableModels[0];
}

/**
 * Build the system prompt for routing decision.
 */
export function buildRoutingSystemPrompt() {
  return `You are an intelligent task router. Your job is to analyze the user's request and determine which AI model is best suited to handle it.

Available models and their strengths:
- DeepSeek: excellent at coding, reasoning, and technical analysis
- 通义千问 (Tongyi): well-rounded, good at general knowledge and Chinese tasks
- 智谱 GLM: strong at writing, creative tasks, and Chinese understanding
- Kimi: best at handling very long documents and reading comprehension
- GPT-4o: best overall, excels at vision, coding, and complex reasoning (海外模型)
- Claude: best at coding, long-form writing, and nuanced analysis (海外模型)

Respond with a JSON object containing:
{
  "category": "coding|writing|creative|analysis|translation|general|long_context",
  "recommended_model": "model-slug",
  "reason": "brief explanation in Chinese"
}`;
}

/**
 * Quick routing without calling an LLM (faster, used for initial dispatch).
 */
export function quickRoute(userMessage, availableModels) {
  const category = classifyTask(userMessage);
  const model = selectBestModel(category, availableModels);
  return { category, model };
}

export { MODEL_CAPABILITIES };
