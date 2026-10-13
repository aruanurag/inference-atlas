import test from "node:test";
import assert from "node:assert/strict";
import {
  batchSchedule,
  estimateMemory,
  requestTiming,
  reusablePrefix,
} from "../src/simulation.js";

test("memory uses KV heads, independent weight/cache precision, and binary units", () => {
  const base = estimateMemory();
  assert.equal(base.kv, 0.5);
  assert.equal(base.weights, 16e9 / 1024 ** 3);
  assert.equal(estimateMemory({ sequences: 4 }).kv, base.kv * 4);
  assert.equal(estimateMemory({ kvHeads: 32 }).kv, base.kv * 4);
  assert.equal(estimateMemory({ weightBits: 4 }).kv, base.kv);
  assert.equal(estimateMemory({ kvBits: 8 }).kv, base.kv / 2);
  assert.equal(estimateMemory({ capacity: 8 }).fits, false);
});

test("prefix reuse stops at the first difference and rounds down to complete blocks", () => {
  const cached = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(reusablePrefix(cached, [1, 2, 3, 4, 9, 6, 7, 8]), {
    matched: 4,
    reused: 4,
  });
  assert.deepEqual(reusablePrefix(cached, [1, 2, 3, 9, 5, 6, 7, 8]), {
    matched: 3,
    reused: 0,
  });
  assert.deepEqual(reusablePrefix(cached, cached), { matched: 8, reused: 8 });
});

test("first-token timing excludes subsequent decode intervals", () => {
  assert.deepEqual(requestTiming({ output: 1 }), {
    ttft: 650,
    decode: 0,
    total: 650,
  });
  assert.equal(requestTiming({ output: 16 }).total, 1250);
});

test("continuous scheduling fills released slots while fixed batches wait", () => {
  const continuous = batchSchedule(true);
  const fixed = batchSchedule(false);
  assert.equal(continuous[3][0].id, "C");
  assert.equal(fixed[3][0], null);
  assert.equal(continuous.length, 9);
  assert.equal(fixed.length, 11);
  for (const schedule of [continuous, fixed]) {
    const counts = {};
    for (const frame of schedule)
      for (const slot of frame)
        if (slot) counts[slot.id] = (counts[slot.id] || 0) + 1;
    assert.deepEqual(counts, { A: 3, B: 7, C: 2, D: 4 });
  }
});
