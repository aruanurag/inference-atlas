# Inference Atlas

Inference Atlas is an interactive education site for AI inference. It pairs four course levels with Anurag Mohan’s original inference articles and a curated landscape of the tools, platforms, and primitives that serve model requests.

The **Learn** section uses a topic sidebar and one lesson at a time. **Articles** provides the complete source reading room, grouped by depth. **Landscape** explores one architecture layer at a time, with component details on demand. Demonstrations are illustrative, not hardware benchmarks or a production tool selector.

## Courses

- **Level 100 — Inference foundations (7 lessons):** inference versus training, request lifecycle, KV basics, model routing, GPU/CPU memory sizing, and the inference stack.
- **Level 200 — Inside the serving engine (12 lessons):** prefill/decode, KV arithmetic and tiers, prefix reuse, batching, metrics, attention heads, paging, engine architecture, GGUF, and controlled local experiments.
- **Level 300 — Distributed inference (10 lessons):** TP/PP/DP, GPU networks, llm-d, model/provider/replica routing, KV transfer, Kubernetes rollouts, private workbenches, and the NVIDIA stack.
- **Level 400 — Production inference design (12 lessons):** cache-aware placement, conversation affinity, capacity, autoscaling, cold starts, benchmarking, agents, multimodal workloads, routing policy, MoE, structured decisions, and release gates.

Each lesson includes an interactive explorer, a self-contained detailed guide, a worked example, guided practice, a glossary, common mistakes, and a knowledge check. Guides use comparison tables, formulas, flows, source graphics, and carefully labeled examples rather than a continuous wall of text. Their sections are expandable, with expand/collapse-all controls that preserve the active lab. Play, pause, step, and reset controls let learners inspect processes. Completion is stored on the current browser/device, and lesson URLs are shareable.

Every imported article connects to at least one lesson, and its **complete original text is readable directly inside that lesson**, including its imported graphics. The Articles library remains available separately, but visiting LinkedIn is not required to complete the courses. Official external references are optional. Reading estimates cover the authored lesson guide and lab, not the optional complete source archive.

## Original article archive

The source inventory contains **30 editions of Inside LLM Inference plus 8 standalone inference articles**, reviewed and imported on October 13, 2026. Two unrelated cloud/DevOps articles are explicitly excluded in the inventory. The complete captured text, original source URLs, publication dates, and **7 original graphics** are preserved. Long originals load only when the reader opens them; they are not bundled into the initial app JavaScript. Graphics appear below the original text rather than at their original inline positions.

`content/linkedin/inventory.json` records discovery, `captures.json` holds the original text blocks/links/graphics, and `curation.json` records the level, rationale, topics, and adaptation notes. The original text remains separate from the shorter course adaptation. Rebuild the small metadata index and per-article reader files after updating this source material:

```bash
npm run build:articles
```

This command validates inventory coverage, reviewed levels, source fields, and local graphics before generating `src/content/article-index.json` and `public/articles/*.json`. Source-block hashes and archive-to-course coverage are checked by the test suite. This is a point-in-time import, not an automatic LinkedIn scraper or subscription monitor. The imported writing and graphics are attributed to their author; linked third-party material retains its own terms.

Advanced labs distinguish synthetic examples, arithmetic estimates, and recorded case-study observations. They do not run cloud infrastructure, launch model servers, call Jev, or perform live release, financial, or security actions. Hardware measurements in the OKE case study are source observations, not performance predictions.

The memory lab uses editable hypothetical full-attention architecture assumptions. It estimates raw weights and KV state in GiB, plus an explicit workspace allowance. It does not predict throughput, automatically choose a real model's architecture, or guarantee runtime fit. Animation is reduced when the operating system requests reduced motion.

## Community-sourced

The AI inference ecosystem moves fast, and no single maintainer can track it alone. Inference Atlas is built to grow with the community: as new tools emerge, gain real-world traction, or become widely adopted, they get added or updated in the catalog.

