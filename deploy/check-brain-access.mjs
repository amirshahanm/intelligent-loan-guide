import { readFile } from "node:fs/promises";
const contents = await readFile("/opt/tashilradar/secrets/openai.env", "utf8");
const line = contents.split(/\r?\n/).find((value) => value.startsWith("OPENAI_API_KEY="));
const key = line?.slice("OPENAI_API_KEY=".length).trim().replace(/^(['"])(.*)\1$/, "$2");
if (!key) throw new Error("missing_server_key");
const response = await fetch("https://api.openai.com/v1/models/gpt-5.4", { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
console.log(JSON.stringify({ modelAccessHttp: response.status }));
if (response.ok && process.argv.includes("--smoke")) {
  const answer = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: "gpt-5.4", store: false, max_output_tokens: 600, instructions: "فارسی پاسخ بده. کوتاه و بدون ادعای تایید وام یا قیمت روز. حداکثر دو سوال مرتبط بپرس.", input: "نمونه آزمایشی غیرشخصی: کسی 300 میلیون تومان سرمایه دارد و می‌خواهد خودرو بخرد. برای روشن‌کردن نیاز چه می‌پرسی؟" }), signal: AbortSignal.timeout(45000) });
  const body = await answer.json();
  console.log(JSON.stringify({ inferenceHttp: answer.status, status: body.status ?? null, errorCode: body.error?.code ?? null, hasAnswer: body.output?.some((item) => item.type === "message" && item.content?.some((block) => block.type === "output_text" && Boolean(block.text))) ?? false }));
}
