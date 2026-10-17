// Synthetic scenarios only. Run with the bundled brain.server module on an
// isolated server container; inject the existing key through a protected env file.
import { askBrain } from "./brain-qa-bundle.mjs";
const observedFetch = async (...args) => {
  const response = await fetch(...args);
  if (!String(args[0]).startsWith("https://api.openai.com/")) return response;
  const body = await response.clone().json();
  console.log(
    JSON.stringify({
      upstreamHttp: response.status,
      output: body.output?.map((item) => ({
        type: item.type,
        status: item.status,
        actionType: item.action?.type,
        consulted: item.action?.sources?.map((source) => source.url),
        citations: item.content
          ?.flatMap((block) => block.annotations ?? [])
          .map((source) => source.url),
      })),
    }),
  );
  return response;
};
const scenarios = [
  {
    name: "vehicle-capital",
    search: false,
    text: "نمونه آزمایشی: 300 میلیون تومان سرمایه موجود دارم و قصد خرید ماشین دارم. هنوز قیمت هدف را تعیین نکرده‌ام.",
  },
  {
    name: "phone-research",
    search: true,
    text: "نمونه آزمایشی: برای خرید موبایل 20 میلیون تومان پیش‌پرداخت و ماهانه 3 میلیون تومان توان قسط دارم. مسیرهای خرید اقساطی را با منابع توضیح بده؛ مدل گوشی هنوز مشخص نیست.",
  },
  {
    name: "marriage-documents",
    search: false,
    text: "نمونه آزمایشی: دنبال وام ازدواج هستم. بدون فرستادن اطلاعات هویتی، چه نوع مدارکی را باید آماده کنم و قدم بعدی چیست؟",
  },
];
for (const scenario of scenarios) {
  if (process.argv[2] && process.argv[2] !== scenario.name) continue;
  const start = Date.now();
  const reply = await askBrain(
    { consent: true, search: scenario.search, messages: [{ role: "user", text: scenario.text }] },
    process.env,
    observedFetch,
  );
  console.log(JSON.stringify({ scenario: scenario.name, elapsedMs: Date.now() - start, ...reply }));
}