**Contributions are welcome and encouraged.** If you know a tool that belongs here, spot a stale entry, or can improve the guidance for a layer, please open a pull request — see [Contributing](#contributing) below.

## What the site includes

- A GPU/CPU-and-edge path switch that highlights compatible components.
- Forty-one lessons across four courses, with interactive diagrams, memory controls, and knowledge checks.
- Thirty-eight complete original articles with level filters, connected lessons, preserved source links, and seven graphics.
- Nine selectable architecture layers with guided explanations of what each layer does and where it fits.
- A selectable KV-cache memory ladder: GPU HBM, CPU DRAM, NVMe/object storage, and remote KV fabric.
- A curated, community-maintained catalog of open-source projects, platforms, primitives, and managed services.
- Official reading links for every tool and architecture layer.
- Vercel Web Analytics for anonymous traffic insights; no application backend, database, authentication, cookies, or custom interaction events.

## Project structure

```text
index.html                  # Page metadata and Vite entry point
src/
├── catalog.js               # Editorial layer and tool catalog
├── main.js                  # App navigation, course rendering, and landscape
├── courses.js               # Curriculum, knowledge checks, and source links
├── curriculum.js            # Source-aligned advanced lessons and course extensions
├── lesson-details.js        # Standalone detailed guides, worked examples, and practice
├── lesson-content.js        # Rich guide, formula, table, flow, and glossary rendering
├── labs.js                  # Interactive and animated lesson explorers
├── advanced-labs.js         # Distributed and production mechanism explorers
├── articles.js              # Source index and on-demand original loading
├── article-view.js          # Library, level filtering, and full-text readers
├── simulation.js            # Memory, prefix, timing, and scheduling calculations
├── state.js                 # Shareable selection state helpers
└── styles.css                # Responsive presentation system
public/og.png                # Social sharing image
public/articles/             # Complete on-demand original articles
public/article-images/       # Original source graphics
content/linkedin/            # Discovery, captures, and reviewed categorization
scripts/build-articles.mjs   # Deterministic source-archive generator
test/                        # Catalog and state behavior tests
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Run locally

The app lives at the root of this repository — there's no nested subdirectory to `cd` into.

```bash
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

Run the validation suite before sharing a change:

```bash
npm test
npm run build
```

`npm test` verifies catalog integrity, hardware compatibility, landscape URLs, memory/prefix/timing/batching calculations, capacity and routing decisions, SLO goodput, all 38 originals and 7 graphics, source/lab coverage across all 41 lessons, complete guide structure, valid rich-content blocks, local graphics, and escaped rendering.

## Deployment and analytics

1. Import the repository into Vercel.
2. Keep the Vercel project root directory at the repository root (the default) — this project is not nested in a monorepo subdirectory.
3. Keep Vercel's detected Vite settings: build command `npm run build`; output directory `dist`.
4. Enable **Web Analytics** from the Vercel project's **Analytics** page.
5. Optionally attach a custom domain from Vercel project settings.

Vercel Web Analytics provides anonymous visitor, page-view, referrer, geography, device, and browser insights. This project deliberately does not send custom interaction events or collect visitor-identifying application data.

## Maintaining the catalog

`src/catalog.js` is the editorial source of truth. Tool records must keep these fields complete:

- Stable lowercase `id`
- Human-readable `name`, `type`, and `primaryLayer`
- Accurate `supportedHardware` values (`gpu`, `cpu`, or both)
- Concise `description` and practical `chooseWhen` guidance
- Existing tool IDs in `relationships`
- An official documentation or source-repository `officialUrl`
- `status` and current `lastReviewed` date

Layer records also define the diagram order, layer guide, stack position, and layer-level reading link. Update all of these together when adding or moving a layer.

### Editorial standards

- Prefer official documentation and source repositories over third-party roundups.
- Add tools once they've gained real-world traction or adoption in the ecosystem — this keeps the atlas current without turning it into an unfiltered popularity list.
- Mark maintenance-only or superseded projects clearly rather than presenting them as new recommendations.
- Avoid unsupported benchmark claims, vendor logos, and implied endorsements.
- Keep wording factual, concise, and useful for building understanding of the stack.

## Contributing

This project runs on community contributions — adding a new tool, fixing a stale entry, or clarifying a layer's guidance are all welcome, no matter how small.

1. Create a focused branch from the latest default branch.
2. Keep each pull request limited to one concern: catalog curation, interaction behavior, visual design, documentation, or validation.
3. For catalog changes, update the review date and add or adjust tests when the catalog contract changes.
4. Run `npm test` and `npm run build` before opening a pull request.
5. Check both GPU and CPU/edge modes, and verify that desktop and narrow mobile layouts have no clipped text or controls.
6. Describe the user-visible outcome in the pull request, list any catalog sources added, and include screenshots for visual changes.

Do not commit `node_modules`, `dist`, credentials, analytics tokens, or generated local caches. The project requires no runtime secrets.

New to the project? Adding or updating a single catalog entry in `src/catalog.js` is a great first contribution.

## Reporting issues

When reporting a catalog or visual issue, include:

- The affected layer or tool name
- The current page mode (GPU or CPU/edge)
- A source link for factual corrections
- A screenshot and viewport size for layout defects

This helps keep the atlas accurate, readable, and useful as the inference ecosystem evolves — and it's exactly the kind of input that keeps this a living, community-driven map rather than a static snapshot.
