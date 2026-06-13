import prisma from "../src/lib/db/prisma.js";

const defaultModels = [
  {
    slug: "deepseek-chat",
    name: "DeepSeek V3",
    provider: "deepseek",
    category: "chat",
    inputPrice: 1.0,
    outputPrice: 2.0,
    sortOrder: 1,
  },
  {
    slug: "deepseek-reasoner",
    name: "DeepSeek R1",
    provider: "deepseek",
    category: "chat",
    inputPrice: 2.0,
    outputPrice: 8.0,
    sortOrder: 2,
  },
  {
    slug: "qwen-turbo-latest",
    name: "通义千问 Turbo",
    provider: "tongyi",
    category: "chat",
    inputPrice: 0.3,
    outputPrice: 0.6,
    sortOrder: 3,
  },
  {
    slug: "qwen-max",
    name: "通义千问 Max",
    provider: "tongyi",
    category: "chat",
    inputPrice: 2.0,
    outputPrice: 6.0,
    sortOrder: 4,
  },
  {
    slug: "glm-4-flash",
    name: "智谱 GLM-4 Flash",
    provider: "zhipu",
    category: "chat",
    inputPrice: 0.0,
    outputPrice: 0.0,
    sortOrder: 5,
  },
  {
    slug: "glm-4-plus",
    name: "智谱 GLM-4 Plus",
    provider: "zhipu",
    category: "chat",
    inputPrice: 1.0,
    outputPrice: 2.0,
    sortOrder: 6,
  },
  {
    slug: "moonshot-v1-8k",
    name: "Kimi 8K",
    provider: "kimi",
    category: "chat",
    inputPrice: 1.0,
    outputPrice: 2.0,
    sortOrder: 7,
  },
  {
    slug: "moonshot-v1-128k",
    name: "Kimi 128K",
    provider: "kimi",
    category: "chat",
    inputPrice: 2.0,
    outputPrice: 4.0,
    sortOrder: 8,
  },
  {
    slug: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    category: "chat",
    inputPrice: 15.0,
    outputPrice: 60.0,
    sortOrder: 9,
  },
  {
    slug: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    category: "chat",
    inputPrice: 2.5,
    outputPrice: 10.0,
    sortOrder: 10,
  },
  {
    slug: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "claude",
    category: "chat",
    inputPrice: 15.0,
    outputPrice: 75.0,
    sortOrder: 11,
  },
  {
    slug: "claude-haiku-3-5",
    name: "Claude Haiku 3.5",
    provider: "claude",
    category: "chat",
    inputPrice: 5.0,
    outputPrice: 25.0,
    sortOrder: 12,
  },
];

async function seed() {
  console.log("Seeding database...");

  for (const model of defaultModels) {
    const existing = await prisma.model.findUnique({ where: { slug: model.slug } });
    if (!existing) {
      await prisma.model.create({ data: model });
      console.log(`  Created model: ${model.name}`);
    } else {
      console.log(`  Skipped (exists): ${model.name}`);
    }
  }

  console.log("Seed complete!");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
