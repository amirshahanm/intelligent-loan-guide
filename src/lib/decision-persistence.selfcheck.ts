import { sha256Hex, stableJson } from "./decision-persistence.server";

const failures: string[] = [];
const check = (name: string, condition: boolean) => {
  if (!condition) failures.push(name);
};

const a = { z: 1, nested: { b: 2, a: 1 }, list: [{ y: 2, x: 1 }] };
const b = { list: [{ x: 1, y: 2 }], nested: { a: 1, b: 2 }, z: 1 };

check("stable JSON ignores object key insertion order", stableJson(a) === stableJson(b));

const hashA = await sha256Hex(a);
const hashB = await sha256Hex(b);
check("semantic hashes are stable across key order", hashA === hashB);
check("sha256 is 64 hex characters", /^[a-f0-9]{64}$/.test(hashA));

if (failures.length) {
  console.error("decision persistence self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}

console.log("decision persistence self-check passed");
