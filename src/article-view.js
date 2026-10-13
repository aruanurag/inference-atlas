import {
  articles,
  articleArchive,
  getArticle,
  loadOriginalArticle,
} from "./articles.js";
import { allLessons } from "./courses.js";

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const safeUrl = (url) => (/^https?:\/\//.test(url) ? esc(url) : "#");
const canonicalLink = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, "");
  } catch {
    return "";
  }
};
export function articleReferenceLink(link) {
  const local = articles.find(
    (article) => canonicalLink(article.url) === canonicalLink(link.url),
  );
  return local
    ? `<a href="?view=articles&article=${local.id}" data-article="${local.id}">${esc(link.text || local.title)} · Read in Atlas →</a>`
    : `<a href="${safeUrl(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.text || "Optional source link")} ↗</a>`;
}
export function originalArticleDisclosure(id) {
  const article = getArticle(id);
  if (!article) return "";
  return `<details class="original-reader lesson-original" data-original="${article.id}"><summary><span>${esc(article.title)}<small>Complete imported original · ${esc(article.date)}${article.imageCount ? ` · ${article.imageCount} graphic${article.imageCount === 1 ? "" : "s"}` : ""}</small></span><span aria-hidden="true">+</span></summary><div class="original-body" aria-live="polite"><p>Open to read the complete text here.</p></div></details>`;
}
export function articleSidebar(current) {
  return `<aside class="sidebar" id="course-sidebar" aria-label="Article levels"><div class="sidebar-heading"><span class="eyebrow">THE SOURCE LIBRARY</span><h2>Inside LLM Inference</h2><p>By ${articleArchive.author}<br>30 newsletter editions + 8 articles</p></div><nav class="layer-nav" aria-label="Article level"><a href="?view=articles" data-article-level="all" ${current.articleLevel === "all" ? 'aria-current="page"' : ""}><span class="lesson-number">38</span><span>All articles<small>Complete original texts</small></span></a>${["100", "200", "300", "400"].map((level) => `<a href="?view=articles&articleLevel=${level}" data-article-level="${level}" ${current.articleLevel === level ? 'aria-current="page"' : ""}><span class="lesson-number">${level}</span><span>Level ${level}<small>${articles.filter((a) => a.level === level).length} articles</small></span></a>`).join("")}</nav><div class="landscape-sidebar-note">Articles are grouped by the depth of their main topic, not by publication order. Some concepts appear at more than one level.</div><a class="sidebar-landscape" href="${articleArchive.newsletter.url}" target="_blank" rel="noopener noreferrer">Newsletter on LinkedIn ↗</a></aside>`;
}
const card = (article) =>
  `<a class="article-card" href="?view=articles&article=${article.id}" data-article="${article.id}"><div class="article-card-meta"><span class="level-pill">LEVEL ${article.level}</span><span>${esc(article.date)}</span></div><h2>${esc(article.title)}</h2><p>${esc(article.rationale)}</p><span class="article-card-footer">${article.kind === "newsletter" ? "Newsletter edition" : "Standalone article"} · ~${Math.max(1, Math.ceil(article.characterCount / 1300))} min read <span>Read article →</span></span></a>`;
