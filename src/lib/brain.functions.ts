import { createServerFn } from "@tanstack/react-start";
import { brainInputSchema } from "./brain-policy";

export const getBrainAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const { brainEnabled } = await import("./brain.server");
  return { enabled: brainEnabled(process.env) };
});

export const converseWithBrain = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => brainInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { askBrain, brainEnabled } = await import("./brain.server");
    if (!brainEnabled(process.env)) return askBrain(data, process.env);
    const { consumeRequestLimit } = await import("./request-guard.server");
    await consumeRequestLimit({ scope: "brain_conversation", limit: 20, windowSeconds: 3600 });
    // Global cost ceiling shared by all instances, in addition to per-client limits.
    if (process.env.TASHILRADAR_BACKEND !== "postgres")
      return { status: "unavailable" as const, text: "محافظ مصرف سرویس هنوز آماده نیست." };
    const { consumePostgresLimit } = await import("./postgres.server");
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("tashilradar-brain-global-v1"),
    );
    const key = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
    const budget = await consumePostgresLimit(key, "brain_global", 200, 86400);
    if (!budget.allowed)
      return {
        status: "unavailable" as const,
        text: "ظرفیت مشاورهٔ AI امروز تکمیل شده؛ مسیر بررسی قبلی در دسترس است.",
      };
    return askBrain(data, process.env);
  });
