import { getTool, getToolsForLayer, layers, tools } from './catalog.js';
import { isCompatible, readState, visibleToolState, writeState } from './state.js';

// The dynamic import keeps a dependency-free local static preview possible while
// Vite bundles the Vercel analytics client for production deployments.
if (import.meta.env?.PROD) {
  import('@vercel/analytics').then(({ inject }) => inject());
}

const app = document.querySelector('#app');
const modeDetails = {
  gpu: {
    label: 'GPU inference',
    headline: 'Batch, reuse, and split work across accelerators.',
    memory: 'HBM → CPU RAM → NVMe / object store → remote KV',
    fleet: 'Continuous batching · prefill/decode split · KV-aware routing',
    focus: 'vLLM · SGLang · TensorRT-LLM · llm-d · Dynamo',
  },
  cpu: {
    label: 'CPU & edge inference',
    headline: 'Keep execution local, quantized, and hardware-portable.',
    memory: 'DRAM → SSD / local model cache',
    fleet: 'Local runtime · compact model · thread and memory efficiency',
    focus: 'llama.cpp · Ollama · ONNX Runtime · OpenVINO · MLX',
  },
};

const statusCopy = {
  maintenance: 'Maintenance — included for architectural context',
  archived: 'Archived — no longer maintained; included for architectural context',
};

const primaryFlow = ['input', 'gateway', 'distributed', 'response-cache', 'kv-cache', 'serving', 'runtime'];
const secondaryFlow = ['managed'];
const memoryTiers = [
  {
    id: 'gpu-hbm',
    number: '01',
    name: 'GPU HBM',
    short: 'Hot blocks · decode',
    description: 'High-bandwidth GPU memory holding the active model weights and the hottest KV blocks for current generation.',
    stackPosition: 'The closest tier to the serving engine. Decode reads this state on every generated token, so this is the fastest but most constrained KV location.',
    modeNote: 'Primary in GPU mode. CPU and edge paths generally rely on system memory instead.',
  },
  {
    id: 'cpu-dram',
    number: '02',
    name: 'CPU DRAM',
    short: 'Offload tier',
    description: 'Host memory used to extend the working KV set beyond GPU HBM or to hold local model state on CPU-first systems.',
    stackPosition: 'One step below GPU HBM. Engines can offload reusable state here, then promote it back when needed.',
    modeNote: 'An important overflow tier for GPU serving and the main working-memory tier for CPU inference.',
  },
  {
    id: 'nvme-object',
    number: '03',
    name: 'NVMe / object',
    short: 'Warm reuse',
    description: 'Durable local or object-backed storage for a larger, slower pool of reusable cache blocks.',
    stackPosition: 'Below memory tiers. It preserves less-frequently used context so it can be recovered instead of recomputed.',
    modeNote: 'Useful for long-context reuse when latency tolerance is higher than a hot-memory cache hit.',
  },
  {
    id: 'remote-kv',
    number: '04',
    name: 'Remote KV fabric',
    short: 'Cross-worker locality',
    description: 'A cluster-wide KV cache and transfer fabric that lets a request land near reusable context on another worker.',
    stackPosition: 'Across the fleet rather than beneath one server. The router uses cache locality to choose a prefill or decode destination.',
    modeNote: 'Central to disaggregated GPU serving; typically unnecessary for a single local CPU runtime.',
  },
];

let state = normalizeState(readState());

