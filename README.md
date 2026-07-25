# Inference Atlas

Inference Atlas is an interactive, static map of the AI inference landscape. It follows a request through input efficiency, gateways, fleet control, response and KV caching, serving engines, runtimes, managed endpoints, and observability.

It is designed for AI engineers and architects who need both the end-to-end stack and the relationships between individual tools.

## What the site includes

- A GPU/CPU-and-edge path switch that highlights compatible components.
- Nine selectable architecture layers with guided explanations of what each layer does and where it fits.
- A selectable KV-cache memory ladder: GPU HBM, CPU DRAM, NVMe/object storage, and remote KV fabric.
- A curated catalog of 69 open-source projects, platforms, primitives, and managed services.
- Official reading links for every tool and architecture layer.
- Vercel Web Analytics for anonymous traffic insights; no application backend, database, authentication, cookies, or custom interaction events.

## Project structure

```text
index.html                  # Page metadata and Vite entry point
src/
├── catalog.js               # Editorial layer and tool catalog
├── main.js                  # Rendering, URL state, and interactions
├── state.js                 # Shareable selection state helpers
└── styles.css                # Responsive presentation system
public/og.png                # Social sharing image
test/                        # Catalog and state behavior tests
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Run locally

From this directory:

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

`npm test` verifies the catalog count, required fields, official URLs, hardware compatibility, and shareable URL-state behavior.

## Deployment and analytics

1. Import the repository into Vercel.
2. Keep the Vercel project root directory at the repository root (the default) — this project is not nested in a monorepo subdirectory.
3. Keep Vercel’s detected Vite settings: build command `npm run build`; output directory `dist`.
4. Enable **Web Analytics** from the Vercel project’s **Analytics** page.
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
- Add only established, relevant tools; the catalog is curated, not a live popularity index.
- Mark maintenance-only projects clearly rather than presenting them as new recommendations.
- Avoid unsupported benchmark claims, vendor logos, and implied endorsements.
- Keep wording factual, concise, and useful for an architecture decision.

## Contributing

Contributions are welcome for factual corrections, missing high-impact projects, clearer guidance, accessibility improvements, and visual refinements.

1. Create a focused branch from the latest default branch.
2. Keep each pull request limited to one concern: catalog curation, interaction behavior, visual design, documentation, or validation.
3. For catalog changes, update the review date and add or adjust tests when the catalog contract changes.
4. Run `npm test` and `npm run build` before opening a pull request.
5. Check both GPU and CPU/edge modes, and verify that desktop and narrow mobile layouts have no clipped text or controls.
6. Describe the user-visible outcome in the pull request, list any catalog sources added, and include screenshots for visual changes.

Do not commit `node_modules`, `dist`, credentials, analytics tokens, or generated local caches. The project requires no runtime secrets.

## Reporting issues

When reporting a catalog or visual issue, include:

- The affected layer or tool name
- The current page mode (GPU or CPU/edge)
- A source link for factual corrections
- A screenshot and viewport size for layout defects

This helps keep the atlas accurate, readable, and useful as the inference ecosystem evolves.
