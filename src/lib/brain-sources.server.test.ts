import { test } from "node:test";
import assert from "node:assert/strict";
import { directResearch } from "./brain-sources.server";
const html = `<html><script>SECRET_SCRIPT</script><style>SECRET_STYLE</style><body>${"اعتبار خرید اقساطی کالا با بررسی شرایط ارائه دهنده. ".repeat(12)}</body></html>`;
test("direct research uses only fixed public pages, bounded text and no credentials", async () => {
  const urls: string[] = [];
  const transport = (async (url, options) => {
    urls.push(String(url));
    assert.equal(options?.redirect, "error");
    assert.deepEqual(options?.headers, { accept: "text/html" });
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }) as typeof fetch;
  const result = await directResearch("خرید اقساطی موبایل", transport);
  assert.equal(result?.sources.length, 2);
  assert.doesNotMatch(result?.text ?? "", /SECRET_SCRIPT|SECRET_STYLE/);
  assert.ok(urls.every((url) => new URL(url).hostname === "www.mydigipay.com"));
  assert.equal(await directResearch("وام ازدواج", transport), null);
  assert.equal(urls.length, 2);
});
test("redirect failures, invalid content and oversized pages do not become evidence", async () => {
  for (const transport of [
    async () => {
      throw new Error("redirect");
    },
    async () => new Response("{}", { headers: { "content-type": "application/json" } }),
    async () => new Response("Forbidden", { status: 403 }),
    async () => new Response("x".repeat(1_000_001), { headers: { "content-type": "text/html" } }),
    async () =>
      new Response("<html>challenge</html>", { headers: { "content-type": "text/html" } }),
  ])
    assert.equal(await directResearch("کالا", transport as typeof fetch), null);
});