function normalizeState(nextState) {
  const selectedTool = nextState.toolId ? getTool(nextState.toolId) : null;
  const selectedLayer = nextState.layerId ? layers.find((layer) => layer.id === nextState.layerId) : null;
  const selectedMemory = nextState.memoryId ? memoryTiers.find((tier) => tier.id === nextState.memoryId) : null;
  return {
    mode: nextState.mode,
    toolId: selectedMemory ? null : selectedTool?.id || null,
    layerId: selectedMemory ? 'kv-cache' : selectedTool?.primaryLayer || selectedLayer?.id || 'kv-cache',
    memoryId: selectedMemory?.id || null,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderTool(tool) {
  const compatible = isCompatible(tool, state.mode);
  const selected = tool.id === state.toolId;
  const status = statusCopy[tool.status] ? `<span class="status-dot" aria-label="${tool.status[0].toUpperCase()}${tool.status.slice(1)} status"></span>` : '';
  return `
    <div class="tool-card">
    <button
      class="tool-node ${visibleToolState(tool, state.mode)} ${selected ? 'selected' : ''}"
      type="button"
      data-tool="${tool.id}"
      aria-pressed="${selected}"
      aria-label="${escapeHtml(tool.name)}. ${compatible ? `Available in ${state.mode.toUpperCase()} mode` : `Muted in ${state.mode.toUpperCase()} mode`}."
    >
      <span class="tool-node-name">${escapeHtml(tool.name)}${status}</span>
      <span class="tool-node-type">${escapeHtml(tool.type)}</span>
    </button>
    <a class="tool-read-more" href="${tool.officialUrl}" target="_blank" rel="noopener noreferrer" aria-label="Read more about ${escapeHtml(tool.name)}">Read more <span aria-hidden="true">↗</span></a>
    </div>`;
}

function renderLayer(layerId, position) {
  const layer = layers.find((item) => item.id === layerId);
  const layerTools = getToolsForLayer(layerId);
  const activeCount = layerTools.filter((tool) => isCompatible(tool, state.mode)).length;
  return `
    <section class="flow-zone zone-${layer.id} ${position} ${state.layerId === layer.id && !state.toolId && !state.memoryId ? 'is-layer-selected' : ''}" data-layer-zone="${layer.id}" aria-labelledby="layer-${layer.id}">
      <button class="zone-heading" type="button" data-layer="${layer.id}" id="layer-${layer.id}" aria-pressed="${state.layerId === layer.id && !state.toolId}">
        <span class="zone-number">${layer.number}</span>
        <span>
          <span class="zone-title">${escapeHtml(layer.name)}</span>
          <span class="zone-count">${activeCount}/${layerTools.length} active</span>
        </span>
        ${layer.id === 'distributed' ? '<span class="fleet-flag">Fleet controller</span>' : ''}
      </button>
      <p class="zone-description">${escapeHtml(layer.short)}</p>
      <div class="tool-grid">
        ${layerTools.map(renderTool).join('')}
      </div>
    </section>`;
}

function renderLayerInspector(layer) {
  const layerTools = getToolsForLayer(layer.id);
  const modeCount = layerTools.filter((tool) => isCompatible(tool, state.mode)).length;
  return `
    <p class="eyebrow">Layer ${layer.number}</p>
    <h2 id="inspector-title">${escapeHtml(layer.name)}</h2>
    <p class="inspector-summary">${escapeHtml(layer.description)}</p>
    <section class="layer-guide" aria-label="${escapeHtml(layer.name)} layer guide">
      <span>Layer guide</span>
      <ol>${layer.guide.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
    </section>
    <div class="inspector-stat-row">
      <div><span>In ${state.mode.toUpperCase()} mode</span><strong>${modeCount} of ${layerTools.length} tools are active</strong></div>
      <div><span>Where it fits</span><strong>${escapeHtml(layer.stackPosition)}</strong></div>
      <div><span>Design note</span><strong>${escapeHtml(layer.modeNote)}</strong></div>
    </div>
    <div class="inspector-footer layer-inspector-footer">
      <p class="inspector-prompt">Select a tool to see its purpose, operating fit, and official source.</p>
      <a class="source-link" href="${layer.readMoreUrl}" target="_blank" rel="noopener noreferrer">Read more — ${escapeHtml(layer.readMoreLabel)} <span aria-hidden="true">↗</span></a>
    </div>`;
}

function renderMemoryInspector(tier) {
  return `
    <p class="eyebrow">KV cache memory tier ${tier.number}</p>
    <div class="inspector-heading-row">
      <h2 id="inspector-title">${escapeHtml(tier.name)}</h2>
      <span class="mode-fit ${state.mode === 'gpu' || tier.id === 'cpu-dram' ? 'is-active' : 'is-muted'}">${state.mode.toUpperCase()} context</span>
    </div>
    <p class="inspector-summary">${escapeHtml(tier.description)}</p>
    <div class="inspector-stat-row memory-inspector-stats">
      <div><span>Where it fits</span><strong>${escapeHtml(tier.stackPosition)}</strong></div>
      <div><span>In this path</span><strong>${escapeHtml(tier.modeNote)}</strong></div>
    </div>
    <div class="inspector-footer layer-inspector-footer">
      <p class="inspector-prompt">The memory ladder is the context-reuse path: check a higher tier before recomputing the same prompt tokens.</p>
      <a class="source-link" href="https://docs.vllm.ai/en/latest/features/kv_offloading_usage/" target="_blank" rel="noopener noreferrer">Read more — KV cache offloading <span aria-hidden="true">↗</span></a>
    </div>`;
}

function renderMemoryTier(tier) {
  const isSelected = state.memoryId === tier.id;
  return `
    <button class="tier tier-${tier.id} ${isSelected ? 'is-selected' : ''}" type="button" data-memory-tier="${tier.id}" aria-pressed="${isSelected}">
      <span>${tier.number}</span><strong>${escapeHtml(tier.name)}</strong><small>${escapeHtml(tier.short)}</small><em>Select tier ↗</em>
    </button>`;
}

function renderToolInspector(tool) {
  const compatible = isCompatible(tool, state.mode);
  const relatedTools = tool.relationships.map(getTool).filter(Boolean);
  const support = tool.supportedHardware.map((hardware) => hardware.toUpperCase()).join(' + ');
  return `
    <p class="eyebrow">${escapeHtml(tool.type)} · ${escapeHtml(tool.primaryLayer)}</p>
    <div class="inspector-heading-row">
      <h2 id="inspector-title">${escapeHtml(tool.name)}</h2>
      <span class="mode-fit ${compatible ? 'is-active' : 'is-muted'}">${compatible ? `In ${state.mode.toUpperCase()} path` : `Outside ${state.mode.toUpperCase()} path`}</span>
    </div>
    <p class="inspector-summary">${escapeHtml(tool.description)}</p>
    <dl class="tool-details">
      <div><dt>Choose when</dt><dd>${escapeHtml(tool.chooseWhen)}</dd></div>
      <div><dt>Hardware</dt><dd>${escapeHtml(support)}</dd></div>
      <div><dt>Catalog status</dt><dd>${statusCopy[tool.status] || 'Active'}</dd></div>
      <div><dt>Last reviewed</dt><dd>${tool.lastReviewed}</dd></div>
    </dl>
    <div class="inspector-footer">
      <div>
        <span class="related-label">Connects to</span>
        <div class="related-tools">
          ${relatedTools.map((related) => `<button type="button" data-tool="${related.id}">${escapeHtml(related.name)}</button>`).join('') || '<span class="text-muted">No mapped relationships</span>'}
        </div>
      </div>
      <a class="source-link" href="${tool.officialUrl}" target="_blank" rel="noopener noreferrer">Read more — official source <span aria-hidden="true">↗</span></a>
    </div>`;
}

function render() {
  const activeMode = modeDetails[state.mode];
  const selectedTool = state.toolId ? getTool(state.toolId) : null;
  const selectedLayer = layers.find((layer) => layer.id === state.layerId) || layers[0];
  const selectedMemory = state.memoryId ? memoryTiers.find((tier) => tier.id === state.memoryId) : null;
  const activeTools = tools.filter((tool) => isCompatible(tool, state.mode)).length;

  app.innerHTML = `
    <main>
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-masthead">
          <a class="brand" href="/" aria-label="Inference Atlas home">Inference <span>Atlas</span></a>
          <span class="catalog-stamp">69 curated components · reviewed 23 Jul 2026</span>
        </div>
        <div class="hero-copy">
          <p class="eyebrow">Interactive systems map</p>
          <h1 id="page-title">The AI inference<br /><em>landscape.</em></h1>
          <p class="lede">Trace a request from token shaping to routing, cache reuse, serving, and observability. Switch the hardware path to reveal the stack that matters.</p>
        </div>
        <div class="mode-control-wrap">
          <p class="mode-label">Execution path</p>
          <div class="mode-control" role="group" aria-label="Inference hardware path">
            <button type="button" data-mode="gpu" aria-pressed="${state.mode === 'gpu'}">GPU inference</button>
            <button type="button" data-mode="cpu" aria-pressed="${state.mode === 'cpu'}">CPU & edge</button>
          </div>
          <p class="mode-explainer" id="mode-description"><strong>${activeMode.label}</strong> — ${activeMode.headline}</p>
        </div>
      </section>

      <section class="system-readout" aria-label="Selected hardware path characteristics">
        <div><span>${state.mode.toUpperCase()} compatible</span><strong>${activeTools} of ${tools.length} components</strong></div>
        <div><span>Memory path</span><strong>${activeMode.memory}</strong></div>
        <div><span>Operating shape</span><strong>${activeMode.fleet}</strong></div>
        <div><span>Focus tools</span><strong>${activeMode.focus}</strong></div>
      </section>

      <section class="topology" aria-labelledby="topology-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">End-to-end serving path</p>
            <h2 id="topology-title">Follow the request. <span>Orchestrate the fleet.</span></h2>
          </div>
          <p class="legend"><span class="legend-active"></span> active in ${state.mode.toUpperCase()} &nbsp; <span class="legend-muted"></span> available on another path</p>
        </div>

        <div class="topology-workbench">
          <div class="topology-map">
            <div class="flow-key" aria-hidden="true">
              <span>Client request</span><i></i><span>Gateway</span><i></i><span>Fleet control</span><i></i><span>Cache & generate</span><i></i><span>Stream response</span>
            </div>

            <div class="flow-surface">
              <div class="primary-flow">
                ${primaryFlow.map((layerId) => renderLayer(layerId, 'primary')).join('')}
              </div>
              <div class="branch-line" aria-hidden="true"><span>Managed endpoint branch</span></div>
              <div class="secondary-flow">
                ${secondaryFlow.map((layerId) => renderLayer(layerId, 'secondary')).join('')}
              </div>
              <section class="memory-ladder" aria-labelledby="memory-title">
                <div class="memory-ladder-heading">
                  <p class="eyebrow">KV cache: the cache for your context</p>
                  <h3 id="memory-title">Move reuse down the memory ladder before recomputing tokens.</h3>
                </div>
                <div class="memory-tiers">
                  ${memoryTiers.map(renderMemoryTier).join('')}
                </div>
              </section>
              <section class="observe-rail" aria-labelledby="observe-title">
                <div class="observe-rail-copy">
                  <span class="zone-number">09</span>
                  <div><strong id="observe-title">Observe every hop</strong><small>Trace time-to-first-token, throughput, cache hits, cost, and tail latency.</small></div>
                </div>
                <div class="observe-tools">${getToolsForLayer('observe').map(renderTool).join('')}</div>
              </section>
            </div>
          </div>

          <aside class="inspector" aria-labelledby="inspector-title" aria-live="polite">
            <div class="inspector-rail"><span>Layer guide</span><span class="rail-line"></span><span>${state.mode.toUpperCase()}</span></div>
            <div class="inspector-content">
              ${selectedMemory ? renderMemoryInspector(selectedMemory) : selectedTool ? renderToolInspector(selectedTool) : renderLayerInspector(selectedLayer)}
            </div>
          </aside>
        </div>
      </section>

      <footer>
        <p>Editorially curated. Links point to official documentation or source repositories. Tool status reflects the review date, not a benchmark ranking.</p>
        <a href="https://vercel.com/docs/analytics" target="_blank" rel="noopener noreferrer">Traffic insights powered by Vercel Web Analytics <span aria-hidden="true">↗</span></a>
      </footer>
    </main>`;
}

function updateState(next, { push = true } = {}) {
  state = normalizeState({ ...state, ...next });
  const nextUrl = writeState(state);
  if (push) window.history.pushState(state, '', nextUrl);
  render();
}

app.addEventListener('click', (event) => {
  if (event.target.closest('.tool-read-more')) return;

  const modeButton = event.target.closest('[data-mode]');
  if (modeButton) {
    updateState({ mode: modeButton.dataset.mode });
    return;
  }

  const toolButton = event.target.closest('[data-tool]');
  if (toolButton) {
    const tool = getTool(toolButton.dataset.tool);
    if (tool) updateState({ toolId: tool.id, layerId: tool.primaryLayer, memoryId: null });
    return;
  }

  const memoryTier = event.target.closest('[data-memory-tier]');
  if (memoryTier) {
    updateState({ toolId: null, layerId: 'kv-cache', memoryId: memoryTier.dataset.memoryTier });
    return;
  }

  const layerButton = event.target.closest('[data-layer]');
  if (layerButton) {
    updateState({ toolId: null, layerId: layerButton.dataset.layer, memoryId: null });
    return;
  }

  const layerZone = event.target.closest('[data-layer-zone]');
  if (layerZone) updateState({ toolId: null, layerId: layerZone.dataset.layerZone, memoryId: null });
});

window.addEventListener('popstate', () => {
  state = normalizeState(readState());
  render();
});

render();
