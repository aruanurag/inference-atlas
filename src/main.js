import { getTool, getToolsForLayer, layers, tools } from "./catalog.js";
import {
  isCompatible,
  readState,
  writeState,
  sameContentPage,
} from "./state.js";
import { allLessons, courses, getCourse, getLesson } from "./courses.js";
import { icon, labMarkup, mountLab } from "./labs.js";
import { getArticle } from "./articles.js";
import {
  articlePage,
  articleSidebar,
  mountArticleReader,
  originalArticleDisclosure,
} from "./article-view.js";
import { learningGoals, standaloneStudy } from "./lesson-content.js";

if (import.meta.env?.PROD)
  import("@vercel/analytics").then(({ inject }) => inject());

const app = document.querySelector("#app");
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
function stored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Learning remains available without storage. */
  }
}
const validIds = new Set(allLessons.map((l) => l.id));
const storedCompleted = stored("inference-atlas:completed", []);
const completed = new Set(
  Array.isArray(storedCompleted)
    ? storedCompleted.filter((id) => validIds.has(id))
    : [],
);
const answers = new Map();
let disposeLab = () => {};
let current = readNavigation();

function readNavigation() {
  const params = new URLSearchParams(location.search);
  const legacy = ["tool", "layer", "memory", "mode"].some((key) =>
    params.has(key),
  );
  const view =
    params.get("view") === "landscape" || (!params.has("view") && legacy)
      ? "landscape"
      : params.get("view") === "articles"
        ? "articles"
        : "learn";
  const lesson = getLesson(
    params.get("lesson") || getCourse(params.get("course")).lessons[0].id,
  );
  const landscape = readState();
  const tool = getTool(landscape.toolId);
  return {
    view,
    articleId: getArticle(params.get("article"))?.id || null,
    articleLevel: ["100", "200", "300", "400"].includes(
      params.get("articleLevel"),
    )
      ? params.get("articleLevel")
      : "all",
    lessonId: lesson.id,
    mode: landscape.mode,
    layerId:
      (landscape.memoryId ? "kv-cache" : tool?.primaryLayer) ||
      (layers.some((l) => l.id === landscape.layerId)
        ? landscape.layerId
        : "input"),
    toolId: tool?.id || null,
    memoryId: landscape.memoryId,
  };
}

function navigate(next, { replace = false, focus = true } = {}) {
  current = { ...current, ...next };
  const url = new URL(location.href);
  if (current.view === "learn") {
    ["mode", "tool", "layer", "memory", "article", "articleLevel"].forEach(
      (key) => url.searchParams.delete(key),
    );
    url.searchParams.set("view", "learn");
    url.searchParams.set("course", getLesson(current.lessonId).courseId);
    url.searchParams.set("lesson", current.lessonId);
    save("inference-atlas:last-lesson", current.lessonId);
  } else if (current.view === "articles") {
    [
      "course",
      "lesson",
      "mode",
      "tool",
      "layer",
      "memory",
      "article",
      "articleLevel",
    ].forEach((key) => url.searchParams.delete(key));
    url.searchParams.set("view", "articles");
    if (current.articleId) url.searchParams.set("article", current.articleId);
    if (current.articleLevel !== "all")
      url.searchParams.set("articleLevel", current.articleLevel);
  } else {
    ["course", "lesson", "article", "articleLevel"].forEach((key) =>
      url.searchParams.delete(key),
    );
    url.searchParams.set("view", "landscape");
    const landscapeUrl = new URL(
      writeState(current, url.href),
      location.origin,
    );
    url.search = landscapeUrl.search;
  }
  url.hash = "";
  history[replace ? "replaceState" : "pushState"](
    current,
    "",
    `${url.pathname}${url.search}`,
  );
  render();
  if (focus) {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector("h1")?.focus({ preventScroll: true });
  }
}

