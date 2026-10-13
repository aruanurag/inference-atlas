import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { allLessons } from "../src/courses.js";
import { lessonDetails } from "../src/lesson-details.js";
import {
  learningGoals,
  renderStudyBlock,
  standaloneStudy,
} from "../src/lesson-content.js";
import {
  originalArticleDisclosure,
  articleReferenceLink,
} from "../src/article-view.js";
import { articles } from "../src/articles.js";
import { sameContentPage } from "../src/state.js";

test("every lesson has a complete standalone guide, example, practice and definitions", () => {
  assert.deepEqual(
    new Set(Object.keys(lessonDetails)),
    new Set(allLessons.map((l) => l.id)),
  );
  for (const lesson of allLessons) {
    const study = lesson.study;
    assert.equal(study.goals.length, 3, lesson.id);
    assert.ok(study.terms.length >= 4, lesson.id);
    assert.ok(study.chapters.length >= 3, lesson.id);
    assert.ok(
      study.chapters.every(
        (part) => part.title && part.summary && part.blocks.length >= 2,
      ),
      lesson.id,
    );
    assert.ok(study.worked.title && study.worked.blocks.length, lesson.id);
    assert.equal(study.practice.length, 3, lesson.id);
    assert.equal(study.mistakes.length, 3, lesson.id);
    const html = standaloneStudy(lesson);
    for (const id of ["deep-dive", "worked-example", "practice", "glossary"])
      assert.ok(html.includes(`id="${id}"`), `${lesson.id}: ${id}`);
    assert.ok(
      learningGoals(lesson).includes(study.goals[0].replaceAll("&", "&amp;")),
    );
    for (const id of lesson.articleIds) {
      const original = originalArticleDisclosure(id);
      assert.ok(original.includes(`data-original="${id}"`));
      assert.ok(
        !original.includes("linkedin.com"),
        "Original material must be directly readable on the lesson",
      );
    }
  }
});
test("rich guide blocks render completely and original lesson graphics exist", async () => {
  const types = new Set();
  for (const lesson of allLessons) {
    for (const block of [
      ...lesson.study.chapters.flatMap((c) => c.blocks),
      ...lesson.study.worked.blocks,
    ]) {
      types.add(block.type);
      const rendered = renderStudyBlock(block);
      assert.ok(rendered.length, `${lesson.id}: ${block.type}`);
      if (block.type === "table") {
        assert.ok(block.rows.length);
        assert.ok(
          block.rows.every((row) => row.length === block.headers.length),
          lesson.id,
        );
        assert.ok(
          rendered.includes('scope="col"') && rendered.includes('scope="row"'),
        );
      }
      if (block.type === "image") {
        assert.ok(
          block.path.startsWith("/article-images/") &&
            block.alt &&
            block.caption,
        );
        await access(new URL(`../public${block.path}`, import.meta.url));
      }
      if (block.type === "code")
        assert.ok(block.note, "Code examples must state their scope");
    }
  }
  assert.deepEqual(
    types,
    new Set([
      "paragraph",
      "flow",
      "table",
      "list",
      "steps",
      "formula",
      "image",
      "code",
    ]),
  );
});
test("paragraphs, tables, formulas and code escape source text instead of executing it", () => {
  const unsafe = '<script>alert("x")</script>';
  for (const block of [
    { type: "paragraph", text: unsafe },
    { type: "table", headers: [unsafe], rows: [[unsafe]] },
    { type: "formula", label: unsafe, expression: unsafe, explanation: unsafe },
    { type: "code", label: unsafe, text: unsafe, note: unsafe },
    { type: "flow", nodes: [unsafe] },
    { type: "list", items: [unsafe] },
  ]) {
    const html = renderStudyBlock(block);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  }
  assert.throws(
    () => renderStudyBlock({ type: "unknown" }),
    /Unknown study block/,
  );
});
test("cross-references to imported articles stay in Atlas instead of requiring LinkedIn", () => {
  for (const article of articles) {
    const link = articleReferenceLink({
      url: article.url + "/?tracking=example",
      text: article.title,
    });
    assert.ok(link.includes(`data-article="${article.id}"`));
    assert.ok(!link.includes('target="_blank"'));
    assert.ok(!link.includes("linkedin.com"));
  }
  const external = articleReferenceLink({
    url: "https://example.com/docs",
    text: "Docs",
  });
  assert.ok(external.includes('rel="noopener noreferrer"'));
  assert.ok(
    articleReferenceLink({
      url: "javascript:alert(1)",
      text: "Unsafe",
    }).includes('href="#"'),
  );
});

test("section-anchor history preserves the active page but real route changes do not", () => {
  const lesson = {
    view: "learn",
    lessonId: "kv-memory",
    mode: "cpu",
    layerId: "serving",
  };
  assert.equal(
    sameContentPage(lesson, {
      view: "learn",
      lessonId: "kv-memory",
      mode: "gpu",
      layerId: "input",
    }),
    true,
  );
  assert.equal(
    sameContentPage(lesson, { ...lesson, lessonId: "prefix-reuse" }),
    false,
  );
  assert.equal(
    sameContentPage(lesson, { view: "articles", articleId: "kcpre" }),
    false,
  );
  const original = {
    view: "articles",
    articleId: "kcpre",
    articleLevel: "200",
  };
  assert.equal(
    sameContentPage(original, { ...original, lessonId: "unused" }),
    true,
  );
  assert.equal(
    sameContentPage(original, { ...original, articleId: "cmare" }),
    false,
  );
  assert.equal(
    sameContentPage(original, { ...original, articleLevel: "all" }),
    false,
  );
  const landscape = {
    view: "landscape",
    mode: "gpu",
    layerId: "serving",
    toolId: null,
    memoryId: null,
  };
  assert.equal(
    sameContentPage(landscape, { ...landscape, lessonId: "unused" }),
    true,
  );
  for (const [key, value] of [
    ["mode", "cpu"],
    ["layerId", "runtime"],
    ["toolId", "vllm"],
    ["memoryId", "gpu-hbm"],
  ])
    assert.equal(
      sameContentPage(landscape, { ...landscape, [key]: value }),
      false,
    );
});
