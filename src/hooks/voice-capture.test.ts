import { test } from "node:test";
import assert from "node:assert/strict";
import { bindVoiceCapture, type Recognition } from "./voice-capture";

function fixture() {
  const rec: Recognition = {
    lang: "",
    continuous: false,
    interimResults: false,
    start() {},
    stop() {},
    onresult: null,
    onerror: null,
    onend: null,
  };
  const drafts: string[] = [];
  const previews: string[] = [];
  let ends = 0;
  const capture = bindVoiceCapture(
    rec,
    (text) => drafts.push(text),
    (text) => previews.push(text),
    () => ends++,
  );
  return { rec, drafts, previews, capture, ends: () => ends };
}
test("a partial spoken sentence does not commit before capture ends", () => {
  const f = fixture();
  assert.equal(f.rec.continuous, true);
  f.rec.onresult?.({ results: [[{ transcript: "من ۳۰۰ میلیون دارم" }]] });
  assert.deepEqual(f.drafts, []);
  assert.deepEqual(f.previews, ["من ۳۰۰ میلیون دارم"]);
  f.rec.onresult?.({
    results: [[{ transcript: "من ۳۰۰ میلیون دارم" }], [{ transcript: " می‌خواهم ماشین بخرم" }]],
  });
  f.rec.onend?.();
  assert.deepEqual(f.drafts, ["من 300 میلیون دارم می‌خواهم ماشین بخرم"]);
});
test("capture end is delivered once and a new recording does not reuse old speech", () => {
  const f = fixture();
  f.rec.onresult?.({ results: [[{ transcript: "خودرو" }]] });
  f.rec.onend?.();
  f.rec.onend?.();
  assert.deepEqual(f.drafts, ["خودرو"]);
  f.capture.reset();
  f.rec.onend?.();
  assert.deepEqual(f.drafts, ["خودرو"]);
});
test("disposing capture cannot submit or overwrite a draft", () => {
  const f = fixture();
  f.rec.onresult?.({ results: [[{ transcript: "متن ناتمام" }]] });
  f.capture.dispose();
  f.rec.onend?.();
  assert.deepEqual(f.drafts, []);
});