function header() {
  return `<a class="skip-link" href="#main-content">Skip to content</a><header class="app-header"><div class="header-inner"><a class="brand" href="?view=learn" data-view="learn"><span class="brand-mark">${icon("layers", 21)}</span><span class="brand-word">Inference</span> <strong>Atlas</strong></a><nav class="primary-nav" aria-label="Main navigation"><a href="?view=learn" data-view="learn" ${current.view === "learn" ? 'aria-current="page"' : ""}>${icon("book", 17)}Learn</a><a href="?view=articles" data-view="articles" ${current.view === "articles" ? 'aria-current="page"' : ""}>${icon("book", 17)}Articles</a><a href="?view=landscape" data-view="landscape" ${current.view === "landscape" ? 'aria-current="page"' : ""}>${icon("layers", 17)}Landscape</a></nav><a class="github-link" href="https://github.com/aruanurag/inference-atlas" target="_blank" rel="noopener noreferrer" aria-label="Inference Atlas on GitHub">${icon("github", 20)}<span>GitHub ↗</span></a><button class="mobile-menu icon-button" type="button" data-menu aria-expanded="false" aria-controls="course-sidebar" aria-label="Toggle topics">${icon("menu", 22)}</button></div></header>`;
}

function learningSidebar() {
  const lesson = getLesson(current.lessonId);
  const course = getCourse(lesson.courseId);
  const done = course.lessons.filter((l) => completed.has(l.id)).length;
  return `<aside class="sidebar" id="course-sidebar" aria-label="Learning topics"><div class="sidebar-heading"><span class="eyebrow">YOUR LEARNING PATH</span><h2>Learn AI inference</h2></div><div class="level-picker" role="group" aria-label="Course level">${courses.map((c) => `<button type="button" data-course="${c.id}" aria-pressed="${c.id === course.id}">${c.id}</button>`).join("")}</div><div class="selected-course"><strong>${course.title}</strong><small>${course.lessons.length} lessons · ${course.subtitle}</small></div><div class="course-progress"><div><span>Course progress</span><strong>${done}/${course.lessons.length}</strong></div><progress value="${done}" max="${course.lessons.length}" aria-label="${course.title} completion"></progress><small>Saved on this device</small></div><nav class="lesson-nav" aria-label="${course.title} lessons">${course.lessons.map((l, i) => `<a href="?view=learn&course=${course.id}&lesson=${l.id}" data-lesson="${l.id}" ${l.id === lesson.id ? 'aria-current="page"' : ""}><span class="lesson-number ${completed.has(l.id) ? "completed" : ""}">${completed.has(l.id) ? icon("check", 14) : String(i + 1).padStart(2, "0")}</span><span>${escapeHtml(l.title)}<small>${l.minutes} min${completed.has(l.id) ? " · Completed" : ""}</small></span></a>`).join("")}</nav><a class="sidebar-landscape" href="?view=articles" data-view="articles">${icon("book", 18)}Read the original articles ${icon("arrow", 16)}</a><a class="sidebar-landscape" href="?view=landscape" data-view="landscape">${icon("layers", 18)}Explore the tool landscape ${icon("arrow", 16)}</a></aside>`;
}

function nextLesson(id) {
  return (
    allLessons[allLessons.findIndex((lesson) => lesson.id === id) + 1] || null
  );
}

