import prisma from "@/lib/db/prisma.js";
import { getAuthFromCookies } from "@/lib/auth.js";
import { chatStream } from "@/lib/models/index.js";
import { quickRoute, MODEL_CAPABILITIES } from "@/lib/agents/router.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = getAuthFromCookies(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { conversationId, message, modelSlug } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "消息不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      });
      if (!conversation) {
        return new Response(JSON.stringify({ error: "对话不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      // Auto-generate title from first message
      const title = message.length > 30 ? message.slice(0, 30) + "..." : message;
      conversation = await prisma.conversation.create({
        data: { title, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      });
    }

    // Get available models from DB
    const dbModels = await prisma.model.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    });

    const availableSlugs = dbModels.map((m) => m.slug);

    // Route: if user selected a model, use it; otherwise auto-dispatch
    let selectedModelSlug = modelSlug;
    let routingInfo = null;

    if (!selectedModelSlug) {
      const route = quickRoute(message, availableSlugs);
      selectedModelSlug = route.model;
      routingInfo = route;
    }

    // Find model config
    const modelConfig = dbModels.find((m) => m.slug === selectedModelSlug);
    if (!modelConfig) {
      return new Response(JSON.stringify({ error: "模型不可用" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
        modelId: modelConfig.id,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Build messages array for API call
    const historyMessages = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    historyMessages.push({ role: "user", content: message });

    // Create AI message placeholder in DB
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: "",
        modelId: modelConfig.id,
      },
    });

    // Setup SSE stream
    const encoder = new TextEncoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send routing info first
          if (routingInfo) {
            const routeMeta = JSON.stringify({
              type: "route",
              category: routingInfo.category,
              model: selectedModelSlug,
              modelName: modelConfig.name,
            });
            controller.enqueue(encoder.encode(`data: ${routeMeta}\n\n`));
          }

          // Stream AI response
          const aiStream = chatStream(
            {
              provider: modelConfig.provider,
              apiKey: modelConfig.apiKey || undefined,
              apiBaseUrl: modelConfig.apiBaseUrl || undefined,
            },
            historyMessages,
            { model: selectedModelSlug }
          );

          for await (const chunk of aiStream) {
            if (chunk.content) {
              fullContent += chunk.content;
              const payload = JSON.stringify({
                type: "chunk",
                content: chunk.content,
                messageId: aiMessage.id,
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
            if (chunk.done) break;
          }

          // Update AI message in DB
          await prisma.message.update({
            where: { id: aiMessage.id },
            data: { content: fullContent },
          });

          // Send done signal
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", messageId: aiMessage.id, conversationId: conversation.id })}\n\n`
            )
          );
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(JSON.stringify({ error: "服务器错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
