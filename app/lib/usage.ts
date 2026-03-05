import { prisma } from '@/app/lib/db';

const MODEL_PRICES_PER_1K: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 }
};

type UsageStats = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export function estimateCostUsd(model: string, usage: UsageStats): number | null {
  const price = MODEL_PRICES_PER_1K[model];
  if (!price || usage.promptTokens == null || usage.completionTokens == null) return null;
  const cost = (usage.promptTokens / 1000) * price.input + (usage.completionTokens / 1000) * price.output;
  return Number(cost.toFixed(8));
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function recordUsageEvent(input: {
  userId: number;
  conversationId?: number;
  model: string;
  requestId: string;
  usage: UsageStats;
  createdAt?: Date;
}) {
  const createdAt = input.createdAt ?? new Date();
  const estimatedCostUsd = estimateCostUsd(input.model, input.usage);

  await prisma.$transaction(async (tx) => {
    await tx.usageEvent.create({
      data: {
        userId: input.userId,
        conversationId: input.conversationId,
        model: input.model,
        inputTokens: input.usage.promptTokens,
        outputTokens: input.usage.completionTokens,
        totalTokens: input.usage.totalTokens,
        estimatedCostUsd,
        requestId: input.requestId,
        createdAt
      }
    });

    await tx.dailyUsageRollup.upsert({
      where: { userId_date: { userId: input.userId, date: toDayKey(createdAt) } },
      create: {
        userId: input.userId,
        date: toDayKey(createdAt),
        totalRequests: 1,
        totalTokens: input.usage.totalTokens ?? 0,
        estimatedCostUsd: estimatedCostUsd ?? 0
      },
      update: {
        totalRequests: { increment: 1 },
        totalTokens: { increment: input.usage.totalTokens ?? 0 },
        estimatedCostUsd: { increment: estimatedCostUsd ?? 0 }
      }
    });
  });
}