function lessonPage() {
  const lesson = getLesson(current.lessonId);
  const course = getCourse(lesson.courseId);
  const index = course.lessons.findIndex((l) => l.id === lesson.id);
  const next = nextLesson(lesson.id);
  const previous = course.lessons[index - 1];
  const selected = answers.get(lesson.id);
  const quiz = lesson.quiz;
  const correct = selected === quiz.correct;
  const courseDone = course.lessons.every((item) => completed.has(item.id));
  const endMessage = courseDone
    ? `You’ve completed Level ${course.id}. Revisit the labs, worked examples, and practical checks to reinforce what you learned.`
    : `You’ve reached the end of Level ${course.id}. Revisit remaining lessons and their complete guides from the sidebar.`;
  return `<main class="learning-main" id="main-content"><div class="lesson-layout"><article class="lesson-content"><div class="breadcrumbs"><span>Learn</span><span>/</span><span>${course.title}</span></div><div class="lesson-meta"><span class="level-pill">LEVEL ${course.id}</span><span>Lesson ${String(index + 1).padStart(2, "0")} of ${course.lessons.length}</span><span class="meta-dot">·</span><span>${lesson.minutes} min read + lab</span></div><h1 tabindex="-1">${escapeHtml(lesson.title)}</h1><p class="lesson-intro">${escapeHtml(lesson.intro)}</p>${learningGoals(lesson)}<section class="interactive-lab" id="explore" aria-labelledby="lab-title"><div class="lab-heading"><div><span class="eyebrow">INTERACTIVE EXPLORER</span><h2 id="lab-title">${lesson.labTitle}</h2></div><span class="lab-tag">${icon("chip", 14)}Concept lab</span></div><p class="lab-hint">${lesson.labHint}</p><div id="active-lab">${labMarkup(lesson.lab)}</div></section><div class="lesson-prose">${lesson.sections.map((s, i) => `<section id="concept-${i}"><h2>${escapeHtml(s.title)}</h2><p>${escapeHtml(s.text)}</p></section>`).join("")}</div>${standaloneStudy(lesson)}<aside class="takeaway"><span>${icon("book", 19)}</span><div><strong>Keep this in mind</strong><p>${escapeHtml(lesson.takeaway)}</p></div></aside><section class="knowledge-check" id="check" aria-labelledby="check-title"><div class="check-heading"><span class="eyebrow">CHECK YOUR UNDERSTANDING</span><span>One quick question</span></div><h2 id="check-title">${quiz.question}</h2><div class="quiz-options">${quiz.answers.map((answer, i) => `<button class="quiz-answer ${selected === i ? (correct ? "answer-correct" : "answer-incorrect") : ""}" type="button" data-answer="${i}" aria-pressed="${selected === i}"><span>${String.fromCharCode(65 + i)}</span>${escapeHtml(answer)}${selected === i && correct ? icon("check", 19) : ""}</button>`).join("")}</div><p class="quiz-feedback ${selected === undefined ? "empty-feedback" : ""}" aria-live="polite">${selected === undefined ? "Choose an answer to see the explanation." : `${correct ? "That’s right." : "Try again."} ${quiz.explanation}`}</p></section><section class="further-reading" id="reading"><span class="eyebrow">GO A LITTLE FURTHER</span><h2>Complete source material, right here.</h2><p class="source-inclusion-note">The lesson above stands on its own. For every detail and example from the author’s original writing, open the complete imported texts below without leaving this lesson.</p>${lesson.articleIds.map(originalArticleDisclosure).join("")}${
    lesson.sources.some((s) => !s.articleId)
      ? `<details class="optional-references"><summary>Optional official references</summary>${lesson.sources
          .filter((s) => !s.articleId)
          .map(
            (s) =>
              `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}<span>↗</span></a>`,
          )
          .join("")}</details>`
      : ""
  }<a href="?view=landscape&layer=${lesson.layer}" data-explore-layer="${lesson.layer}">See this concept in the landscape<span>→</span></a></section><nav class="lesson-footer" aria-label="Lesson navigation"><div>${previous ? `<a href="?view=learn&lesson=${previous.id}" data-lesson="${previous.id}">← Previous lesson</a>` : "<span>You’re at the start. Take your time.</span>"}</div><button class="button primary continue-button" type="button" data-complete>${completed.has(lesson.id) ? (next ? "Continue" : "Lesson completed") : next ? "Mark complete & continue" : "Mark lesson complete"}${icon(next ? "arrow" : "check", 17)}</button></nav>${!next && completed.has(lesson.id) ? `<p class="course-finished">${endMessage}</p>` : ""}</article><aside class="lesson-outline" aria-label="On this page"><span>IN THIS LESSON</span><a href="#explore">Interactive explorer</a>${lesson.sections.map((s, i) => `<a href="#concept-${i}">${escapeHtml(s.title)}</a>`).join("")}<a href="#deep-dive">Detailed guide</a><a href="#worked-example">Worked example</a><a href="#practice">Practical checks</a><a href="#glossary">Terminology</a><a href="#check">Knowledge check</a><a href="#reading">Included source texts</a><div class="outline-note">Learn by changing things.<br>Every lab is safe to explore.</div></aside></div></main>`;
}

