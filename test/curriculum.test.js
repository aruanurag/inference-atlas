import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { articles, articleArchive } from "../src/articles.js";
import { allLessons, courses } from "../src/courses.js";
import { supportedLabTypes, labMarkup } from "../src/labs.js";
import {
  chooseReplica,
  desiredReplicas,
  eligibleModels,
  planCapacity,
  sloGoodput,
} from "../src/simulation.js";

const json = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
test("all discovered inference articles are imported intact, with all original graphics", async () => {
  const inventory = await json("../content/linkedin/inventory.json");
  const captures = await json("../content/linkedin/captures.json");
  assert.equal(articles.length, 38);
  assert.equal(articleArchive.newsletter.editionCount, 30);
  assert.equal(articles.filter((a) => a.kind === "newsletter").length, 30);
  assert.deepEqual(
    new Set(articles.map((a) => a.url)),
    new Set(inventory.articles.map((a) => a.url)),
  );
  let images = 0;
  for (const article of articles) {
    const original = await json(`../public/articles/${article.id}.json`);
    const capture = captures.find(
      (c) => c.url.replace(/\/$/, "") === article.url,
    );
    assert.deepEqual(original.blocks, capture.blocks, article.title);
    assert.equal(
      createHash("sha256")
        .update(JSON.stringify(original.blocks))
        .digest("hex"),
      article.bodyHash,
    );
    assert.equal(original.blocks.length, article.blockCount);
    assert.ok(["100", "200", "300", "400"].includes(article.level));
    assert.ok(article.topics.length && article.rationale);
    for (const image of original.images) {
      assert.ok(image.localPath.startsWith("/article-images/"));
      await access(new URL(`../public${image.localPath}`, import.meta.url));
      images++;
    }
  }
  assert.equal(images, 7);
});
test("four course levels cover every source and have working registered explorers", () => {
  assert.deepEqual(
    courses.map((c) => [c.id, c.lessons.length]),
    [
      ["100", 7],
      ["200", 12],
      ["300", 10],
      ["400", 12],
    ],
  );
  assert.equal(new Set(allLessons.map((l) => l.id)).size, 41);
  const covered = new Set();
  for (const lesson of allLessons) {
    assert.ok(lesson.articleIds.length, lesson.id);
    assert.ok(supportedLabTypes.includes(lesson.lab), lesson.lab);
    assert.ok(labMarkup(lesson.lab).includes("lab-visual"));
    assert.ok(
      lesson.sections.length >= 2 && lesson.quiz.answers[lesson.quiz.correct],
    );
    for (const id of lesson.articleIds) {
      assert.ok(articles.some((a) => a.id === id));
      covered.add(id);
    }
  }
  assert.deepEqual(covered, new Set(articles.map((a) => a.id)));
});
test("capacity separates measured goodput, reserve and startup backlog", () => {
  assert.deepEqual(
    planCapacity({ arrival: 12, goodput: 5, replicas: 2, startup: 60 }),
    { minimum: 3, nPlusOne: 4, backlog: 120 },
  );
  assert.equal(
    planCapacity({ arrival: 10, goodput: 5, replicas: 3, startup: 60 }).backlog,
    0,
  );
  assert.equal(desiredReplicas(9, 4), 3);
  assert.equal(desiredReplicas(0, 4), 1);
});
test("cache placement excludes incompatible endpoints and balances locality against queue", () => {
  const replicas = [
    { id: "A", cached: 1000, queue: 600, compatible: true },
    { id: "B", cached: 500, queue: 20, compatible: true },
    { id: "C", cached: 1000, queue: 0, compatible: false },
  ];
  assert.equal(chooseReplica(replicas, "cache").chosen.id, "A");
  assert.equal(chooseReplica(replicas, "balanced").chosen.id, "B");
  assert.equal(chooseReplica(replicas, "balanced").chosen.estimate, 270);
  assert.equal(
    chooseReplica(
      [
        { ...replicas[0], cached: 0 },
        { ...replicas[1], queue: 700 },
      ],
      "balanced",
    ).chosen.id,
    "B",
  );
  assert.equal(
    chooseReplica([{ ...replicas[0], compatible: false }]).chosen,
    null,
  );
});
test("goodput counts successful SLO-compliant work, and model contracts are hard gates", () => {
  const traces = [
    { success: true, ttft: 200, interval: 30 },
    { success: true, ttft: 800, interval: 30 },
    { success: false, ttft: 100, interval: 20 },
    { success: true, ttft: 400, interval: 90 },
  ];
  assert.deepEqual(sloGoodput(traces, 500, 50, 10), {
    completed: 3,
    passed: 1,
    goodput: 0.1,
  });
  assert.deepEqual(
    eligibleModels(
      [
        { id: "a", json: true, tools: false },
        { id: "b", json: true, tools: true },
      ],
      { json: true, tools: true },
    ).map((m) => m.id),
    ["b"],
  );
});
