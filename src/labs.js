import {
  batchSchedule,
  estimateMemory,
  requestTiming,
  reusablePrefix,
} from "./simulation.js";
import {
  advancedLabTypes,
  advancedLabMarkup,
  mountAdvancedLab,
} from "./advanced-labs.js";

export const supportedLabTypes = [
  ...advancedLabTypes,
  "inference",
  "memory",
  "training",
  "kv",
  "routing",
  "prefix",
  "tiers",
  "phases",
  "batching",
  "metrics",
  "distributed",
];

export const icon = (name, size = 20) => {
  const paths = {
    play: '<path d="m8 5 11 7-11 7Z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    book: '<path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2Z"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v5m6-5v5M9 18v5m6-5v5M1 9h5m-5 6h5m12-6h5m-5 6h5"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
    message: '<path d="M4 4h16v12H9l-5 4Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    github:
      '<path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1-.3-1.7-.8-2.2 3-.3 6-1.5 6-6a5 5 0 0 0-1.4-3.5A5 5 0 0 0 18.7 3S17.5 2.7 15 4a12 12 0 0 0-6 0C6.5 2.7 5.3 3 5.3 3a5 5 0 0 0-.1 3.3A5 5 0 0 0 3.8 10c0 4.5 3 5.7 6 6-.5.5-.8 1.2-.8 2.2V22"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.chip}</svg>`;
};

const option = (value, label, selected) =>
  `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
const select = (name, label, values, selected) =>
  `<label class="lab-field" for="lab-${name}"><span>${label}</span><select id="lab-${name}" name="${name}" aria-label="${label}">${values.map(([v, l]) => option(v, l, selected)).join("")}</select></label>`;
const range = (name, label, min, max, step, value, suffix = "") =>
  `<label class="lab-field" for="lab-${name}"><span>${label} <output data-value="${name}" aria-hidden="true">${value}${suffix}</output></span><input id="lab-${name}" type="range" name="${name}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${value}" data-suffix="${suffix}"></label>`;
const animateControls = (label = "Run demonstration") =>
  `<div class="lab-actions"><button class="button primary" data-lab-action="play" type="button">${icon("play", 16)}<span>${label}</span></button><button class="button" data-lab-action="step" type="button">Step ${icon("arrow", 16)}</button><button class="icon-button" data-lab-action="reset" type="button" aria-label="Reset demonstration">${icon("reset", 17)}</button></div>`;

export function labMarkup(type) {
  if (advancedLabTypes.includes(type)) return advancedLabMarkup(type);
  let controls = "";
  if (type === "memory")
    controls = `<div class="lab-fields memory-fields">${select(
      "parameters",
      "Model size",
      [
        [3, "3B parameters"],
        [8, "8B parameters"],
        [13, "13B parameters"],
        [70, "70B parameters"],
      ],
      8,
    )}${select(
      "weightBits",
      "Weight precision",
      [
        [16, "16-bit"],
        [8, "8-bit"],
        [4, "4-bit"],
      ],
      16,
    )}${select(
      "capacity",
      "Available memory",
      [
        [8, "8 GiB"],
        [16, "16 GiB"],
        [24, "24 GiB"],
        [48, "48 GiB"],
        [80, "80 GiB"],
        [128, "128 GiB"],
      ],
      24,
    )}${select(
      "tokens",
      "Tokens per sequence",
      [
        [1024, "1,024"],
        [4096, "4,096"],
        [8192, "8,192"],
        [32768, "32,768"],
      ],
      4096,
    )}${select(
      "sequences",
      "Active sequences",
      [
        [1, "1"],
        [4, "4"],
        [8, "8"],
        [16, "16"],
      ],
      1,
    )}${select(
      "kvBits",
      "KV cache precision",
      [
        [16, "16-bit"],
        [8, "8-bit"],
      ],
      16,
    )}</div><details class="lab-assumptions"><summary>Architecture & workspace assumptions</summary><div class="lab-fields">${select(
      "layers",
      "Transformer layers",
      [
        [24, "24"],
        [32, "32"],
        [40, "40"],
        [80, "80"],
      ],
      32,
    )}${select(
      "kvHeads",
      "KV heads (not query heads)",
      [
        [4, "4"],
        [8, "8 · GQA example"],
        [32, "32 · MHA example"],
      ],
      8,
    )}${select(
      "headDim",
      "Head dimension",
      [
        [64, "64"],
        [128, "128"],
      ],
      128,
    )}${select(
      "headroom",
      "Runtime headroom",
      [
        [2, "2 GiB"],
        [4, "4 GiB"],
        [8, "8 GiB"],
      ],
      2,
    )}</div><p>Editable hypothetical full-attention architecture; changing model size does not choose a real model configuration. Raw estimates omit quantization metadata, allocation overhead, sharding, shared prefixes, and special attention layouts. Memory is in GiB (2³⁰ bytes). For CPU use available RAM; for GPU use usable device memory.</p></details>`;
  else if (type === "training")
    controls = `<div class="segmented" role="group" aria-label="Model operation"><button type="button" data-lab-choice="inference" aria-pressed="true">Inference</button><button type="button" data-lab-choice="training" aria-pressed="false">Training</button></div>${animateControls("Run a step")}`;
  else if (type === "kv")
    controls = `<label class="switch-label"><input type="checkbox" name="useCache" checked> Keep KV cache</label>${animateControls("Generate tokens")}`;
  else if (type === "routing")
    controls = `<div class="lab-fields">${select(
      "task",
      "Request type",
      [
        ["rewrite", "Rewrite a short message"],
        ["code", "Debug a code snippet"],
        ["reason", "Analyze a complex problem"],
      ],
      "rewrite",
    )}</div>`;
  else if (type === "prefix")
    controls = `<div class="lab-fields">${range("diverge", "First changed token", 1, 13, 1, 9)}</div>`;
  else if (type === "tiers")
    controls = `<div class="lab-fields">${select(
      "location",
      "Cached state location",
      [
        [0, "GPU memory"],
        [1, "CPU memory"],
        [2, "Local storage"],
        [3, "Remote cache"],
        [4, "No reusable state"],
      ],
      2,
    )}</div>${animateControls("Trace lookup")}`;
  else if (type === "phases")
    controls = `<div class="lab-fields">${range("prompt", "Prompt tokens", 128, 8192, 128, 2048)}${range("output", "Output tokens", 8, 128, 8, 32)}</div>${animateControls("Run the phases")}`;
  else if (type === "batching")
    controls = `<div class="segmented" role="group" aria-label="Batch scheduling"><button type="button" data-lab-choice="continuous" aria-pressed="true">Continuous</button><button type="button" data-lab-choice="static" aria-pressed="false">Fixed batch</button></div>${animateControls("Run scheduler")}`;
  else if (type === "metrics")
    controls = `<div class="lab-fields">${range("queue", "Queue wait", 0, 1000, 50, 200, " ms")}${range("prefill", "Prefill", 100, 2000, 100, 400, " ms")}${range("interval", "Between output tokens", 10, 100, 10, 40, " ms")}${range("output", "Output tokens", 4, 64, 4, 16)}</div>`;
  else
    controls = animateControls(
      type === "distributed" ? "Trace the handoff" : "Run inference",
    );
  return `<div class="lab-controls">${controls}</div><div class="lab-visual"></div><p class="lab-caption" aria-live="polite"></p>`;
}

export function mountLab(root, type) {
  if (advancedLabTypes.includes(type)) return mountAdvancedLab(root, type);
  const visual = root.querySelector(".lab-visual");
  const caption = root.querySelector(".lab-caption");
  let step = 0;
  let choice = type === "batching" ? "continuous" : "inference";
  let timer = null;
  const value = (name, fallback) => {
    const field = root.querySelector(`[name="${name}"]`);
    return field
      ? field.type === "checkbox"
        ? field.checked
        : field.value
      : fallback;
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
    const label = root.querySelector('[data-lab-action="play"] span');
    if (label) label.textContent = step >= maxStep() ? "Replay" : "Play";
  };
  const maxStep = () =>
    type === "inference"
      ? 9
      : type === "kv"
        ? 4
        : type === "tiers"
          ? 5
          : type === "batching"
            ? batchSchedule(choice === "continuous").length
            : type === "distributed"
              ? 4
              : 3;
  const flowNode = (label, sub, symbol, index, active, done) =>
    `<div class="flow-node ${active ? "is-current" : ""} ${done ? "is-done" : ""}"><div class="node-icon">${icon(done ? "check" : symbol, 24)}</div><strong>${label}</strong><small>${sub}</small><span class="node-index">0${index + 1}</span></div>`;
  function draw() {
    if (type === "inference") {
      const stage = step === 0 ? -1 : Math.min(3, step - 1);
      const nodes = [
        ["Your prompt", "Input text", "message"],
        ["Tokenize", "Text → token IDs", "layers"],
        ["Prefill", "Process context", "chip"],
        ["Decode", "Generate output", "message"],
      ];
      const words = ["Inference", "turns", "a", "prompt", "into", "text."];
      visual.innerHTML = `<div class="prompt-example"><span>EXAMPLE PROMPT</span>“Explain inference in one sentence.”</div><div class="pipeline">${nodes.map(([l, s, i], n) => flowNode(l, s, i, n, n === stage && step < 9, n < stage || step === 9)).join("")}</div><div class="generated-output"><span>OUTPUT</span><div>${
        step < 4
          ? "<em>Waiting for generation…</em>"
          : words
              .slice(0, step - 3)
              .map((w) => `<span class="output-token">${w}</span>`)
              .join("")
      }</div></div>`;
      caption.textContent = [
        "Ready to follow one request. This uses example tokens and a scripted answer.",
        "The application submits a prompt; trained weights stay fixed.",
        "The tokenizer converts text to model-specific IDs. Tokens are not always whole words.",
        "Prefill processes the prompt and prepares attention keys and values.",
        "Decode selects the first output token from the processed prompt.",
        "The generated token joins the context for the next prediction.",
        "Each ordinary decode step continues the sequence.",
        "The server streams generated text while the request is still running.",
        "The context keeps growing as new tokens are generated.",
        "The response ends. The weights have not been updated.",
      ][step];
    } else if (type === "training") {
      const train = choice === "training";
      visual.innerHTML = `<div class="training-flow"><div class="simple-node">${icon("message", 26)}<strong>${train ? "Training examples" : "New prompt"}</strong></div><span class="flow-arrow">→</span><div class="weight-model"><span>MODEL WEIGHTS</span><div class="weight-grid ${train && step ? "weights-updated" : ""}">${Array.from({ length: 16 }, (_, i) => `<i style="--cell-opacity:${0.2 + (i % 5) * 0.15}"></i>`).join("")}</div><strong>${train && step ? "Updated by optimizer" : "Fixed for inference"}</strong></div><span class="flow-arrow">→</span><div class="simple-node">${icon(train ? "layers" : "message", 26)}<strong>${train ? "Loss → gradients" : step ? "Generated response" : "Next-token prediction"}</strong></div></div>${train ? `<div class="feedback-path ${step ? "is-current" : ""}">← Optimizer updates parameters using gradients</div>` : '<div class="fixed-label">The input changes. The learned parameters stay the same.</div>'}`;
      caption.textContent = train
        ? "Training: a forward pass, an objective, gradients, and an optimizer update. Schematic only."
        : "Inference: forward computations use the existing weights to generate output.";
    } else if (type === "kv") {
      const cached = value("useCache", true);
      const count = 4 + step;
      visual.innerHTML = `<div class="cache-label"><span>ATTENTION STATE</span><span>${step ? `Decode step ${step}` : "Prompt processed"}</span></div><div class="kv-blocks">${Array.from({ length: count }, (_, i) => `<div class="kv-block ${i === count - 1 && step ? "new-block" : cached ? "reused-block" : ""}"><span>T${i + 1}</span><strong>K · V</strong><small>${!step ? "stored" : i === count - 1 ? "new" : cached ? "reuse" : "recompute"}</small></div>`).join("")}</div><div class="cache-operation">${icon("chip", 22)}<span>${step ? (cached ? "Read prior K/V + compute K/V for the new token" : `Compute K/V for all ${count} context positions again`) : "The prompt’s keys and values are available for generation."}</span></div>`;
      caption.textContent =
        "Conceptual K/V positions, not engine allocation blocks. Attention still reads prior context when the cache is enabled.";
    } else if (type === "memory") {
      const input = Object.fromEntries(
        [
          "parameters",
          "weightBits",
          "capacity",
          "tokens",
          "sequences",
          "kvBits",
          "layers",
          "kvHeads",
          "headDim",
          "headroom",
        ].map((n) => [n, Number(value(n, undefined))]),
      );
      const m = estimateMemory(input);
      const scale = Math.max(input.capacity, m.total);
      visual.innerHTML = `<div class="memory-total"><div><span>ESTIMATED WORKING MEMORY</span><strong>${m.total.toFixed(1)} <small>GiB</small></strong></div><span class="fit-badge ${m.fits ? "" : "over-budget"}">${m.fits ? `${m.free.toFixed(1)} GiB remaining` : `${(-m.free).toFixed(1)} GiB over capacity`}</span></div><div class="memory-bar" role="img" aria-label="${m.weights.toFixed(2)} GiB weights, ${m.kv.toFixed(2)} GiB KV cache, ${m.headroom} GiB workspace, ${input.capacity} GiB capacity"><div class="memory-segment weights" style="width:${(m.weights / scale) * 100}%"></div><div class="memory-segment kv" style="width:${(m.kv / scale) * 100}%"></div><div class="memory-segment workspace" style="width:${(m.headroom / scale) * 100}%"></div>${!m.fits ? `<span class="capacity-marker" style="left:${(input.capacity / scale) * 100}%"></span>` : ""}</div><div class="memory-legend"><span><i class="weights"></i>Weights <strong>${m.weights.toFixed(2)} GiB</strong></span><span><i class="kv"></i>KV cache <strong>${m.kv.toFixed(2)} GiB</strong></span><span><i class="workspace"></i>Headroom <strong>${m.headroom.toFixed(1)} GiB</strong></span></div>`;
      caption.textContent = `Capacity: ${input.capacity} GiB. ${m.fits ? "Within this simplified budget; actual runtime fit and speed still need measurement." : "Exceeds this budget. Try lower precision, fewer sequences, or a shorter retained context."}`;
    } else if (type === "routing") {
      const task = value("task", "rewrite");
      const target = { rewrite: 0, code: 1, reason: 2 }[task];
      visual.innerHTML = `<div class="router-entry">${icon("message", 22)}<span>Request</span><span class="flow-arrow">→</span>${icon("layers", 22)}<strong>Task policy</strong></div><div class="route-destinations">${[
        ["Small general model", "Short rewriting task"],
        ["Code specialist", "Code-focused task"],
        ["Capable general model", "Complex analysis task"],
      ]
        .map(
          ([l, s], i) =>
            `<div class="route-destination ${target === i ? "is-current" : ""}"><span>${target === i ? "Selected destination" : "Available destination"}</span>${icon("chip", 26)}<strong>${l}</strong><small>${s}</small></div>`,
        )
        .join("")}</div>`;
      caption.textContent =
        "Illustrative task policy. These generic model roles are not measured quality or cost rankings.";
    } else if (type === "prefix") {
      const divergence = Number(value("diverge", 9));
      const cached = Array.from({ length: 12 }, (_, i) => i);
      const incoming = cached.map((v, i) =>
        i === divergence - 1 ? "changed" : v,
      );
      const { matched, reused } = reusablePrefix(cached, incoming);
      const row = (label, isIncoming) =>
        `<div class="prefix-row"><span>${label}</span><div>${cached.map((_, i) => `<span class="prefix-token ${i < reused ? "reused-block" : ""} ${isIncoming && i === divergence - 1 ? "changed-token" : ""}">${isIncoming && i === divergence - 1 ? "Δ" : i + 1}</span>`).join("")}</div></div>`;
      visual.innerHTML = `${row("Cached prompt", false)}${row("New request", true)}<div class="prefix-summary"><strong>${reused} of 12</strong><span>tokens reusable in complete 4-token blocks</span></div>`;
      caption.textContent = `${matched} tokens match before divergence; ${reused} tokens fall in complete blocks. ${divergence === 13 ? "No token differs in this example." : "Later unchanged tokens are not part of the reusable prefix."}`;
    } else if (type === "tiers") {
      const location = Number(value("location", 2));
      const labels = [
        "GPU memory",
        "CPU memory",
        "Local storage",
        "Remote cache",
      ];
      visual.innerHTML = `<div class="tier-chain">${labels.map((l, i) => `<div class="tier-node ${step > i && i === location ? "is-current" : ""} ${step > i && i < location ? "tier-miss" : ""}"><span>0${i + 1}</span>${icon(i === 0 ? "chip" : "layers", 24)}<strong>${l}</strong><small>${step > i ? (i < location ? "Miss" : i === location ? "Hit" : "Not checked") : "Await lookup"}</small></div>`).join("")}</div><div class="restore-path">${step === 5 ? (location === 4 ? "No hit → run prefill to recompute KV state" : location === 0 ? "State is already on the GPU → continue generation" : `${labels[location]} → restore to GPU memory → continue generation`) : "Lookup compatible state, then make it available for execution"}</div>`;
      caption.textContent =
        "One illustrative lookup chain. Local and remote tier order is configurable; restore cost can outweigh saved computation.";
    } else if (type === "phases") {
      const prompt = Number(value("prompt", 2048));
      const output = Number(value("output", 32));
      const p = prompt / 512;
      const d = output * 0.2;
      const pw = (p / (p + d)) * 100;
      visual.innerHTML = `<div class="phase-track"><div class="phase-prefill ${step >= 1 ? "phase-active" : ""}" style="flex-basis:${pw}%"><strong>Prefill</strong><span>${prompt.toLocaleString()} prompt tokens</span>${icon("layers", 24)}</div><div class="phase-decode ${step >= 2 ? "phase-active" : ""}" style="flex-basis:${100 - pw}%"><strong>Decode</strong><span>${output} output tokens</span><div class="decode-dots">${Array.from({ length: 8 }, (_, i) => `<i class="${step >= 2 ? "token-visible" : ""}" style="--delay:${i * 80}ms"></i>`).join("")}</div></div></div><div class="phase-labels"><span>Request arrives</span><span>${step >= 2 ? "First token → repeated generation" : "Prompt work comes first"}</span><span>Response ends</span></div>`;
      caption.textContent =
        "Schematic relative work: prompt / 512 and output × 0.2. No measured latency; actual scaling depends on attention, batching, and hardware.";
    } else if (type === "batching") {
      const frames = batchSchedule(choice === "continuous");
      const frame = frames[step - 1] || [null, null];
      visual.innerHTML = `<div class="scheduler-status"><span>DECODE SCHEDULER</span><strong>Iteration ${step} / ${frames.length}</strong></div><div class="batch-slots">${frame.map((r, i) => `<div class="batch-slot ${r ? "is-current" : ""}"><span>Slot ${i + 1}</span><strong>${r ? `Request ${r.id}` : "Idle"}</strong><div class="slot-tokens">${Array.from({ length: 7 }, (_, t) => `<i class="${r && t < r.done ? "token-filled" : ""} ${r && t >= r.length ? "unused-token" : ""}"></i>`).join("")}</div><small>${r ? `${r.done} / ${r.length} output tokens` : "Available for a new request"}</small></div>`).join("")}</div><div class="schedule-history">${frames.map((f, i) => `<div class="${i < step ? "history-done" : ""}"><span>${i + 1}</span>${f.map((r) => `<i>${i < step ? r?.id || "—" : "·"}</i>`).join("")}</div>`).join("")}</div>`;
      caption.textContent =
        "Four waiting requests (A: 3, B: 7, C: 2, D: 4 tokens), two slots. This isolates scheduling; prefill and KV admission are omitted.";
    } else if (type === "distributed") {
      const nodes = [
        ["Router", "Choose healthy workers", "layers"],
        ["Prefill pool", "Process prompt", "chip"],
        ["KV transfer", "Move context state", "layers"],
        ["Decode pool", "Continue generation", "chip"],
      ];
      visual.innerHTML = `<div class="pipeline">${nodes.map(([l, s, i], n) => flowNode(l, s, i, n, step === n + 1, step > n + 1)).join("")}</div><div class="handoff-state"><span>REQUEST STATE</span>${step >= 2 ? '<div class="kv-mini"><i>K</i><i>V</i><i>K</i><i>V</i></div>' : "<span>Prompt awaits processing</span>"}<strong>${["Ready at ingress", "Routing to the prefill pool", "Prompt state created on the prefill worker", "Transferring compatible KV state", "Decode worker reads received state"][step]}</strong></div>`;
      caption.textContent =
        "A schematic disaggregated request. The transfer has a real cost; the pools must use compatible weights and KV layouts.";
    } else if (type === "metrics") {
      const input = Object.fromEntries(
        ["queue", "prefill", "interval", "output"].map((n) => [
          n,
          Number(value(n, 0)),
        ]),
      );
      const m = requestTiming(input);
      const parts = [
        ["Queue", input.queue, "queue"],
        ["Prefill", input.prefill, "weights"],
        ["Network", 50, "workspace"],
        ["Decode", m.decode, "kv"],
      ];
      visual.innerHTML = `<div class="timing-results"><div><span>First token</span><strong>${m.ttft.toLocaleString()} <small>ms</small></strong></div><div><span>Between tokens</span><strong>${input.interval} <small>ms</small></strong></div><div><span>Full response</span><strong>${m.total.toLocaleString()} <small>ms</small></strong></div></div><div class="latency-track">${parts.map(([l, v, c]) => `<div class="${c}" style="flex-grow:${v || 0.001}" aria-label="${l}: ${v} ms"></div>`).join("")}</div><div class="memory-legend">${parts.map(([l, v, c]) => `<span><i class="${c}"></i>${l} <strong>${v.toLocaleString()} ms</strong></span>`).join("")}</div>`;
      caption.textContent =
        "Illustrative timing with a fixed 50 ms network allowance. TTFT = queue + prefill + network; total adds (output tokens − 1) × interval.";
    }
  }
  root.addEventListener("input", (event) => {
    const field = event.target;
    const output = root.querySelector(`[data-value="${field.name}"]`);
    if (output) output.textContent = field.value + (field.dataset.suffix || "");
    draw();
  });
  root.addEventListener("change", () => {
    stop();
    step = 0;
    draw();
  });
  root.addEventListener("click", (event) => {
    const selection = event.target.closest("[data-lab-choice]");
    if (selection) {
      stop();
      choice = selection.dataset.labChoice;
      step = 0;
      root
        .querySelectorAll("[data-lab-choice]")
        .forEach((b) =>
          b.setAttribute("aria-pressed", String(b === selection)),
        );
      draw();
      return;
    }
    const action = event.target.closest("[data-lab-action]")?.dataset.labAction;
    if (!action) return;
    if (action === "reset") {
      stop();
      step = 0;
      draw();
    } else if (action === "step") {
      stop();
      step = step >= maxStep() ? 1 : step + 1;
      draw();
    } else if (timer) stop();
    else {
      if (step >= maxStep()) step = 0;
      root.querySelector('[data-lab-action="play"] span').textContent = "Pause";
      step++;
      draw();
      timer = setInterval(() => {
        step++;
        draw();
        if (step >= maxStep()) stop();
      }, 950);
    }
  });
  draw();
  return stop;
}