const orderedLayers = [...layers].sort(
  (a, b) => Number(a.number) - Number(b.number),
);
function landscapeSidebar() {
  return `<aside class="sidebar" id="course-sidebar" aria-label="Architecture layers"><div class="sidebar-heading"><span class="eyebrow">THE INFERENCE STACK</span><h2>Explore by layer</h2><p>${tools.length} components · ${layers.length} layers</p></div><nav class="layer-nav" aria-label="Architecture layers">${orderedLayers.map((l) => `<a href="?view=landscape&layer=${l.id}" data-layer="${l.id}" ${current.layerId === l.id ? 'aria-current="page"' : ""}><span class="lesson-number">${l.number}</span><span>${escapeHtml(l.name)}<small>${getToolsForLayer(l.id).length} components</small></span></a>`).join("")}</nav><div class="landscape-sidebar-note">A community-curated map to help you understand the ecosystem. Follow official sources for current project details.</div><a class="sidebar-landscape" href="?view=learn" data-view="learn">${icon("book", 18)}Build the foundations ${icon("arrow", 16)}</a></aside>`;
}
const memoryTiers = [
  {
    id: "gpu-hbm",
    name: "GPU HBM",
    text: "The active execution tier for GPU model weights and hot KV state. Capacity is constrained, so engines budget it carefully.",
  },
  {
    id: "cpu-dram",
    name: "CPU DRAM",
    text: "Host memory can retain offloaded GPU context or serve as the main execution memory for a CPU runtime. GPU execution generally requires restoring offloaded state.",
  },
  {
    id: "nvme-object",
    name: "NVMe / object storage",
    text: "A larger pool for reusable context outside memory. Lookup and restore latency must be weighed against recomputation.",
  },
  {
    id: "remote-kv",
    name: "Remote KV cache",
    text: "A fleet-wide pool or transfer service. Routing, compatible state, and network bandwidth determine whether reuse improves the request path.",
  },
];

function landscapePage() {
  const layer = layers.find((l) => l.id === current.layerId);
  const layerTools = getToolsForLayer(layer.id);
  const active = layerTools.filter((t) => isCompatible(t, current.mode)).length;
  return `<main class="landscape-main" id="main-content"><div class="breadcrumbs"><span>Atlas</span><span>/</span><span>Landscape</span></div><div class="landscape-intro"><div><span class="eyebrow">CONNECT THE CONCEPTS</span><h1 tabindex="-1">The inference landscape.</h1><p class="lesson-intro">One stack, many building blocks. Explore a layer to see what it does and the tools that live there.</p></div><div class="landscape-mode"><span>Execution path</span><div class="segmented" role="group" aria-label="Hardware path"><button type="button" data-mode="gpu" aria-pressed="${current.mode === "gpu"}">GPU</button><button type="button" data-mode="cpu" aria-pressed="${current.mode === "cpu"}">CPU & edge</button></div></div></div><nav class="request-path" aria-label="Simplified request path">${[
    "input",
    "gateway",
    "kv-cache",
    "serving",
    "runtime",
    "observe",
  ]
    .map((id) => {
      const l = layers.find((l) => l.id === id);
      return `<button type="button" data-layer="${id}" ${layer.id === id ? 'aria-current="step"' : ""}>${l.short}<span aria-hidden="true">→</span></button>`;
    })
    .join(
      "",
    )}</nav><section class="layer-overview"><span class="eyebrow">LAYER ${layer.number}</span><h2>${escapeHtml(layer.name)}</h2><p>${escapeHtml(layer.description)}</p><details><summary>How this layer fits into the stack</summary><p>${escapeHtml(layer.stackPosition)}</p><ul>${layer.guide.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul><p>${escapeHtml(layer.modeNote)}</p><a href="${layer.readMoreUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(layer.readMoreLabel)} ↗</a></details>${layer.id === "kv-cache" ? `<div class="memory-links"><span>Memory tiers</span>${memoryTiers.map((t) => `<button type="button" data-memory="${t.id}">${t.name} ↗</button>`).join("")}</div>` : ""}</section><div class="catalog-heading"><h3>Components in this layer</h3><span>${active} of ${layerTools.length} in ${current.mode === "gpu" ? "GPU" : "CPU & edge"} path</span></div><div class="catalog-grid">${layerTools.map((t) => `<button type="button" data-tool="${t.id}" class="catalog-card ${isCompatible(t, current.mode) ? "" : "outside-path"}"><div><strong>${escapeHtml(t.name)}</strong><span aria-hidden="true">↗</span></div><span class="catalog-type">${escapeHtml(t.type)}${!isCompatible(t, current.mode) ? " · Other hardware path" : ""}${t.status !== "active" ? ` · ${t.status}` : ""}</span><p>${escapeHtml(t.description)}</p></button>`).join("")}</div><p class="catalog-note">This catalog explains architectural roles; it does not rank products. Tool status and review dates are available in each component’s details.</p></main>`;
}