export function articlePage(current) {
  const article = getArticle(current.articleId);
  if (!article) {
    const shown = articles.filter(
      (a) => current.articleLevel === "all" || a.level === current.articleLevel,
    );
    return `<main class="article-main" id="main-content"><div class="breadcrumbs"><span>Atlas</span><span>/</span><span>Articles</span></div><span class="eyebrow">YOUR INFERENCE READING ROOM</span><h1 tabindex="-1">The ideas behind the lessons.</h1><p class="lesson-intro">Explore all 38 original articles from Anurag Mohan’s inference series. Read the full detail, or connect a topic to an interactive lesson.</p><div class="library-summary"><span>${shown.length} ${current.articleLevel === "all" ? "articles" : `Level ${current.articleLevel} articles`}</span><span>Imported ${articleArchive.importedAt}</span></div><div class="article-grid">${shown.map(card).join("")}</div></main>`;
  }
  const related = allLessons.filter((l) => l.articleIds.includes(article.id));
  return `<main class="article-main article-reader" id="main-content"><a class="back-link" href="?view=articles&articleLevel=${article.level}" data-article-level="${article.level}">← Level ${article.level} articles</a><div class="lesson-meta"><span class="level-pill">LEVEL ${article.level}</span><span>${esc(article.date)}</span></div><h1 tabindex="-1">${esc(article.title)}</h1><p class="article-byline">${esc(article.author)} · ${article.kind === "newsletter" ? "Inside LLM Inference" : "Standalone article"} · Original source</p><p class="lesson-intro">${esc(article.rationale)}</p><div class="topic-tags">${article.topics.map((topic) => `<span>${esc(topic)}</span>`).join("")}</div><section class="related-lessons"><span class="eyebrow">LEARN BY EXPLORING</span><h2>Connected interactive lessons</h2><div>${related.map((l) => `<a href="?view=learn&lesson=${l.id}" data-lesson="${l.id}"><span>Level ${l.courseId}</span><strong>${esc(l.title)}</strong><span>Open lab →</span></a>`).join("")}</div></section>${article.clarification ? `<aside class="source-clarification"><strong>A note on the course adaptation</strong><p>${esc(article.clarification)}</p></aside>` : ""}<details class="original-reader" data-original="${article.id}"><summary><span>Read the complete original article<small>${article.blockCount} captured text blocks${article.imageCount ? ` · ${article.imageCount} original graphic${article.imageCount === 1 ? "" : "s"}` : ""}</small></span><span aria-hidden="true">+</span></summary><div class="original-body" aria-live="polite"><p>Open to load the complete text.</p></div></details><a class="original-link" href="${safeUrl(article.url)}" target="_blank" rel="noopener noreferrer">Read on LinkedIn ↗</a><p class="source-footnote">The original text is preserved separately from the shorter course adaptation. Graphics are collected below the text; their original inline positions are not reproduced.</p></main>`;
}
export function mountArticleReader(root) {
  root.querySelectorAll("[data-original]").forEach((details) => {
    let loaded = false;
    let loading = false;
    details.addEventListener("toggle", async () => {
      if (!details.open || loaded || loading) return;
      loading = true;
      const body = details.querySelector(".original-body");
      body.setAttribute("aria-busy", "true");
      body.innerHTML = "<p>Loading original article…</p>";
      try {
        const original = await loadOriginalArticle(details.dataset.original);
        if (!details.isConnected) return;
        body.innerHTML =
          original.blocks
            .map(
              (block) =>
                `${block.type === "heading" ? `<h2>${esc(block.text)}</h2>` : block.type === "code" ? `<pre><code>${esc(block.text)}</code></pre>` : `<p>${esc(block.text)}</p>`}${block.links?.length ? `<div class="original-references">${block.links.map(articleReferenceLink).join("")}</div>` : ""}`,
            )
            .join("") +
          (original.images?.length
            ? `<section class="original-graphics"><h2>Original graphics</h2>${original.images.map((image) => `<figure><a href="${esc(image.localPath)}" target="_blank" rel="noopener noreferrer"><img src="${esc(image.localPath)}" alt="${esc(image.description || image.alt || "Original article graphic")}" loading="lazy"></a><figcaption>${esc(image.description || image.alt || "Original article graphic")} · Open full size ↗</figcaption></figure>`).join("")}</section>`
            : "");
        loaded = true;
      } catch (error) {
        body.innerHTML = `<p>${esc(error.message)} <button type="button" data-retry-original>Retry</button></p>`;
      } finally {
        loading = false;
        body.removeAttribute("aria-busy");
      }
    });
    details.addEventListener("click", (event) => {
      if (event.target.closest("[data-retry-original]")) {
        details.open = false;
        requestAnimationFrame(() => {
          details.open = true;
        });
      }
    });
  });
}
