import {
  chooseReplica,
  desiredReplicas,
  eligibleModels,
  planCapacity,
  sloGoodput,
} from "./simulation.js";

const select = (name, label, options, initial = options[0][0]) =>
  `<label class="lab-field"><span>${label}</span><select name="${name}" aria-label="${label}">${options.map(([value, text]) => `<option value="${value}" ${String(value) === String(initial) ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
const range = (name, label, min, max, value, step = 1) =>
  `<label class="lab-field"><span>${label} <output data-value="${name}">${value}</output></span><input type="range" name="${name}" aria-label="${label}" min="${min}" max="${max}" value="${value}" step="${step}"></label>`;
const check = (name, label, initial = false) =>
  `<label class="switch-label"><input type="checkbox" name="${name}" ${initial ? "checked" : ""}>${label}</label>`;
const metrics = (...items) =>
  `<div class="advanced-metrics">${items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>`;
const note = (text) => `<div class="scene-note">${text}</div>`;
const blocks = (items, selected = []) =>
  `<div class="block-grid">${items.map((item, i) => `<div class="memory-block ${item === "Free" ? "free-block" : ""} ${selected.includes(i) ? "is-current" : ""}"><small>Physical ${i}</small><strong>${item}</strong></div>`).join("")}</div>`;
const flow = (nodes, step) =>
  `<div class="advanced-flow">${nodes.map(([title, text], i) => `<div class="scene-node ${step === i + 1 ? "is-current" : ""} ${step > i + 1 ? "is-done" : ""}"><span>${String(i + 1).padStart(2, "0")}</span><strong>${title}</strong><small>${text}</small></div>`).join("")}</div>`;

const configs = {
  stack: {
    controls: select("path", "Execution path", [
      ["gpu", "NVIDIA GPU"],
      ["cpu", "Local CPU"],
    ]),
    stages: (v) => [
      ["Application", "Prompt or workflow"],
      ["Model router", "Select capability"],
      ["Endpoint placement", "Choose serving destination"],
      ["Engine", "Schedule and retain KV"],
      [
        "Runtime",
        v("path") === "gpu"
          ? "Tensor operations / CUDA backend"
          : "CPU backend / native kernels",
      ],
      [
        "Processor",
        v("path") === "gpu" ? "GPU compute + HBM" : "CPU compute + RAM",
      ],
    ],
    caption:
      "Roles, not mandatory separate products. CUDA is specific to supported NVIDIA execution; CPU inference does not pass through it.",
  },
  engine: {
    controls: check("memory", "KV admission available", true),
    stages: (v) => [
      ["API", "Validate request"],
      [
        "Scheduler",
        v("memory")
          ? "Admit work within budgets"
          : "Request waits: insufficient KV capacity",
      ],
      ["Block manager", "Track and allocate state"],
      ["Worker", "Execute model forward pass"],
      ["Sampler", "Select next token"],
      ["Engine", "Stream, update, stop or schedule again"],
    ],
    caption:
      "A repeating logical loop, not a version-specific process diagram. A blocked request waits; other admitted work may continue.",
  },
  experiment: {
    controls: select("variable", "Change one variable", [
      ["prompt", "Prompt length"],
      ["output", "Output length"],
      ["concurrency", "Concurrency"],
    ]),
    stages: (v) => [
      ["Pin system", "Same model, artifact, runtime, hardware"],
      ["Baseline", "Save one reproducible configuration"],
      [
        "Change",
        v("variable") === "prompt"
          ? "128 → 2,048 input tokens; fixed output"
          : v("variable") === "output"
            ? "16 → 128 output tokens; fixed prompt"
            : "1 → 8 clients; fixed input/output mix",
      ],
      ["Run", "Repeat and retain failures"],
      [
        "Measure",
        v("variable") === "prompt"
          ? "TTFT and prefill sensitivity"
          : v("variable") === "output"
            ? "Decode cadence and full response latency"
            : "Queue growth, tails, SLO goodput",
      ],
      ["Compare", "Keep raw traces and conditions"],
    ],
    caption:
      "A test-design demonstration. It runs no server and reports no fabricated benchmark. Stream chunks are not necessarily individual tokens.",
  },
  fleet: {
    controls: select("role", "Serving topology", [
      ["mono", "Monolithic engines"],
      ["split", "Prefill / decode pools"],
    ]),
    stages: (v) => [
      ["Proxy", "Carries the request"],
      ["Endpoint picker", "Filter and score eligible endpoints"],
      ["InferencePool", "Defines the candidate pool"],
      [
        "Model server",
        v("role") === "split"
          ? "Prefill role selected; coordinate decode destination"
          : "One endpoint handles prompt and generation",
      ],
      ["Local engine", "Memory admission and batch scheduling"],
      ["Worker", "Execute and stream response"],
    ],
    caption:
      "The endpoint picker chooses placement; the selected engine executes. The pool is a resource describing endpoints, not another network hop.",
  },
  workbench: {
    controls: check("tunnel", "Private SSH tunnel connected", true),
    stages: (v) => [
      ["Developer machine", "Client and experiment config"],
      [
        "Local port",
        v("tunnel") ? "Bound to loopback" : "No private connection",
      ],
      ["SSH tunnel", "Encrypted transport"],
      ["Private host", "llama.cpp endpoint"],
      ["Model runtime", "Execute fixed model"],
      ["Local results", "Save request traces and manifest"],
    ],
    caption:
      "A topology explanation only: no machine is provisioned, no tunnel is started, and no endpoint is exposed.",
  },
  "nvidia-stack": {
    controls: select("service", "Serving layer", [
      ["nim", "NIM container"],
      ["triton", "Triton-based deployment"],
    ]),
    stages: (v) => [
      ["Model artifacts", "Load from persistent storage"],
      ["GPU system", "HBM stores active weights and state"],
      ["Fabrics", "Scale-up and scale-out where needed"],
      ["Runtime", "Libraries and optimized kernels"],
      [
        "Serving",
        v("service") === "nim"
          ? "NIM packaged model-serving service"
          : "Triton serving with configured backends",
      ],
      ["Application", "Calls the endpoint"],
    ],
    caption:
      "NIM and Triton are alternative serving choices here, not two mandatory consecutive boxes. The flow describes dependencies, not packet order.",
  },
  transfer: {
    controls: range("gib", "KV state to transfer (GiB)", 1, 16, 4),
    bandwidth: true,
    stages: () => [
      ["Ingress", "Select a compatible worker pair"],
      ["Prefill", "Build prompt KV state"],
      ["Control plane", "Coordinate registered buffers and completion"],
      ["Data plane", "Transfer KV tensors"],
      ["Decode", "Read received compatible state"],
      ["Response", "Generate and stream tokens"],
    ],
    caption:
      "Raw bytes ÷ effective bandwidth is only a transfer lower bound. Queueing, coordination, layout conversion and first decode work add latency.",
  },
  rollout: {
    controls: select("strategy", "One-slot cluster rollout", [
      ["surge", "Surge: keep old pod while starting new"],
      ["replace", "Replace: stop old pod first"],
    ]),
    stages: (v) =>
      v("strategy") === "surge"
        ? [
            ["Old pod", "Running; owns the only slot"],
            ["New revision", "Create replacement"],
            ["New pod", "Pending: no spare CPU / memory"],
            ["Placement", "Needs extra capacity"],
            ["Capacity added", "New pod can start"],
            ["Readiness", "Retire old only after new is usable"],
          ]
        : [
            ["Old pod", "Running"],
            ["Stop old", "Release its resources"],
            ["Service gap", "No usable replica"],
            ["New pod", "Fits the freed slot"],
            ["Load model", "Container running is not enough"],
            ["Ready", "Service resumes"],
          ],
    caption:
      "The source CPU lab used maxSurge=0 and maxUnavailable=1 to fit a constrained cluster. This creates a service gap; it is not a high-availability recipe.",
  },
  "cold-start": {
    controls:
      check("node", "Warm node") +
      check("image", "Image pre-pulled") +
      check("weights", "Weights on local NVMe"),
    stages: (v) => [
      [
        "Machine",
        v("node")
          ? "Warm: provision step skipped"
          : "Provision and initialize node",
      ],
      [
        "Container",
        v("image") ? "Image available locally" : "Pull container image",
      ],
      [
        "Model files",
        v("weights")
          ? "Local artifacts available"
          : "Fetch remote model artifacts",
      ],
      ["Tensors", "Deserialize, place weights, initialize workers"],
      ["Engine", "Allocate buffers and warm execution"],
      ["Ready", "Can serve; prefix cache may still be cold"],
    ],
    caption:
      "Warm artifacts remove specific retrieval stages. They do not eliminate tensor initialization or guarantee cached conversation context. No startup durations are predicted.",
  },
};

const customControls = {
  "attention-heads": select(
    "heads",
    "Attention architecture",
    [
      [32, "MHA · 32 KV heads"],
      [8, "GQA · 8 KV heads"],
      [1, "MQA · 1 KV head"],
    ],
    8,
  ),
  paging:
    select("allocation", "Allocation method", [
      ["paged", "Paged allocation"],
      ["contiguous", "Contiguous allocation"],
    ]) + range("tokens", "Sequence tokens", 1, 64, 35),
  quantization:
    select(
      "bits",
      "Idealized weight bits",
      [
        [16, "16-bit"],
        [8, "8-bit"],
        [4, "4-bit"],
      ],
      4,
    ) + range("parameters", "Billions of parameters", 1, 70, 8),
  tensor: select(
    "shards",
    "Tensor-parallel devices",
    [
      [1, "1"],
      [2, "2"],
      [4, "4"],
    ],
    2,
  ),
  pipeline: select(
    "items",
    "Independent work items",
    [
      [1, "1 item"],
      [3, "3 items"],
    ],
    3,
  ),
  parallelism:
    select(
      "tp",
      "TP",
      [
        [1, "1"],
        [2, "2"],
        [4, "4"],
      ],
      2,
    ) +
    select(
      "pp",
      "PP",
      [
        [1, "1"],
        [2, "2"],
        [4, "4"],
      ],
      2,
    ) +
    select(
      "dp",
      "DP replicas",
      [
        [1, "1"],
        [2, "2"],
        [3, "3"],
      ],
      2,
    ),
  network: select("fabric", "Communication domain", [
    ["scaleup", "Within a scale-up domain"],
    ["scaleout", "Between nodes over a supported fabric"],
  ]),
  "cache-routing":
    select("policy", "Placement policy", [
      ["balanced", "Queue + missing prefill"],
      ["cache", "Most cached tokens"],
      ["queue", "Shortest queue"],
    ]) +
    check("evict", "Replica A prefix evicted") +
    select("index", "Cache knowledge", [
      ["precise", "Current cache events"],
      ["stale", "Stale approximate index"],
    ]),
  "conversation-routing":
    check("switch", "Switch to another model") +
    select("state", "Same-model prefix state", [
      ["local", "Local and retained"],
      ["remote", "Remote, transferable"],
      ["miss", "Evicted / not found"],
    ]),
  capacity:
    range("arrival", "Peak requests / second", 1, 40, 12) +
    range("goodput", "Measured safe requests / second / replica", 1, 10, 5) +
    range("replicas", "Warm replicas now", 1, 8, 2) +
    range("startup", "Time to ready (seconds)", 10, 180, 60, 10),
  autoscaling:
    range("active", "Active requests", 1, 24, 8) +
    range("target", "Configured target per replica", 1, 8, 4) +
    select(
      "slots",
      "Available pod slots",
      [
        [1, "1"],
        [2, "2"],
        [4, "4"],
      ],
      1,
    ) +
    select("case", "Recorded workload", [
      ["short", "Short unique prompts"],
      ["long", "Long unique prompts"],
      ["shared", "Shared long prefix"],
      ["output", "Longer output"],
    ]),
  benchmark:
    range("ttft", "TTFT limit (ms)", 100, 1000, 500, 100) +
    range("interval", "Inter-token limit (ms)", 20, 100, 50, 10) +
    select("load", "Arrival model", [
      ["open", "Open loop: keep arrivals coming"],
      ["closed", "Closed loop: wait for completions"],
    ]),
  workflow:
    range("calls", "Required model stages", 2, 7, 5) +
    range("tool", "Tool wait per gap (seconds)", 0, 5, 2) +
    range("probability", "Per-stage target success (%)", 80, 100, 95),
  multimodal:
    select("media", "Input media", [
      ["image", "Image tiles"],
      ["video", "Retained video frames"],
    ]) +
    range("units", "Retained units", 1, 16, 4) +
    check("encoder", "Embedding cache hit") +
    check("prefix", "Compatible KV prefix hit"),
  "routing-policy":
    check("json", "JSON contract required", true) +
    check("tools", "Tool calling required") +
    check("region", "Approved region required", true) +
    select("path", "Attempt policy", [
      ["direct", "Direct"],
      ["cascade", "Quality cascade"],
      ["fallback", "Availability fallback"],
    ]),
  moe: select("token", "Token example", [
    [0, "Token A"],
    [1, "Token B"],
    [2, "Token C"],
  ]),
  decisions:
    select("mode", "Question type", [
      ["independent", "Independent yes/no estimates"],
      ["choice", "Mutually exclusive Choice"],
    ]) +
    range("probability", "Illustrative calibration bin (%)", 10, 90, 80, 10),
  "release-gates":
    check("functional", "Functional checks pass", true) +
    check("quality", "Task-quality checks pass", true) +
    check("performance", "SLO-performance checks pass"),
};
export const advancedLabTypes = Object.freeze([
  ...Object.keys(configs),
  ...Object.keys(customControls),
]);
const calculatorTypes = new Set([
  "attention-heads",
  "parallelism",
  "capacity",
  "benchmark",
  "cache-routing",
]);
export function advancedLabMarkup(type) {
  const config = configs[type];
  return `<div class="lab-controls"><div class="lab-fields">${config?.controls || customControls[type]}${
    config?.bandwidth
      ? select(
          "bandwidth",
          "Effective GiB / second",
          [
            [1, "1"],
            [5, "5"],
            [20, "20"],
          ],
          5,
        )
      : ""
  }</div>${calculatorTypes.has(type) ? "" : '<div class="lab-actions"><button class="button primary" data-scene-action="play" type="button"><span>▶ Play</span></button><button class="button" data-scene-action="step" type="button">Step →</button><button class="button" data-scene-action="reset" type="button">Reset</button></div>'}</div><div class="lab-visual advanced-visual"></div><p class="lab-caption" aria-live="polite"></p>`;
}

export function mountAdvancedLab(root, type) {
  let step = 0;
  let timer = null;
  let max = 6;
  const visual = root.querySelector(".lab-visual");
  const caption = root.querySelector(".lab-caption");
  const v = (name, fallback = "") => {
    const field = root.querySelector(`[name="${name}"]`);
    return field
      ? field.type === "checkbox"
        ? field.checked
        : field.value
      : fallback;
  };
  const n = (name) => Number(v(name));
  const stop = () => {
    clearInterval(timer);
    timer = null;
    const button = root.querySelector('[data-scene-action="play"] span');
    if (button) button.textContent = step >= max ? "↻ Replay" : "▶ Play";
  };
  function draw() {
    let html = "";
    let text = "";
    const config = configs[type];
    if (config) {
      const nodes = config.stages(v);
      max = nodes.length;
      // A blocked engine request cannot advance into execution.
      const shownStep =
        type === "engine" && !v("memory")
          ? Math.min(step, 2)
          : type === "workbench" && !v("tunnel")
            ? Math.min(step, 2)
            : step;
      if (
        (type === "engine" && !v("memory")) ||
        (type === "workbench" && !v("tunnel"))
      )
        max = 2;
      html = flow(nodes, shownStep);
      if (type === "transfer")
        html += metrics(
          [
            "Raw transfer lower bound",
            `${(n("gib") / n("bandwidth")).toFixed(2)} s`,
          ],
          ["Payload", `${n("gib")} GiB`],
        );
      text = config.caption;
    } else if (type === "attention-heads") {
      const heads = n("heads");
      html =
        `<div class="head-groups">${Array.from({ length: heads }, (_, i) => `<div class="head-group ${step ? "is-current" : ""}"><strong>KV ${i + 1}</strong><div>${Array.from({ length: 32 / heads }, (_, q) => `<i>Q${i * (32 / heads) + q + 1}</i>`).join("")}</div></div>`).join("")}</div>` +
        metrics(
          ["Query heads", "32"],
          ["KV heads", heads],
          ["Raw KV at 4,096 tokens", `${(heads / 16).toFixed(3)} GiB`],
        );
      text =
        "32 layers × 128 head dimension × FP16 × K and V × 4,096 tokens, one sequence. GQA groups share KV; query heads still perform attention. Architecture is not a serving toggle.";
    } else if (type === "paging") {
      max = 2;
      const paged = v("allocation") === "paged";
      const allocated = paged && step >= 2;
      html =
        blocks(
          [
            "A",
            "A",
            "A",
            allocated ? "D0" : "Free",
            allocated ? "D1" : "Free",
            allocated ? "D2" : "Free",
            "C",
            "C",
            "C",
            allocated ? "D3" : "Free",
          ],
          allocated ? [3, 4, 5, 9] : [],
        ) +
        note(
          step
            ? paged
              ? "D logical blocks 0 → 1 → 2 → 3 map to physical blocks 3 → 4 → 5 → 9."
              : "Allocation D needs 4 contiguous blocks. Largest free run is 3: request cannot fit despite 4 total free blocks."
            : "A and C occupy memory. D needs four blocks. Step through allocation.",
        ) +
        metrics(
          [
            "Separate tail-waste example",
            `${Math.ceil(n("tokens") / 16)} blocks`,
          ],
          [
            "Unused token slots",
            Math.ceil(n("tokens") / 16) * 16 - n("tokens"),
          ],
        );
      text =
        "The allocation illustration and tail-waste slider are separate examples. Block tables retain logical order; the last 16-token block can still waste space.";
    } else if (type === "quantization") {
      const raw = (n("parameters") * 1e9 * n("bits")) / 8 / 1024 ** 3;
      html =
        metrics(
          ["Ideal raw weight storage", `${raw.toFixed(2)} GiB`],
          ["Precision", `${n("bits")} bits`],
        ) +
        `<div class="quantization-bars">${[16, 8, 4].map((bits) => `<div><span>${bits}-bit</span><i style="width:${(bits / 16) * 100}%" class="${bits === n("bits") ? "selected-bar" : ""}"></i></div>`).join("")}</div>` +
        flow(
          [
            ["GGUF", "Tensors + metadata"],
            ["Backend", "Supported CPU / accelerator execution"],
            ["Runtime memory", "Weights + KV + workspaces"],
            ["Task evaluation", "Check quality on representative inputs"],
          ],
          step,
        );
      text =
        "Idealized bits arithmetic only. GGUF formats use mixed tensor precision, scales and metadata; real file and runtime footprints differ. This is not a speed or quality prediction.";
      max = 4;
    } else if (type === "tensor") {
      max = 4;
      const devices = n("shards");
      html =
        `<div class="shard-grid">${Array.from({ length: devices }, (_, i) => `<div class="scene-node ${step >= 2 ? "is-current" : ""}"><span>GPU ${i + 1}</span><strong>Rows ${(i * 4) / devices + 1}–${((i + 1) * 4) / devices}</strong><div class="matrix-grid">${Array.from({ length: 16 / devices }, (_, j) => `<i>${(i * 16) / devices + j + 1}</i>`).join("")}</div><small>${step >= 3 ? `Partial sum: ${Array.from({ length: 4 / devices }, (_, j) => (i * 4) / devices + j + 1).reduce((a, b) => a + b, 0)}` : "Local shard waits for input"}</small></div>`).join("")}</div>` +
        note(
          step >= 4
            ? "SUM ALL-REDUCE → result 10 available on every participating GPU."
            : "Illustrative operation: sum row contributions [1, 2, 3, 4].",
        ) +
        metrics(
          ["Weight shard fraction", `1 / ${devices}`],
          ["Logical replicas", "1"],
        );
      text =
        "A toy row-partitioned reduction explains partial work and synchronization; real transformer operations use different partition and collective patterns. Buffers or tensors can remain replicated.";
    } else if (type === "pipeline") {
      const items = n("items");
      max = 4 + items - 1;
      html =
        `<div class="pipeline-grid">${Array.from(
          { length: 4 },
          (_, stage) =>
            `<div class="pipeline-lane"><strong>Stage ${stage + 1}<small>Layers ${stage * 20 + 1}–${stage * 20 + 20}</small></strong>${Array.from(
              { length: max },
              (_, time) => {
                const item = time - stage;
                return `<i class="${time < step && item >= 0 && item < items ? "pipeline-work" : ""} ${time === step - 1 ? "time-current" : ""}">${time < step && item >= 0 && item < items ? String.fromCharCode(65 + item) : "·"}</i>`;
              },
            ).join("")}</div>`,
        ).join("")}</div>` +
        metrics(
          ["Forward ticks", max],
          ["Occupied cells", 4 * items],
          ["Total stage cells", 4 * max],
        );
      text =
        "A four-stage forward pipeline with independent items. Empty cells are bubbles. Autoregressive feedback and realistic prefill/decode schedules are intentionally omitted.";
    } else if (type === "parallelism") {
      html =
        `<div class="replica-grid">${Array.from({ length: n("dp") }, (_, replica) => `<div class="replica-box"><strong>Replica ${replica + 1} · own scheduler & KV</strong>${Array.from({ length: n("pp") }, (_, stage) => `<div class="topology-stage"><span>PP ${stage + 1}</span>${Array.from({ length: n("tp") }, (_, gpu) => `<i class="${step ? "is-current" : ""}">GPU ${replica * n("pp") * n("tp") + stage * n("tp") + gpu + 1}</i>`).join("")}</div>`).join("")}</div>`).join("")}</div>` +
        metrics(
          ["GPUs / replica", n("tp") * n("pp")],
          ["Total GPUs", n("tp") * n("pp") * n("dp")],
        );
      text =
        "Simple TP × PP × DP topology. Devices inside one replica cooperate; independent replicas do not share their local KV state automatically.";
    } else if (type === "network") {
      html =
        `<div class="collective-grid">${[1, 2, 3, 4].map((input, i) => `<div class="scene-node ${step ? "is-current" : ""}"><span>GPU ${i + 1}</span><strong>${step >= 4 ? "10" : input}</strong><small>${step >= 4 ? "Combined result received" : "Local contribution"}</small></div>`).join("")}</div>` +
        flow(
          [
            ["Collective", "NCCL sum all-reduce"],
            [
              "Transport",
              v("fabric") === "scaleup"
                ? "Supported NVLink / NVSwitch domain"
                : "Supported scale-out fabric / RDMA path",
            ],
            ["Combine", "1 + 2 + 3 + 4 = 10"],
            ["Distribute", "All participants receive 10"],
          ],
          step,
        );
      max = 4;
      text =
        "A logical all-reduce, not a ring implementation trace. NCCL is software; the fabric is transport. No bandwidth or performance claim is made.";
    } else if (type === "cache-routing") {
      const actual = [
        {
          id: "A",
          queue: 600,
          cached: v("evict") ? 0 : 1000,
          compatible: true,
        },
        { id: "B", queue: 20, cached: 500, compatible: true },
        { id: "C", queue: 0, cached: 1000, compatible: false },
      ];
      const observed = actual.map((r) =>
        r.id === "A" && v("index") === "stale" ? { ...r, cached: 1000 } : r,
      );
      const { ranked, chosen } = chooseReplica(observed, v("policy"));
      const reality = actual.find((r) => r.id === chosen.id);
      html =
        `<div class="replica-grid">${actual.map((r) => `<div class="scene-node ${chosen.id === r.id ? "is-current" : ""} ${!r.compatible ? "ineligible-node" : ""}"><span>Replica ${r.id}</span><strong>${r.cached} cached tokens</strong><small>Queue ${r.queue} ms · ${r.compatible ? "compatible" : "wrong model: excluded"}</small></div>`).join("")}</div>` +
        metrics(
          ["Chosen endpoint", chosen.id],
          ["Index estimate", `${ranked[0].estimate} ms`],
          [
            "Toy actual path",
            `${reality.queue + (1000 - reality.cached) * 0.5} ms`,
          ],
        );
      text =
        "Synthetic 1,000-token prefix; missing-token work costs 0.5 ms/token, queue estimates given. Eviction plus a stale index can mislead routing. Compatibility is a hard gate, not a soft score.";
    } else if (type === "conversation-routing") {
      const switched = v("switch"),
        state = v("state");
      html =
        flow(
          [
            ["New turn", "History + latest message"],
            [
              "Model decision",
              switched
                ? "Switch model: incompatible KV"
                : "Keep model: check compatible state",
            ],
            [
              "Placement",
              switched
                ? "New model deployment"
                : state === "local"
                  ? "Original warm replica"
                  : state === "remote"
                    ? "Remote state owner / transfer path"
                    : "Replica without retained prefix",
            ],
            [
              "Prompt work",
              switched || state === "miss"
                ? "Recompute visible history"
                : state === "remote"
                  ? "Restore compatible KV + process new suffix"
                  : "Reuse prefix + process new suffix",
            ],
            ["Decode", "Generate new response"],
          ],
          step,
        ) +
        note(
          switched
            ? "Model switching is not KV transfer. Text history can be replayed; unrelated model tensors cannot simply be reused."
            : state === "remote"
              ? "Compare transfer cost with recomputation and queueing."
              : state === "miss"
                ? "Same model alone does not guarantee a cache hit."
                : "Affinity creates an opportunity, not indefinite cache retention.",
        );
      max = 5;
      text =
        "Path comparison only. No invented model-quality scores or price estimates; use evaluated task requirements to decide whether switching is worth it.";
    } else if (type === "capacity") {
      const result = planCapacity({
        arrival: n("arrival"),
        goodput: n("goodput"),
        replicas: n("replicas"),
        startup: n("startup"),
      });
      html =
        metrics(
          ["Minimum warm replicas", result.minimum],
          ["Simple N+1 target", result.nPlusOne],
          ["Backlog during startup", `${result.backlog} requests`],
        ) +
        `<div class="capacity-grid">${Array.from({ length: result.nPlusOne }, (_, i) => `<div class="scene-node ${i < n("replicas") ? "is-current" : ""}"><span>Replica ${i + 1}</span><strong>${i < n("replicas") ? "Warm now" : "Capacity needed"}</strong><small>${i < result.minimum ? "Demand capacity" : "One-replica reserve"}</small></div>`).join("")}</div>`;
      text =
        "Minimum = ceil(peak arrival / measured safe per-replica goodput). Backlog = max(0, arrival − current service) × startup. Assumes independent equal replicas and no spare-demand loss; node allocatable capacity, bursts, failure domains and drain time need separate checks.";
    } else if (type === "autoscaling") {
      const desired = desiredReplicas(n("active"), n("target")),
        pending = Math.max(0, desired - n("slots"));
      const cases = {
        short: ["144 ms", "~34 ms", "41.5 tok/s"],
        long: ["764 ms", "~36 ms", "32.4 tok/s"],
        shared: ["172 ms", "~36.5 ms", "39.9 tok/s"],
        output: ["146 ms", "~35.6 ms", "41.7 tok/s"],
      };
      html =
        metrics(["Desired replicas", desired], ["Initially Pending", pending]) +
        flow(
          [
            ["Demand", `${n("active")} active / target ${n("target")}`],
            ["KEDA / HPA", `Request ${desired} pods`],
            [
              "Scheduler",
              pending
                ? `${pending} pod(s) cannot fit`
                : "Existing node capacity sufficient",
            ],
            [
              "Node capacity",
              pending
                ? "Autoscaler adds eligible capacity"
                : "No node scale-out needed",
            ],
            ["Model readiness", "Load and initialize engine"],
            ["Usable replicas", "Serve requests; cache warms over time"],
          ],
          step,
        ) +
        `<div class="case-observation"><strong>Recorded source lab · not a prediction</strong>${metrics(["p95 TTFT", cases[v("case")][0]], ["Approx. chunk cadence", cases[v("case")][1]], ["Output throughput", cases[v("case")][2]])}${v("case") === "shared" ? "<small>~53% prefix-cache hits</small>" : ""}${v("case") === "output" ? "<small>p95 end-to-end latency ~16 seconds</small>" : ""}</div>`;
      text =
        "The configured active-request target drives this simplified replica calculation. It is not a measured safe-capacity result. Changing the sliders does not alter the recorded case-study measurements.";
    } else if (type === "benchmark") {
      const traces = [
        { ttft: 120, interval: 30, success: true },
        { ttft: 260, interval: 45, success: true },
        { ttft: 710, interval: 35, success: true },
        { ttft: 340, interval: 90, success: true },
        { ttft: 220, interval: 40, success: false },
        { ttft: 850, interval: 80, success: true },
      ];
      const result = sloGoodput(traces, n("ttft"), n("interval"), 10);
      html =
        `<div class="trace-chart">${traces.map((t, i) => `<div><span>R${i + 1}</span><i style="width:${t.ttft / 10}%" class="${t.success && t.ttft <= n("ttft") && t.interval <= n("interval") ? "trace-pass" : "trace-fail"}"></i><small>${t.ttft} ms / ${t.interval} ms ${t.success ? "" : "failed"}</small></div>`).join("")}</div>` +
        metrics(
          ["Completed", `${result.completed}/6`],
          ["SLO-passing", `${result.passed}/6`],
          ["Goodput over 10 s", `${result.goodput.toFixed(1)} req/s`],
        ) +
        note(
          v("load") === "open"
            ? "Open-loop generator sends arrivals without waiting. Overload can grow the queue."
            : "Closed-loop clients wait for completion before replacing work. Slower responses reduce offered load.",
        );
      text =
        "Six fixed synthetic request traces over ten seconds. Arrival mode explains the generator; it does not recompute this illustrative sample. A tiny sample is not adequate p99 evidence.";
    } else if (type === "workflow") {
      const calls = n("calls"),
        waits = (calls - 1) * n("tool");
      max = calls * 2 - 1;
      const nodes = Array.from({ length: max }, (_, i) =>
        i % 2 === 0
          ? [`Model call ${i / 2 + 1}`, "Illustrative 1 s inference"]
          : [
              `Tool wait ${(i + 1) / 2}`,
              `${n("tool")} s · GPU may serve other work`,
            ],
      );
      html =
        flow(nodes, step) +
        metrics(
          ["Task time", `${calls + waits} s`],
          ["Inference time", `${calls} s`],
          [
            "All stages meet target",
            `${(100 * (n("probability") / 100) ** calls).toFixed(1)}%`,
          ],
        );
      text =
        "Toy serial workflow: one second per model stage, tool gaps configured above. Probability multiplication assumes independent stage events. Parallelism, retries and growing prefill are not included in the numbers.";
    } else if (type === "multimodal") {
      html =
        `<div class="media-units">${Array.from({ length: n("units") }, (_, i) => `<div class="media-unit ${step ? "is-current" : ""}"><span>${v("media") === "video" ? "▸" : "▧"}</span><small>${v("media") === "video" ? "Frame" : "Tile"} ${i + 1}</small></div>`).join("")}</div>` +
        flow(
          [
            [
              "Fetch / prepare",
              `${n("units")} retained ${v("media") === "video" ? "frames" : "tiles"}`,
            ],
            [
              "Encoder",
              v("encoder")
                ? "Reuse compatible embedding"
                : "Encode media representations",
            ],
            [
              "LLM prefill",
              v("prefix")
                ? "Reuse compatible prefix + process suffix"
                : "Process effective multimodal prompt",
            ],
            ["Decode", "Generate response"],
          ],
          step,
        ) +
        note(
          "Embedding cache and KV cache are independent checks at different stages. Reducing media can remove evidence, not just work.",
        );
      max = 4;
      text =
        "Common embedding-insertion schematic. Unit count is not a predicted visual-token count. Resamplers and cross-attention architectures need their own memory and execution accounting.";
    } else if (type === "routing-policy") {
      const models = [
        { id: "Small", json: true, tools: false, region: true },
        { id: "General", json: true, tools: true, region: true },
        { id: "External", json: true, tools: true, region: false },
      ];
      const eligible = eligibleModels(models, {
        json: v("json"),
        tools: v("tools"),
        region: v("region"),
      });
      html =
        `<div class="replica-grid">${models.map((m) => `<div class="scene-node ${eligible.includes(m) ? "is-current" : "ineligible-node"}"><span>${m.id}</span><strong>${eligible.includes(m) ? "Eligible" : "Excluded"}</strong><small>JSON ${m.json ? "✓" : "—"} · Tools ${m.tools ? "✓" : "—"} · Region ${m.region ? "✓" : "—"}</small></div>`).join("")}</div>` +
        flow(
          v("path") === "direct"
            ? [
                ["Hard gates", "Required contracts"],
                ["Rank eligible", "Evaluated quality / policy"],
                ["One attempt", "Chosen destination"],
              ]
            : v("path") === "cascade"
              ? [
                  ["Hard gates", "Required contracts"],
                  ["First answer", "Earlier eligible model"],
                  ["Quality check", "Task-specific rejection"],
                  ["Escalate", "Another eligible model"],
                ]
              : [
                  ["Hard gates", "Required contracts"],
                  ["Preferred route", "Unavailable / request fails"],
                  ["Fallback", "Healthy eligible deployment"],
                ],
          step,
        );
      max = v("path") === "cascade" ? 4 : 3;
      text =
        "Illustrative capabilities, not real provider rankings. Cascade escalation responds to answer evaluation; fallback responds to availability or failure. A cheaper destination never bypasses mandatory gates.";
    } else if (type === "moe") {
      const scores = [
        [0.05, 0.1, 0.55, 0.06, 0.08, 0.09, 0.04, 0.03],
        [0.04, 0.07, 0.09, 0.05, 0.15, 0.48, 0.08, 0.04],
        [0.36, 0.06, 0.05, 0.31, 0.08, 0.04, 0.06, 0.04],
      ][n("token")];
      const selected = scores
        .map((score, i) => ({ score, i }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
      const sum = selected.reduce((s, e) => s + e.score, 0);
      html =
        `<div class="expert-grid">${scores.map((score, i) => `<div class="scene-node ${selected.some((e) => e.i === i) && step >= 2 ? "is-current" : ""}"><span>Expert ${i + 1}</span><strong>${score.toFixed(2)}</strong><small>Example gate score</small></div>`).join("")}</div>` +
        flow(
          [
            ["Token representation", "Inside an MoE layer"],
            ["Gate", "Select top 2 experts"],
            ["Dispatch", "Move to expert devices if needed"],
            [
              "Combine",
              selected
                .map((e) => `E${e.i + 1}: ${(e.score / sum).toFixed(2)}`)
                .join(" · "),
            ],
            ["Continue", "Next model layer"],
          ],
          step,
        );
      max = 5;
      text =
        "Hypothetical scores and normalized selected weights. The application chooses the model; the internal gate chooses experts for token computation. Selected experts still need memory and potentially communication.";
    } else if (type === "decisions") {
      const independent = v("mode") === "independent";
      html =
        metrics(
          independent ? ["Event A yes", "0.80"] : ["Choice A", "0.70"],
          independent ? ["Event B yes", "0.65"] : ["Choice B", "0.20"],
          independent ? ["Sum need not be 1", "1.45"] : ["Choice C", "0.10"],
        ) +
        flow(
          [
            ["Evidence", "Supplied state and criteria"],
            [
              "Model judgment",
              independent
                ? "Separate yes-probability estimates"
                : "One mutually exclusive distribution",
            ],
            ["Code", "Arithmetic and approved policy"],
            ["Shadow result", "Compare with outcomes; no live action"],
          ],
          step,
        ) +
        `<div class="calibration-grid">${Array.from({ length: 20 }, (_, i) => `<i class="${i < (20 * n("probability")) / 100 ? "calibration-yes" : ""}">${i < (20 * n("probability")) / 100 ? "✓" : "·"}</i>`).join("")}</div>` +
        note(
          `Calibration illustration: ${n("probability")}% bin → about ${(20 * n("probability")) / 100} events in 20 comparable cases. These dots are constructed, not measured validation data.`,
        );
      max = 4;
      text =
        "Fictional estimates. The app calls no decision service and performs no financial, security or consequential action. Confidence concentration does not prove correctness.";
    } else if (type === "release-gates") {
      const pass = v("functional") && v("quality") && v("performance");
      html =
        `<div class="gate-grid">${[
          ["functional", "Function"],
          ["quality", "Task quality"],
          ["performance", "SLO performance"],
        ]
          .map(
            ([key, label]) =>
              `<div class="scene-node ${v(key) ? "is-done" : "gate-fail"}"><span>${label}</span><strong>${v(key) ? "PASS" : "HOLD"}</strong><small>Independent requirement</small></div>`,
          )
          .join("")}</div>` +
        flow(
          [
            ["Pinned candidate", "Exact image + model/config"],
            ["Tests", "Same controlled baseline and workload"],
            ["Reports", "Raw traces and task results retained"],
            [
              "Release gate",
              pass
                ? "All three requirements pass"
                : "Stop promotion; inspect failed evidence",
            ],
            [
              "Canary",
              pass
                ? "Limited rollout + rollback conditions"
                : "Blocked; no deployment performed",
            ],
            [
              "Expand",
              pass
                ? "Only after canary validation"
                : "Remain on known-good release",
            ],
          ],
          pass ? step : Math.min(step, 4),
        ) +
        note(
          pass
            ? "Simulation permits the canary path; it does not deploy anything."
            : "Faster throughput cannot compensate for a failed functional, quality, or latency requirement.",
        );
      text =
        "A proposed CI workflow inspired by the source article. Absolute targets and regression comparisons need explicit policy; test results do not promote an image automatically.";
    }
    visual.innerHTML = html;
    caption.textContent = text;
    root.dataset.sceneStep = String(step);
  }
  root.addEventListener("input", (event) => {
    const out = root.querySelector(`[data-value="${event.target.name}"]`);
    if (out) out.textContent = event.target.value;
    stop();
    step = 0;
    draw();
  });
  root.addEventListener("change", () => {
    stop();
    step = 0;
    draw();
  });
  root.addEventListener("click", (event) => {
    const action = event.target.closest("[data-scene-action]")?.dataset
      .sceneAction;
    if (!action) return;
    if (action === "reset") {
      stop();
      step = 0;
      draw();
    } else if (action === "step") {
      stop();
      step = step >= max ? 1 : step + 1;
      draw();
    } else if (timer) stop();
    else {
      if (step >= max) step = 0;
      step++;
      draw();
      root.querySelector('[data-scene-action="play"] span').textContent =
        "Ⅱ Pause";
      timer = setInterval(() => {
        step++;
        draw();
        if (step >= max) stop();
      }, 850);
    }
  });
  draw();
  return stop;
}
