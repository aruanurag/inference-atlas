import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const read = async (name) =>
  JSON.parse(await fs.readFile(path.join(root, name), "utf8"));
const inventory = await read("content/linkedin/inventory.json");
const captures = await read("content/linkedin/captures.json");
const curation = await read("content/linkedin/curation.json");
const canonical = (url) => url.replace(/\/$/, "");
const expected = new Set(inventory.articles.map((a) => canonical(a.url)));
const captured = new Set(captures.map((a) => canonical(a.url)));
if (
  expected.size !== inventory.articles.length ||
  captured.size !== captures.length ||
  expected.size !== captured.size ||
  [...expected].some((url) => !captured.has(url))
) {
  throw new Error(
    "The captured archive does not match the discovered article inventory.",
  );
}
if (
  captures.filter(
    (a) => a.kind !== "other-article" && a.kind !== "earlier-article",
  ).length !== inventory.newsletter.editionCount
) {
  throw new Error("Newsletter edition coverage is incomplete.");
}
const metadata = [];
await fs.mkdir(path.join(root, "public/articles"), { recursive: true });
await fs.mkdir(path.join(root, "src/content"), { recursive: true });
for (const capture of captures) {
  const id = canonical(capture.url).slice(-5);
  const review = curation.reviewedArticles.find(
    (item) => item.sourceKey === id,
  );
  if (!review || !["100", "200", "300", "400"].includes(review.level))
    throw new Error(`No reviewed level for ${capture.title}`);
  if (!capture.blocks.length || !capture.title || !capture.date)
    throw new Error(`Incomplete source: ${id}`);
  for (const image of capture.images) {
    if (!image.localPath)
      throw new Error(`Source graphic has not been imported: ${id}`);
    await fs.access(path.join(root, "public", image.localPath));
  }
  const bodyHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(capture.blocks))
    .digest("hex");
  const original = {
    id,
    title: capture.title,
    author: inventory.author,
    date: capture.date,
    url: canonical(capture.url),
    blocks: capture.blocks,
    images: capture.images,
    bodyHash,
  };
  await fs.writeFile(
    path.join(root, "public/articles", `${id}.json`),
    JSON.stringify(original, null, 2) + "\n",
  );
  metadata.push({
    id,
    title: capture.title,
    date: capture.date,
    url: canonical(capture.url),
    author: inventory.author,
    kind: capture.kind || "newsletter",
    level: review.level,
    rationale: review.rationale,
    topics: review.topics,
    clarification: review.clarification || null,
    lab: review.lab,
    bodyHash,
    blockCount: capture.blocks.length,
    characterCount: capture.blocks.reduce(
      (sum, block) => sum + block.text.length,
      0,
    ),
    imageCount: capture.images.length,
    observations: review.observations || null,
  });
}
metadata.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
await fs.writeFile(
  path.join(root, "src/content/article-index.json"),
  JSON.stringify(
    {
      author: inventory.author,
      authorUrl: inventory.authorUrl,
      newsletter: inventory.newsletter,
      importedAt: curation.importedAt,
      levelDefinitions: curation.levelDefinitions,
      articles: metadata,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Imported ${metadata.length} complete articles and ${captures.reduce((n, a) => n + a.images.length, 0)} original graphics.`,
);
