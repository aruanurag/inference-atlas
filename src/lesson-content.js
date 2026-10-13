const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function renderStudyBlock(block) {
  if (block.type === "paragraph") return `<p>${esc(block.text)}</p>`;
  if (block.type === "list" || block.type === "steps") {
    const tag = block.type === "steps" ? "ol" : "ul";
    return `<${tag} class="study-list ${block.type === "steps" ? "study-steps" : ""}">${block.items.map((item) => `<li>${esc(item)}</li>`).join("")}</${tag}>`;
  }
  if (block.type === "table")
    return `<div class="study-table-scroll" role="region" aria-label="Scrollable comparison table" tabindex="0"><table class="study-table"><thead><tr>${block.headers.map((header) => `<th scope="col">${esc(header)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((cell, i) => (i === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
  if (block.type === "formula")
    return `<div class="study-formula"><span>${esc(block.label)}</span><code>${esc(block.expression)}</code><p>${esc(block.explanation)}</p></div>`;
  if (block.type === "code")
    return `<div class="study-code"><strong>${esc(block.label)}</strong><pre><code>${esc(block.text)}</code></pre>${block.note ? `<p>${esc(block.note)}</p>` : ""}</div>`;
  if (block.type === "flow")
    return `<ol class="study-flow">${block.nodes.map((node, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span>${esc(node)}</li>`).join("")}</ol>`;
  if (block.type === "image")
    return `<figure class="study-figure"><a href="${esc(block.path)}" target="_blank" rel="noopener noreferrer"><img src="${esc(block.path)}" alt="${esc(block.alt)}" loading="lazy"></a><figcaption>${esc(block.caption)} <span>Open full size ↗</span></figcaption></figure>`;
  throw new Error(`Unknown study block: ${block.type}`);
}
export function learningGoals(lesson) {
  return `<details class="learning-goals"><summary>What you’ll be able to do <span>${lesson.study.goals.length} learning goals</span></summary><ul>${lesson.study.goals.map((goal) => `<li>${esc(goal)}</li>`).join("")}</ul></details>`;
}
export function standaloneStudy(lesson) {
  const study = lesson.study;
  return `<section class="standalone-study" id="deep-dive" aria-labelledby="study-title"><div class="study-heading"><span class="eyebrow">THE COMPLETE LESSON GUIDE</span><h2 id="study-title">Understand the whole mechanism.</h2><p>Read the explanations, comparisons, and practical checks here. No LinkedIn visit is needed.</p></div><div class="study-toolbar"><span>${study.chapters.length} detailed sections</span><div><button type="button" data-study-action="expand">Expand all</button><button type="button" data-study-action="collapse">Collapse all</button></div></div><div class="study-chapters">${study.chapters.map((part, i) => `<details class="study-chapter" ${i === 0 ? "open" : ""}><summary><span class="study-chapter-number">${String(i + 1).padStart(2, "0")}</span><span><strong>${esc(part.title)}</strong><small>${esc(part.summary)}</small></span><span class="study-chevron" aria-hidden="true">+</span></summary><div class="study-chapter-body">${part.blocks.map(renderStudyBlock).join("")}</div></details>`).join("")}</div></section><section class="worked-example" id="worked-example" aria-labelledby="example-title"><span class="eyebrow">WORK THROUGH AN EXAMPLE</span><h2 id="example-title">${esc(study.worked.title)}</h2>${study.worked.blocks.map(renderStudyBlock).join("")}</section><section class="practice-guide" id="practice" aria-labelledby="practice-title"><span class="eyebrow">PUT IT TO WORK</span><h2 id="practice-title">Try it, then explain it.</h2><ol>${study.practice.map((task) => `<li>${esc(task)}</li>`).join("")}</ol><details class="common-mistakes"><summary>Common mistakes to avoid</summary><ul>${study.mistakes.map((mistake) => `<li>${esc(mistake)}</li>`).join("")}</ul></details></section><details class="study-glossary" id="glossary"><summary>Terminology in this lesson <span>${study.terms.length} definitions</span></summary><dl>${study.terms.map(([term, definition]) => `<div><dt>${esc(term)}</dt><dd>${esc(definition)}</dd></div>`).join("")}</dl></details>`;
}
