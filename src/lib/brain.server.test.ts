import { test } from "node:test";
import assert from "node:assert/strict";
import { askBrain } from "./brain.server";
const env = {
  OPENAI_API_KEY: "test-not-a-real-secret",
  TASHILRADAR_BRAIN_ENABLED: "true",
  TASHILRADAR_BRAIN_MODEL: "test-model",
  TASHILRADAR_RESEARCH_DOMAINS: "example.com",
};
const input = {
  consent: true as const,
  search: true,
  messages: [{ role: "user" as const, text: "من 300 میلیون دارم ماشین می‌خواهم" }],
};
test("disabled and common private identifiers never reach external transport", async () => {
  const transport = (async () => {
    throw new Error("must not call");
  }) as typeof fetch;
  assert.equal((await askBrain(input, {}, transport)).status, "unavailable");
  assert.equal(
    (
      await askBrain(
        { ...input, messages: [{ role: "user", text: "09123456789" }] },
        env,
        transport,
      )
    ).status,
    "private_data",
  );
});
test("web search receives only generic topic; private conversation has no tools", async () => {
  const bodies: Record<string, unknown>[] = [];
  const transport = (async (_url, options) => {
    bodies.push(JSON.parse(String(options?.body)));
    return new Response(
      JSON.stringify({
        status: "completed",
        output: [
          {
            type: "web_search_call",
            status: "completed",
            action: { sources: [{ url: "https://example.com/conditions" }] },
          },
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "بودجهٔ خرید را مشخص کن.",
                annotations: [
                  { type: "url_citation", title: "منبع", url: "https://example.com/conditions" },
                ],
              },
            ],
          },
        ],
      }),
    );
  }) as typeof fetch;
  const reply = await askBrain(input, env, transport);
  assert.equal(reply.status, "ready");
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].store, false);
  assert.doesNotMatch(String(bodies[0].input), /300|من /);
  assert.equal(bodies[1].tools, undefined);
  assert.equal(bodies[0].tool_choice, "required");
  if (reply.status === "ready") {
    assert.equal(reply.sources.length, 1);
    assert.equal(reply.attributionRequired, true);
  }
});
test("unapproved, mixed and unexecuted research never enters private answer", async () => {
  for (const [urls, searched] of [
    [["https://t.me/loan"], true],
    [["https://example.com.evil.org/conditions"], true],
    [["https://example.com/conditions", "https://evil.org/loan"], true],
    [["https://example.com/conditions"], false],
    [["http://example.com/conditions"], true],
  ] as [string[], boolean][]) {
    const bodies: Record<string, unknown>[] = [];
    const transport = (async (_url, options) => {
      bodies.push(JSON.parse(String(options?.body)));
      return Response.json({
        status: "completed",
        output: [
          ...(searched
            ? [
                {
                  type: "web_search_call",
                  status: "completed",
                  action: { sources: urls.map((url) => ({ url })) },
                },
              ]
            : []),
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: bodies.length === 1 ? "UNTRUSTED_RESEARCH" : "راهنمای عمومی",
                annotations: urls.map((url) => ({ type: "url_citation", url })),
              },
            ],
          },
        ],
      });
    }) as typeof fetch;
    const reply = await askBrain(input, env, transport);
    assert.equal(reply.status, "ready");
    assert.doesNotMatch(String(bodies[1].instructions), /UNTRUSTED_RESEARCH/);
    if (reply.status === "ready") {
      assert.deepEqual(reply.sources, []);
      assert.equal(reply.researchedAt, null);
    }
  }
});
test("empty reviewed registry skips web cost and preserves general conversation", async () => {
  const bodies: Record<string, unknown>[] = [];
  const transport = (async (_url, options) => {
    bodies.push(JSON.parse(String(options?.body)));
    return Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: "راهنمای عمومی" }] }],
    });
  }) as typeof fetch;
  const reply = await askBrain(input, { ...env, TASHILRADAR_RESEARCH_DOMAINS: "" }, transport);
  assert.equal(reply.status, "ready");
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].tools, undefined);
});
test("upstream errors never leak credentials, response bodies or fabricated answers", async () => {
  const transport = (async () =>
    new Response("private upstream error", { status: 401 })) as typeof fetch;
  const reply = await askBrain(input, env, transport);
  assert.equal(reply.status, "unavailable");
  assert.doesNotMatch(JSON.stringify(reply), /private upstream|test-not-a-real-secret/);
});
test("direct evidence avoids paid search and reaches answer without forwarding private text", async () => {
  const calls: string[] = [];
  const transport = (async (url, options) => {
    calls.push(String(url));
    if (String(url).startsWith("https://www.mydigipay.com/")) {
      assert.equal(options?.body, undefined);
      return new Response(`<html><body>${"اعتبار و خرید اقساطی کالا ".repeat(20)}</body></html>`, {
        headers: { "content-type": "text/html" },
      });
    }
    const body = JSON.parse(String(options?.body));
    assert.equal(body.tools, undefined);
    assert.match(body.instructions, /mydigipay/);
    return Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "مسیر خرید کالا را بررسی کنیم. https://www.mydigipay.com/credit/c-credit/",
            },
          ],
        },
      ],
    });
  }) as typeof fetch;
  const reply = await askBrain(
    { ...input, messages: [{ role: "user", text: "با 20 میلیون گوشی می‌خواهم" }] },
    { ...env, TASHILRADAR_DIRECT_RESEARCH: "true" },
    transport,
  );
  assert.equal(reply.status, "ready");
  assert.equal(calls.filter((url) => url.includes("api.openai.com")).length, 1);
  if (reply.status === "ready") {
    assert.equal(reply.sources.length, 2);
    assert.equal(reply.attributionRequired, false);
    assert.doesNotMatch(reply.text, /https:|mydigipay/);
  }
});
test("search outage still permits useful general response", async () => {
  let count = 0;
  const transport = (async () =>
    ++count === 1
      ? new Response("upstream", { status: 503 })
      : Response.json({
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text: "راهنمای عمومی" }] }],
        })) as typeof fetch;
  assert.equal((await askBrain(input, env, transport)).status, "ready");
});