function renderDialog() {
  const tool = getTool(current.toolId);
  const tier = memoryTiers.find((t) => t.id === current.memoryId);
  if (!tool && !tier) return "";
  return `<dialog class="detail-dialog" aria-labelledby="detail-title"><div class="dialog-top"><span class="eyebrow">${tool ? escapeHtml(tool.type) : "KV CACHE MEMORY TIER"}</span><button type="button" class="icon-button" data-close aria-label="Close details">✕</button></div><h2 id="detail-title">${escapeHtml(tool?.name || tier.name)}</h2><p class="detail-description">${escapeHtml(tool?.description || tier.text)}</p>${
    tool
      ? `<dl class="tool-details"><div><dt>Where it fits</dt><dd>${escapeHtml(layers.find((l) => l.id === tool.primaryLayer).name)}</dd></div><div><dt>When it is useful</dt><dd>${escapeHtml(tool.chooseWhen)}</dd></div><div><dt>Hardware</dt><dd>${tool.supportedHardware.map((h) => (h === "gpu" ? "GPU" : "CPU / edge")).join(" · ")}</dd></div><div><dt>Catalog status</dt><dd>${tool.status === "active" ? "Active" : `${tool.status} · included for architectural context`}</dd></div><div><dt>Last reviewed</dt><dd>${tool.lastReviewed}</dd></div></dl><div class="dialog-related"><span>Connects to</span><div>${
          tool.relationships
            .map(getTool)
            .filter(Boolean)
            .map(
              (t) =>
                `<button type="button" data-tool="${t.id}">${escapeHtml(t.name)}</button>`,
            )
            .join("") || "<span>No mapped relationships</span>"
        }</div></div><a class="button primary source-button" href="${tool.officialUrl}" target="_blank" rel="noopener noreferrer">Read official source ↗</a>`
      : '<a class="button primary" href="?view=learn&lesson=cache-tiers" data-lesson="cache-tiers">Explore cache tiers in Level 200 →</a>'
  }</dialog>`;
}

function render() {
  disposeLab();
  app.innerHTML = `${header()}<div class="app-shell">${current.view === "learn" ? learningSidebar() + lessonPage() : current.view === "articles" ? articleSidebar(current) + articlePage(current) : landscapeSidebar() + landscapePage()}</div>${current.view === "landscape" ? renderDialog() : ""}`;
  if (current.view === "learn")
    disposeLab = mountLab(
      document.querySelector("#active-lab"),
      getLesson(current.lessonId).lab,
    );
  if (current.view !== "landscape") mountArticleReader(app);
  const dialog = document.querySelector("dialog");
  if (dialog) {
    dialog.showModal();
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDetails();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const box = dialog.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          closeDetails();
      }
    });
  }
  document.title =
    current.view === "learn"
      ? `${getLesson(current.lessonId).title} · Inference Atlas`
      : current.view === "articles"
        ? `${getArticle(current.articleId)?.title || "Articles"} · Inference Atlas`
        : "Landscape · Inference Atlas";
}

function closeDetails() {
  const previous = current.toolId
    ? `[data-tool="${current.toolId}"]`
    : `[data-memory="${current.memoryId}"]`;
  navigate({ toolId: null, memoryId: null }, { replace: true, focus: false });
  document.querySelector(previous)?.focus();
}

