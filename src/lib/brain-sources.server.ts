import type { BrainSource } from "./brain-policy";

// Fixed, reviewed public pages. Never accept a URL from conversation or model.
const goodsPages = [
  { title: "دیجی‌پی — وام خرید کالا", url: "https://www.mydigipay.com/credit/c-credit/" },
  { title: "دیجی‌پی — خرید اعتباری", url: "https://www.mydigipay.com/bnpl/c-bnpl/" },
];
export async function directResearch(topic: string, transport: typeof fetch = fetch) {
  if (!/موبایل|کالا/.test(topic)) return null;
  const pages = await Promise.all(
    goodsPages.map(async (source) => {
      try {
        const response = await transport(source.url, {
          redirect: "error",
          signal: AbortSignal.timeout(10000),
          headers: { accept: "text/html" },
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("text/html"))
          return null;
        const reader = response.body?.getReader();
        if (!reader) return null;
        const decoder = new TextDecoder();
        let html = "",
          bytes = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (bytes > 1_000_000) {
              await reader.cancel();
              return null;
            }
            html += decoder.decode(chunk.value, { stream: true });
          }
          html += decoder.decode();
        } finally {
          reader.releaseLock();
        }
        // Text only, not HTML rendering. Scripts/styles are not evidence.
        const text = html
          .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
          .replace(/<!--[\s\S]*?-->/g, " ")
          .replace(/<[^>]*>/g, " ")
          .replace(/&(?:nbsp|amp|quot|lt|gt);/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length < 200 || !/اعتبار|اقساط|تسهیلات/.test(text)) return null;
        return { source, text: text.slice(0, 10000) };
      } catch {
        return null;
      }
    }),
  );
  const valid = pages.filter((page) => page !== null);
  if (!valid.length) return null;
  return {
    sources: valid.map((page): BrainSource => page.source),
    text: JSON.stringify(valid.map((page) => ({ url: page.source.url, excerpt: page.text }))),
  };
}