app.addEventListener("click", (event) => {
  const target = event.target;
  if (
    target.closest("a") &&
    (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
  )
    return;
  const menu = target.closest("[data-menu]");
  if (menu) {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    document.querySelector(".sidebar").classList.toggle("mobile-open", open);
    return;
  }
  const studyAction = target.closest("[data-study-action]");
  if (studyAction) {
    app.querySelectorAll(".study-chapter").forEach((part) => {
      part.open = studyAction.dataset.studyAction === "expand";
    });
    return;
  }
  const view = target.closest("[data-view]");
  if (view) {
    event.preventDefault();
    navigate({
      view: view.dataset.view,
      articleId: null,
      articleLevel: "all",
      lessonId: getLesson(
        stored("inference-atlas:last-lesson", current.lessonId),
      ).id,
      toolId: null,
      memoryId: null,
    });
    return;
  }
  const course = target.closest("[data-course]");
  if (course) {
    const c = getCourse(course.dataset.course);
    navigate({
      view: "learn",
      lessonId:
        c.lessons.find((l) => !completed.has(l.id))?.id || c.lessons[0].id,
    });
    return;
  }
  const article = target.closest("[data-article]");
  if (article) {
    event.preventDefault();
    const source = getArticle(article.dataset.article);
    if (source)
      navigate({
        view: "articles",
        articleId: source.id,
        articleLevel: source.level,
      });
    return;
  }
  const articleLevel = target.closest("[data-article-level]");
  if (articleLevel) {
    event.preventDefault();
    navigate({
      view: "articles",
      articleId: null,
      articleLevel: articleLevel.dataset.articleLevel,
    });
    return;
  }
  const lesson = target.closest("[data-lesson]");
  if (lesson) {
    event.preventDefault();
    navigate({
      view: "learn",
      lessonId: getLesson(lesson.dataset.lesson).id,
      toolId: null,
      memoryId: null,
    });
    return;
  }
  const answer = target.closest("[data-answer]");
  if (answer) {
    answers.set(current.lessonId, Number(answer.dataset.answer));
    const quiz = getLesson(current.lessonId).quiz;
    const selected = Number(answer.dataset.answer);
    const correct = selected === quiz.correct;
    document.querySelectorAll("[data-answer]").forEach((button) => {
      const active = Number(button.dataset.answer) === selected;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("answer-correct", active && correct);
      button.classList.toggle("answer-incorrect", active && !correct);
      button.querySelector("svg")?.remove();
      if (active && correct)
        button.insertAdjacentHTML("beforeend", icon("check", 19));
    });
    const feedback = document.querySelector(".quiz-feedback");
    feedback.classList.remove("empty-feedback");
    feedback.textContent = `${correct ? "That’s right." : "Try again."} ${quiz.explanation}`;
    return;
  }
  if (target.closest("[data-complete]")) {
    const l = getLesson(current.lessonId);
    completed.add(l.id);
    save("inference-atlas:completed", [...completed]);
    const next = nextLesson(l.id);
    if (next) navigate({ lessonId: next.id });
    else {
      render();
      document
        .querySelector(".course-finished")
        ?.scrollIntoView({ block: "center" });
    }
    return;
  }
  const layer = target.closest("[data-layer], [data-explore-layer]");
  if (layer) {
    event.preventDefault();
    navigate({
      view: "landscape",
      layerId: layer.dataset.layer || layer.dataset.exploreLayer,
      toolId: null,
      memoryId: null,
    });
    return;
  }
  const mode = target.closest("[data-mode]");
  if (mode) {
    navigate({ mode: mode.dataset.mode }, { focus: false });
    return;
  }
  const tool = target.closest("[data-tool]");
  if (tool) {
    const t = getTool(tool.dataset.tool);
    navigate(
      {
        view: "landscape",
        toolId: t.id,
        layerId: t.primaryLayer,
        memoryId: null,
      },
      { focus: false },
    );
    return;
  }
  const memory = target.closest("[data-memory]");
  if (memory) {
    navigate(
      { memoryId: memory.dataset.memory, toolId: null },
      { focus: false },
    );
    return;
  }
  if (target.closest("[data-close]")) closeDetails();
});

window.addEventListener("popstate", () => {
  const next = readNavigation();
  if (sameContentPage(current, next)) return;
  current = next;
  render();
});
render();
