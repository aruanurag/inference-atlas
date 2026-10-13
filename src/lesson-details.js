// Standalone teaching material, adapted from the imported author archive.
// Numeric examples are explicit teaching assumptions unless identified as source observations.
const p = (text) => ({ type: "paragraph", text });
const list = (...items) => ({ type: "list", items });
const steps = (...items) => ({ type: "steps", items });
const table = (headers, rows) => ({ type: "table", headers, rows });
const formula = (label, expression, explanation) => ({
  type: "formula",
  label,
  expression,
  explanation,
});
const code = (label, text, note) => ({ type: "code", label, text, note });
const flow = (...nodes) => ({ type: "flow", nodes });
const image = (path, alt, caption) => ({ type: "image", path, alt, caption });
const chapter = (title, summary, ...blocks) => ({ title, summary, blocks });
const example = (title, ...blocks) => ({ title, blocks });
const guide = (goals, terms, chapters, worked, practice, mistakes) => ({
  goals,
  terms,
  chapters,
  worked,
  practice,
  mistakes,
});

export const lessonDetails = {
  "what-is-inference": guide(
    [
      "Explain what a trained model does when it receives new input.",
      "Distinguish model computation from the surrounding serving system.",
      "Trace why a generated answer is not automatically a verified answer.",
    ],
    [
      [
        "Parameter / weight",
        "A learned numerical value retained between ordinary requests.",
      ],
      [
        "Token",
        "A unit defined by a model’s tokenizer; it is not necessarily a whole word.",
      ],
      ["Context", "The input tokens available for the current prediction."],
      ["Logits", "The model’s unnormalized scores for possible next tokens."],
    ],
    [
      chapter(
        "From text to a prediction",
        "The model performs numerical computation; the interface turns that computation into a conversation.",
        p(
          "A tokenizer converts input text into token IDs. The model turns those IDs into internal representations and runs its learned operations. For ordinary autoregressive text generation, the output at the end of the sequence is a set of scores over possible next tokens. A decoding policy then selects a token. The new token is appended and the process repeats.",
        ),
        flow(
          "Text → token IDs",
          "Model forward pass",
          "Next-token scores",
          "Token selection",
          "Append and repeat",
        ),
        p(
          "The model does not usually compose the whole response first and then reveal it. Each new prediction depends on the prompt and the output already generated. Streaming exposes this incremental process to the user. An application may buffer several tokens into a network chunk, so a visible chunk is not always one token.",
        ),
      ),
      chapter(
        "What stays fixed and what grows",
        "Weights are reused; the current request’s state changes.",
        table(
          ["Resource", "During an ordinary request", "Between requests"],
          [
            [
              "Weights",
              "Read to calculate predictions",
              "Usually retained until a model/version changes",
            ],
            [
              "Context",
              "Prompt plus generated tokens grows",
              "A later turn can replay or reuse a compatible prefix",
            ],
            [
              "KV state",
              "Created for processed tokens and extended",
              "Retention and reuse depend on engine/cache policy",
            ],
            [
              "Output",
              "New tokens are selected and streamed",
              "The application may store the response",
            ],
          ],
        ),
        p(
          "A model remembering a fact inside this conversation means that the fact is available in its input, not that its weights have been permanently updated. Retrieval adds external evidence to that input; tools can obtain fresh information. Neither is the same as training.",
        ),
      ),
      chapter(
        "Inference is only one part of a useful application",
        "Correctness, latency, and safe behavior need surrounding design.",
        p(
          "A serving system accepts requests, applies limits, places work, manages memory, schedules computation, streams output, and handles stopping or cancellation. A fluent answer can be factually wrong or fail an application’s output contract. Useful evaluation asks whether the complete task was successful, not only whether the server returned HTTP 200.",
        ),
        list(
          "Check answers against supplied evidence or task-specific expected outcomes.",
          "Measure how soon output starts and how smoothly it continues.",
          "Keep input size, output limits, concurrency, and failures visible when comparing systems.",
        ),
      ),
    ],
    example(
      "A tiny response, one decision at a time",
      table(
        ["Iteration", "Available context", "Illustrative selected token"],
        [
          ["1", "“The capital of France is”", "“ Paris”"],
          ["2", "Prompt + “ Paris”", "“.”"],
          ["3", "Prompt + “ Paris.”", "End-of-sequence token"],
        ],
      ),
      p(
        "These are illustrative token boundaries, not the output of a particular tokenizer. The model’s learned weights are unchanged across all three iterations. The selected answer still needs checking if factual accuracy matters.",
      ),
    ),
    [
      "Step through the request explorer and identify the point where the first output appears.",
      "Explain which state changes after another token is selected.",
      "Describe one check an application should perform beyond receiving an answer.",
    ],
    [
      "Treating a token as always one word.",
      "Assuming a chat message retrains the model.",
      "Equating plausible text or a successful API call with a correct task outcome.",
    ],
  ),

  "training-vs-inference": guide(
    [
      "Separate forward computation, gradient calculation, and parameter updates.",
      "Explain why training and inference have different memory budgets.",
      "Distinguish context, retrieval, fine-tuning, and model loading.",
    ],
    [
      ["Forward pass", "Compute outputs using the current parameters."],
      [
        "Gradient",
        "A derivative used to determine how parameters should change.",
      ],
      ["Optimizer", "The update rule and its supporting state."],
      [
        "Fine-tuning",
        "Training an existing model, sometimes updating only selected parameters.",
      ],
    ],
    [
      chapter(
        "The same model can perform different jobs",
        "The purpose of the computation determines whether weights are updated.",
        table(
          ["Question", "Training / fine-tuning", "Ordinary inference"],
          [
            [
              "Objective",
              "Improve a learning objective",
              "Produce an output for new input",
            ],
            ["Forward pass", "Yes", "Yes"],
            [
              "Backward pass",
              "Normally required to obtain gradients",
              "Not needed for ordinary generation",
            ],
            ["Parameter update", "Yes, for trainable parameters", "No"],
            [
              "Persistent result",
              "Changed parameters / adapters",
              "Usually application history or output, not changed weights",
            ],
          ],
        ),
        p(
          "Inference can use sampling, retrieval, tools, or a long conversation without becoming training. Conversely, an update to a small adapter is still training even if the base weights remain frozen. The distinction is the optimization step, not whether the application looks like chat.",
        ),
      ),
      chapter(
        "Why memory planning differs",
        "Inference drops training-specific state but retains request state.",
        p(
          "Training may retain activations for backward computation and allocate gradients and optimizer state. Inference usually does not need those training allocations, but still needs weights, attention state, temporary workspaces, execution buffers, and runtime overhead. Long context and many active sequences can make inference memory substantial.",
        ),
        list(
          "Do not use a training memory estimate as an inference requirement without checking its components.",
          "Do not assume that eliminating gradients makes the model’s weight file the whole memory budget.",
          "Parameter-efficient training can reduce trainable state; its budget still differs from a serving process.",
        ),
      ),
      chapter(
        "Four operations that are often confused",
        "Changing an input, loading artifacts, and learning are separate events.",
        table(
          ["Operation", "What changes?", "Does it normally update weights?"],
          [
            ["Add conversation history", "Input context", "No"],
            ["Retrieve a document", "Evidence in the prompt", "No"],
            [
              "Load a different model version",
              "Parameters used by the process",
              "No learning is performed by loading",
            ],
            ["Fine-tune an adapter", "Trainable adapter parameters", "Yes"],
          ],
        ),
        p(
          "A deployment can mix these operations over time: train or fine-tune offline, package a versioned artifact, load it into a serving engine, and then run many inference requests. Keeping the boundaries explicit makes capacity, reproducibility, and rollback easier to reason about.",
        ),
      ),
    ],
    example(
      "Why an 8B weight estimate is not a training budget",
      formula(
        "Ideal FP16 weights",
        "8 × 10⁹ parameters × 2 bytes = 16 GB ≈ 14.90 GiB",
        "This is raw weight storage only. A training job adds its own gradients, optimizer state, and saved activations; an inference job adds KV state and runtime buffers.",
      ),
      p(
        "A follow-up message changes the context presented to the serving engine. It does not create an optimizer step or make a new checkpoint.",
      ),
    ),
    [
      "Switch the explorer between inference and training.",
      "Identify the resource categories that appear only on the training path.",
      "Explain why a model can use a retrieved document without learning it permanently.",
    ],
    [
      "Calling retrieval or prompt editing “fine-tuning.”",
      "Assuming model download or weight loading is itself training.",
      "Copying a training GPU requirement into an inference deployment plan.",
    ],
  ),

  "request-lifecycle": guide(
    [
      "Locate queueing, prompt processing, first token, and subsequent generation.",
      "Separate fleet placement from the engine’s local admission decision.",
      "Explain resource release on completion or cancellation.",
    ],
    [
      [
        "Admission",
        "Allowing a request to enter execution under current budgets.",
      ],
      [
        "Scheduler",
        "The engine component that chooses work for the next iteration.",
      ],
      ["Prefill", "Process input tokens and establish their attention state."],
      ["Decode", "Repeatedly calculate and select new output tokens."],
    ],
    [
      chapter(
        "Before the model runs",
        "The endpoint may be healthy while a request still waits.",
        steps(
          "Receive and authenticate the request; validate its format, model, and limits.",
          "Build the effective prompt using the model’s chat template, history, and supplied evidence.",
          "Select an eligible deployment and serving endpoint.",
          "Queue until the engine can admit the work within token, sequence, and KV-memory budgets.",
        ),
        p(
          "A router choosing an endpoint does not reserve unlimited execution capacity there. The engine still has its own waiting work, batch schedule, and memory manager. Network time and queueing can therefore dominate user-visible delay even when model computation is unchanged.",
        ),
      ),
      chapter(
        "The execution loop",
        "Prompt work comes first; generation repeatedly extends the sequence.",
        flow(
          "Check reusable prefix",
          "Prefill uncached input",
          "Produce first token",
          "Decode next token",
          "Update state / stop",
        ),
        p(
          "With compatible retained KV blocks, the engine may reuse a leading prefix and only prefill the missing suffix. Without a hit, the prompt is processed again. Decode then consumes the available context state to produce later tokens. The first output marks the end of the initial wait, not the end of the request.",
        ),
        p(
          "Streaming should be understood at the client boundary. A token may be generated before it is delivered, and transport buffering can group tokens. End-to-end tracing is the way to assign delay to the correct stage.",
        ),
      ),
      chapter(
        "Stopping is a resource-management event",
        "A completed or abandoned request should not keep consuming capacity indefinitely.",
        list(
          "Stop conditions can include an end token, output limit, stop sequence, or cancellation.",
          "Release active sequence references and execution reservations when appropriate.",
          "Reusable prefix blocks may remain cached according to policy; released execution state and cached reusable state are not the same thing.",
          "Track disconnects and errors so a success-only chart does not hide wasted work.",
        ),
        p(
          "A multi-device replica follows the same logical lifecycle, but workers communicate inside its model-serving unit. A disaggregated deployment adds a KV-transfer dependency between prefill and decode workers.",
        ),
      ),
    ],
    example(
      "Account for the first and last token",
      formula(
        "Teaching request",
        "Queue 200 ms + prefill 400 ms + network allowance 50 ms = TTFT 650 ms",
        "Sixteen output tokens at a 40 ms interval add fifteen intervals after the first token.",
      ),
      formula(
        "Full response",
        "650 + (16 − 1) × 40 = 1,250 ms",
        "These are assigned example durations, not measured hardware performance.",
      ),
    ),
    [
      "Step to the first output and identify what happened before it.",
      "Explain where an endpoint-selection policy and a local scheduler act.",
      "Describe what should happen if the client cancels halfway through generation.",
    ],
    [
      "Measuring only GPU compute and calling it user latency.",
      "Counting sixteen post-first-token intervals for a sixteen-token output.",
      "Treating cache retention as a guarantee that every later turn will be warm.",
    ],
  ),

  "kv-cache-basics": guide(
    [
      "Explain what keys and values retain and what remains to be computed.",
      "Understand why context growth consumes memory.",
      "Distinguish within-request caching from cross-request prefix reuse.",
    ],
    [
      [
        "K / V",
        "Attention keys and values produced for processed tokens at model layers.",
      ],
      [
        "Causal attention",
        "A token’s computation uses preceding context rather than future output.",
      ],
      [
        "Prefix",
        "The leading sequence of tokens shared by compatible requests.",
      ],
      [
        "Cache residency",
        "Whether useful state is still present at a reachable location.",
      ],
    ],
    [
      chapter(
        "What computation the cache saves",
        "Retained state is an intermediate result, not a saved answer.",
        p(
          "In attention, the model forms queries, keys, and values from token representations. Keys help determine which earlier positions are relevant; values provide information to combine. For an autoregressive request, previously processed tokens already have their K/V state. Keeping that state avoids repeatedly recreating it when the next token is processed.",
        ),
        p(
          "The new token still needs its own model computation. Its attention can still read many previous keys and values. KV caching therefore does not make old context free, remove the attention operation, or turn generation into a lookup of the complete answer.",
        ),
        table(
          ["With retained KV", "Without retained KV"],
          [
            [
              "Reuse earlier tokens’ K/V state",
              "Recreate relevant earlier-token state as work repeats",
            ],
            [
              "Compute the new position and attend to context",
              "Repeat additional computation for the growing prefix",
            ],
            [
              "Pay memory to save repeated computation",
              "Use less persistent cache but more repeated work in this simplified comparison",
            ],
          ],
        ),
      ),
      chapter(
        "Why the cache grows",
        "Each retained token occupies state across model layers.",
        p(
          "The prompt establishes a starting context. Every generated token can extend the retained sequence. Multiple active requests each contribute state unless compatible blocks are physically shared. Longer prompts, longer outputs, and more concurrent work therefore compete for the same memory budget.",
        ),
        p(
          "The exact footprint depends on layers, KV-head count, head dimension, dtype, and attention architecture. A model with grouped-query attention can retain fewer KV heads than its number of query heads. The Level 200 budget explains the arithmetic; the foundational rule is that users and tokens matter alongside model size.",
        ),
      ),
      chapter(
        "One request versus many requests",
        "Reusing a repeated prompt adds compatibility and lifetime requirements.",
        p(
          "The same basic intermediate state supports two different reuse scopes. Keeping state while one request generates is part of its active execution. Retaining eligible prefixes after completion adds a cache policy that competes for memory with future requests. A serving engine can therefore support ordinary KV caching without guaranteeing cross-request hits.",
        ),
        list(
          "Within one active request, retained state supports later decode iterations.",
          "Across separate requests, automatic prefix caching can reuse compatible leading blocks that still exist.",
          "Similar meanings are insufficient: token sequence and relevant model/adapter/media identity must match.",
          "Moving to another replica or model can require transfer or recomputation.",
          "Eviction and resource policy determine how long a finished request’s useful prefix remains available.",
        ),
      ),
    ],
    example(
      "A five-token prompt grows during generation",
      table(
        [
          "Moment",
          "Retained context in this simplified example",
          "What is new?",
        ],
        [
          ["After prefill", "5 prompt-token positions", "Initial K/V state"],
          [
            "After another processed output position",
            "6 positions",
            "State for the new position",
          ],
          [
            "After three processed output positions",
            "8 positions",
            "Three additions, not new learned weights",
          ],
        ],
      ),
      p(
        "Exact token accounting at a generation boundary varies by implementation; the example shows growth rather than prescribing an engine’s buffer layout.",
      ),
    ),
    [
      "Run the same explorer with caching enabled and disabled.",
      "Explain why caching saves repeated computation but still consumes memory.",
      "Give two reasons a follow-up request might not find reusable state.",
    ],
    [
      "Calling KV cache a database of final answers.",
      "Claiming the cache stops all reads or attention over old tokens.",
      "Assuming identical text is reusable across unrelated models.",
    ],
  ),

  "model-routing": guide(
    [
      "Separate model capability, deployment eligibility, and replica placement.",
      "Explain why the cheapest advertised token price is not the whole task cost.",
      "Recognize when a conversation continuation changes routing economics.",
    ],
    [
      ["Model route", "Which model should perform the task."],
      [
        "Deployment route",
        "Which eligible provider, service, or region hosts it.",
      ],
      ["Replica route", "Which concrete serving unit receives the work."],
      [
        "Fallback",
        "An alternate eligible route used after failure or unavailability.",
      ],
    ],
    [
      chapter(
        "Start with the task contract",
        "A low price is useful only if the destination can complete the task.",
        p(
          "A short rewrite, tool-driven code workflow, and long-document analysis have different requirements. A routing policy first checks context limits, supported tools or schemas, permitted deployment location, and evaluated task quality. Preferences such as cost, latency, or cache affinity rank the remaining choices.",
        ),
        table(
          ["Decision", "Example question", "Useful evidence"],
          [
            [
              "Model",
              "Can it reliably perform this task?",
              "Representative task evaluation",
            ],
            [
              "Deployment",
              "Is this location/provider allowed and healthy?",
              "Policy, health and service configuration",
            ],
            [
              "Replica",
              "Where will this request start soonest?",
              "Queue, available KV state and capacity",
            ],
          ],
        ),
        p(
          "A product can implement more than one layer, but the decisions should still be measured separately. A good model choice can be undermined by a cold or overloaded deployment.",
        ),
      ),
      chapter(
        "Count the complete path",
        "Retries and repeated prompt work can outweigh a per-token saving.",
        list(
          "Include all attempts, not just the final successful call.",
          "Account for latency added by an escalation or provider fallback.",
          "Track quality and output-contract failures by task type.",
          "For a continuation, consider whether history must be prefilled again after a model or replica change.",
        ),
        p(
          "A model switch can discard the value of cached computation. Staying with the same model may preserve an opportunity for reuse, but a different replica or evicted cache can still make it cold. State-aware routing is therefore not identical to permanently pinning every user.",
        ),
      ),
      chapter(
        "Evaluate rather than guess",
        "The explorer’s request types explain the policy; they do not rank real models.",
        p(
          "Build a small labeled set of representative requests. Compare a fixed-model policy with a task-based router. Record route reasons, task success, attempts, token usage, TTFT, full latency, and cost per successful outcome. Replay multi-turn tasks when conversation state matters.",
        ),
        p(
          "If a stricter task arrives mid-conversation, capability may justify switching even when reuse is lost. If the task stays stable and the original engine is healthy, preserving useful state can be beneficial.",
        ),
      ),
    ],
    example(
      "The next turn is not the whole prompt",
      formula(
        "Continuation workload",
        "8,000 history tokens + 50 new tokens = 8,050 visible input tokens",
        "A compatible warm prefix may let an engine prefill mainly the new suffix. An unrelated model normally needs to process the visible history again.",
      ),
      p(
        "This does not predict latency: queueing, architecture, transfer, and scheduling still matter. It explains the work the policy should include.",
      ),
    ),
    [
      "Select each request type in the explorer and explain the implied capability need.",
      "Name one hard requirement that price cannot override.",
      "Explain why two successive model routes should sometimes be evaluated together.",
    ],
    [
      "Mixing model selection and replica selection into one unexplained score.",
      "Ranking candidates that fail mandatory requirements.",
      "Ignoring history processing, retries, or quality when comparing costs.",
    ],
  ),

  "hardware-sizing": guide(
    [
      "Estimate weights separately from context and runtime memory.",
      "Explain why fitting a model is not the same as serving a workload.",
      "Choose what to measure before making a hardware decision.",
    ],
    [
      [
        "GB / GiB",
        "GB is 10⁹ bytes; GiB is 2³⁰ bytes. Keep the units consistent.",
      ],
      [
        "Headroom",
        "Explicit memory allowance for runtime, workspaces, and variance.",
      ],
      [
        "Concurrency",
        "Simultaneously active requests, not the total registered users.",
      ],
      [
        "Bandwidth",
        "Rate at which required data can be moved; capacity alone does not predict speed.",
      ],
    ],
    [
      chapter(
        "Build a budget from distinct components",
        "A weight-file size answers only the first question.",
        formula(
          "Inference budget",
          "Weights + KV state + temporary buffers + runtime / OS allowance + safety margin",
          "For GPU execution, check usable device memory. For CPU execution, leave RAM for the OS and other processes. Unified-memory systems need shared-budget accounting.",
        ),
        p(
          "Raw weight storage is parameter count multiplied by bytes per parameter. Quantization can reduce it, but real formats add scales, metadata, alignment, and sometimes higher-precision tensors. KV precision is a separate setting and may not change when weights are quantized.",
        ),
        p(
          "The architecture settings in the lab are hypothetical and editable. Selecting 70B does not automatically populate a real 70B model’s layer count, KV heads, or attention layout. Use the actual model configuration before planning a deployment.",
        ),
      ),
      chapter(
        "Size the workload, not only the model",
        "Prompt and output lengths determine the retained token budget.",
        steps(
          "Choose the model artifact, backend, precision, and intended task-quality requirement.",
          "Read its architecture and calculate raw weights and KV bytes per token.",
          "Estimate peak active sequences and each sequence’s prompt plus generated context.",
          "Add runtime/workspace allowance and a margin; check actual allocations.",
          "Run the representative workload and find a safe operating point under latency objectives.",
        ),
        p(
          "Total users are not automatically simultaneous sequences. Long outputs occupy execution capacity longer, while long prompts create more prefill work and retained state. A memory-fit estimate must be followed by a throughput and latency experiment.",
        ),
      ),
      chapter(
        "CPU and GPU choices involve more than capacity",
        "A larger memory number does not ensure a better experience.",
        table(
          ["Concern", "CPU path", "GPU path"],
          [
            [
              "Memory",
              "Available RAM and NUMA placement",
              "Usable HBM / VRAM per execution group",
            ],
            [
              "Execution",
              "Backend build, vector instructions, thread placement",
              "Supported kernels, runtime, device and interconnect",
            ],
            [
              "Pressure symptom",
              "Swapping, bandwidth contention, process OOM",
              "KV admission stalls, preemption, device OOM",
            ],
            [
              "Validation",
              "Process/RAM logs + client traces",
              "Engine/device memory + endpoint traces",
            ],
          ],
        ),
        p(
          "Quantization, offload, and multi-device sharding can change what fits. Each also has compatibility, quality, and movement-cost considerations. The explorer is a first estimate rather than an automatic hardware recommendation.",
        ),
      ),
    ],
    example(
      "8B FP16, eight active 4,096-token sequences",
      formula(
        "Weights",
        "8 × 10⁹ × 2 / 2³⁰ = 14.90 GiB",
        "Ideal FP16 weights; format overhead is omitted.",
      ),
      formula(
        "KV",
        "32 layers × 2 × 8 KV heads × 128 × 2 bytes = 128 KiB/token",
        "4,096 tokens consume 0.5 GiB per sequence. Eight sequences consume 4 GiB.",
      ),
      formula(
        "Example total",
        "14.90 + 4 + 2 GiB headroom = 20.90 GiB",
        "On a hypothetical usable 24 GiB device, about 3.10 GiB remains. That is an estimate, not a guarantee of runtime fit or safe latency.",
      ),
    ),
    [
      "Set eight active sequences, 4,096 tokens, FP16 weights, and FP16 KV.",
      "Double tokens and explain which memory category changes.",
      "Reduce weight precision and explain why KV memory can remain unchanged.",
    ],
    [
      "Confusing GB with GiB.",
      "Using query-head count when KV heads differ.",
      "Treating “loaded successfully” as proof of safe serving capacity.",
    ],
  ),

  "inference-stack": guide(
    [
      "Assign a responsibility to every layer in a request path.",
      "Separate a model framework, execution backend, engine, gateway, and agent.",
      "Use the landscape to investigate a role without treating it as a ranking.",
    ],
    [
      ["Framework", "Expresses model and tensor operations."],
      ["Backend", "Executes supported operations on selected hardware."],
      ["Engine", "Coordinates model execution, scheduling and request state."],
      ["Agent runtime", "Coordinates model calls, tools and workflow state."],
    ],
    [
      chapter(
        "Name the responsibilities before choosing products",
        "A layered model is a way to reason, not a mandatory deployment diagram.",
        table(
          [
            "Role",
            "Primary responsibility",
            "What it does not automatically solve",
          ],
          [
            [
              "Application / agent",
              "Define task, evidence, tools and workflow",
              "Efficient GPU scheduling",
            ],
            [
              "Model gateway / router",
              "Apply policy and choose eligible destinations",
              "Local KV allocation",
            ],
            [
              "Fleet placement",
              "Choose an endpoint or worker pair",
              "The model forward pass",
            ],
            [
              "Serving engine",
              "Admit, batch, manage KV and stream output",
              "Whether an answer is correct for the task",
            ],
            [
              "Framework / kernels",
              "Express and implement computation",
              "Application-level provider policy",
            ],
            [
              "Hardware / fabric",
              "Compute, store and move state",
              "Task quality evaluation",
            ],
          ],
        ),
        p(
          "These functions can share one process or product. Conversely, a distributed system can split one responsibility across multiple services. Identify the actual critical path before adding boxes.",
        ),
      ),
      chapter(
        "Follow two valid hardware paths",
        "GPU and local CPU inference use different supported execution choices.",
        flow(
          "Client / application",
          "Gateway or direct endpoint",
          "Engine",
          "Supported backend",
          "CPU RAM or GPU HBM",
        ),
        p(
          "CUDA is an NVIDIA GPU platform, not a universal mandatory layer for every LLM endpoint. A CPU runtime uses an appropriate CPU backend. A GGUF model format is an artifact format; it is not a router. vLLM combines API-serving and engine functions, while llama.cpp provides local inference and server capabilities across supported backends.",
        ),
        p(
          "Check the model format, hardware backend, attention features, dtype, and operational requirements together. A name appearing in the same layer of a catalog does not establish feature parity.",
        ),
      ),
      chapter(
        "Connect the layers through observability",
        "An overall latency number does not reveal the responsible layer.",
        list(
          "Trace application calls and external tool waits.",
          "Record gateway decisions, retries, rate limits and network delay.",
          "Measure endpoint queueing, prefill, generation cadence and SLO goodput.",
          "Track engine KV pressure and worker execution.",
          "Use device and network observations to explain, not replace, user-facing measurements.",
        ),
        p(
          "The landscape is useful after identifying the problem: explore memory-management components for KV pressure, routing components for state placement, and observability components for measurement. Do not assemble every listed tool just because it appears on the map.",
        ),
      ),
    ],
    example(
      "Where should a fix live?",
      table(
        ["Symptom", "First layer to investigate", "Why"],
        [
          [
            "Wrong tool selected with valid JSON",
            "Application / task evaluation",
            "The API contract passed but task behavior failed",
          ],
          [
            "Warm GPU but long queue",
            "Placement and engine admission",
            "Execution resources may be contested or KV constrained",
          ],
          [
            "Fast local run, slow remote API",
            "Network / gateway / serving path",
            "The tested boundaries are different",
          ],
          [
            "New pod Running but no responses",
            "Model loading and readiness",
            "Container state is not inference readiness",
          ],
        ],
      ),
    ),
    [
      "Switch the explorer from CPU to GPU and identify which role changes.",
      "Open the landscape for one role and explain its relation to the engine.",
      "Locate the likely layer for each symptom in the worked table.",
    ],
    [
      "Presenting products as a required linear chain.",
      "Calling CUDA a model gateway or GGUF a serving scheduler.",
      "Optimizing a layer without measuring the complete user path.",
    ],
  ),
  "prefill-decode": guide(
    [
      "Explain the dependency between prompt processing and generation.",
      "Relate phase work to TTFT, token cadence and interference.",
      "Describe what chunked prefill changes and what it cannot remove.",
    ],
    [
      [
        "Compute-bound",
        "Execution is limited primarily by available arithmetic throughput under the tested shape.",
      ],
      [
        "Memory-bound",
        "Execution is limited primarily by required data movement under the tested shape.",
      ],
      [
        "Chunked prefill",
        "Process prompt work in scheduled portions rather than one unrestricted prompt batch.",
      ],
      [
        "ITL",
        "Time between consecutive output tokens at a defined measurement boundary.",
      ],
    ],
    [
      chapter(
        "Two different shapes of work",
        "The phases use the same model but present different execution opportunities.",
        p(
          "Prefill processes the known input sequence and produces the state needed for generation. Many input positions are available together, which enables substantial parallel work while preserving causal attention. Decode repeatedly advances an active sequence by another output token. The next position depends on the previous selected output, so a single request cannot generate arbitrary future tokens independently.",
        ),
        table(
          ["Aspect", "Prefill", "Decode"],
          [
            [
              "Work available",
              "Known prompt tokens",
              "Next output position per active sequence",
            ],
            [
              "State",
              "Build prompt KV",
              "Read retained KV and append new state",
            ],
            [
              "User impact",
              "Initial wait / TTFT",
              "Cadence and response completion",
            ],
            [
              "Typical optimization concern",
              "Large token batches, attention/workspace cost",
              "Reuse weights across active work; move weights/KV efficiently",
            ],
          ],
        ),
        p(
          "“Prefill is compute-bound and decode is memory-bound” is a useful starting intuition, not a universal law. Batch size, architecture, context, kernels and hardware can change the bottleneck. Profile the tested shape.",
        ),
      ),
      chapter(
        "Why one phase can disturb another",
        "Long prompt work and interactive generation compete for shared resources.",
        p(
          "A large incoming prompt can consume iteration time and memory that an existing decode sequence needs. If scheduling gives all resources to that prompt, users already receiving output may see pauses. A scheduler must balance prompt progress, ongoing decode, KV admission, fairness and throughput.",
        ),
        p(
          "Chunking prompt work can bound the amount admitted to an iteration and allow decode work to be interleaved. It does not erase total prompt computation or remove dependencies. Choosing chunks too small can add overhead; choosing them too large can increase interference. The appropriate budget is workload-dependent.",
        ),
        list(
          "Measure TTFT for incoming requests and ITL for already-active requests together.",
          "Bucket results by input length, output length, arrival rate and cache condition.",
          "Track queue time separately so a scheduling change is not incorrectly attributed to model math.",
        ),
      ),
      chapter(
        "A prefix hit changes only eligible prompt work",
        "Generation and state reads still exist after a hit.",
        p(
          "An exact compatible prefix can allow reuse of retained blocks. The uncached suffix still needs prefill, and the response still needs decode. A repeated long system prompt is therefore a good candidate for TTFT savings, while a long generated output still occupies the engine for many iterations.",
        ),
        p(
          "Disaggregation places the phases in different pools. This may reduce interference and permit different capacity choices, but introduces a worker-pair decision and KV transfer before decode can proceed. It should be evaluated end to end rather than assumed superior.",
        ),
      ),
    ],
    example(
      "The workload has two independent length knobs",
      table(
        [
          "Prompt / output",
          "What the experiment emphasizes",
          "What else to record",
        ],
        [
          [
            "128 / 16 tokens",
            "Short request baseline",
            "Queueing and client overhead",
          ],
          [
            "8,192 / 16 tokens",
            "Prompt sensitivity",
            "Prefill time, cache state and TTFT",
          ],
          [
            "128 / 512 tokens",
            "Generation occupancy",
            "ITL, completion time and concurrency",
          ],
          [
            "8,192 / 512 tokens",
            "Both phases",
            "Memory, phase interference and tails",
          ],
        ],
      ),
      p(
        "These are workload definitions, not expected speed results. Keep model, hardware and runtime fixed when changing one dimension.",
      ),
    ),
    [
      "Increase prompt length while holding output length fixed.",
      "Increase output length while holding prompt length fixed.",
      "Explain why the schematic track is not a measured latency chart.",
    ],
    [
      "Assuming the whole prompt is generated token by token like the response.",
      "Treating the bottleneck heuristic as universal.",
      "Judging a scheduling improvement by TTFT while ignoring decode pauses.",
    ],
  ),

  "kv-memory": guide(
    [
      "Derive raw KV bytes per token using KV heads and dtype.",
      "Calculate heterogeneous active-token and concurrency budgets.",
      "Explain the gap between a raw estimate and runtime allocation.",
    ],
    [
      ["L", "Number of model layers retaining the relevant KV state."],
      ["Hkv", "Number of key/value heads, which may differ from query heads."],
      ["D", "Head dimension."],
      ["b", "Bytes per stored KV element; FP16/BF16 use two raw bytes."],
    ],
    [
      chapter(
        "Derive the per-token cost",
        "Count elements, then multiply by storage bytes.",
        formula(
          "Raw full-attention KV per token",
          "L × 2 × Hkv × D × b bytes",
          "The factor two counts K and V. Multiply by retained tokens across sequences to estimate the total raw state.",
        ),
        p(
          "For a hypothetical 32-layer model with 8 KV heads, head dimension 128, and FP16 KV, the calculation is 32 × 2 × 8 × 128 × 2 = 131,072 bytes = 128 KiB per token. Using 32 query heads by mistake would overestimate this GQA example by four times.",
        ),
        p(
          "The formula assumes the same full-attention structure at every included layer. Sliding windows, hybrid attention, compressed state, cross-attention and other layouts require architecture-specific accounting. Sharding and block sharing also affect physical residency.",
        ),
      ),
      chapter(
        "Count all retained tokens",
        "Unequal request lengths should be summed, not hidden behind an average.",
        formula(
          "Heterogeneous workload",
          "Total raw KV = bytes/token × Σ retained tokens for each active sequence",
          "For 1,000 + 2,000 + 500 retained tokens, the example model uses 3,500 × 128 KiB = 437.5 MiB.",
        ),
        table(
          ["4,096-token active sequences", "Total tokens", "Raw KV"],
          [
            ["1", "4,096", "0.5 GiB"],
            ["4", "16,384", "2 GiB"],
            ["8", "32,768", "4 GiB"],
            ["16", "65,536", "8 GiB"],
          ],
        ),
        p(
          "Output growth belongs in the budget. Sixteen requests starting at 4,096 input tokens do not stay at that state size if each generates thousands more. Memory admission and maximum output limits must account for the future growth the service promises to allow.",
        ),
      ),
      chapter(
        "Convert an estimate into an operational limit",
        "The physical pool has more detail than raw tensor bytes.",
        list(
          "Include block rounding and partially used final blocks.",
          "Account for quantization scales/metadata and backend alignment.",
          "Keep model weights, temporary workspaces and communication buffers separate.",
          "Distinguish reserved/preallocated pool memory from occupied blocks.",
          "Check whether shared prefixes are physically shared and how references are counted.",
          "Observe OOM, preemption, waiting requests and cache utilization during the intended workload.",
        ),
        p(
          "A configurable memory-utilization target or cache reservation is not proof that a particular arrival rate will meet the SLO. Memory fit and safe throughput are related but different constraints. Runtime allocation logs and request-level measurements complete the estimate.",
        ),
      ),
    ],
    example(
      "A memory-limited concurrency ceiling",
      formula(
        "Available example KV budget",
        "24 GiB usable − 14.90 GiB raw weights − 2 GiB allowance = 7.10 GiB",
        "With 4,096-token sequences at 0.5 GiB each, floor(7.10 / 0.5) = 14 raw sequences.",
      ),
      p(
        "Fourteen is a raw teaching ceiling, not a safe production setting. Block overhead, output growth, allocation spikes and latency may require a lower limit. Weight quantization changes the available budget but does not automatically change the cache dtype.",
      ),
    ),
    [
      "Set 32 layers, eight KV heads, head dimension 128 and FP16 KV.",
      "Verify 0.5 GiB for one 4,096-token sequence, then compare sixteen sequences.",
      "Change KV precision independently from weight precision and describe the limits of the estimate.",
    ],
    [
      "Counting only input tokens when outputs can grow.",
      "Dividing total users by memory rather than estimating active work.",
      "Assuming raw bytes equal all reserved runtime memory.",
    ],
  ),

  "prefix-reuse": guide(
    [
      "Explain why reuse is a leading exact-match problem.",
      "Calculate complete-block reuse after an early divergence.",
      "Design prompt structure and cache experiments without confusing reuse with semantic caching.",
    ],
    [
      [
        "Automatic prefix caching",
        "Reuse intermediate state for compatible matching leading tokens.",
      ],
      [
        "Semantic cache",
        "Reuse an answer or result based on a similarity policy; a different mechanism.",
      ],
      [
        "Block identity",
        "An identifier representing a token block and the prefix/state that produced it.",
      ],
      [
        "Cache salt",
        "An additional identity input that can separate otherwise matching state.",
      ],
    ],
    [
      chapter(
        "A matching sentence is not enough",
        "The prefix dependency gives a block its meaning.",
        p(
          "The state for a later token depends on the preceding context. If an early token changes, later text that looks identical can still have different computed state. A block identity can therefore incorporate the preceding block’s identity along with its own tokens and relevant execution state.",
        ),
        flow(
          "Model / adapter / isolation identity",
          "Hash of leading block",
          "Next block + preceding identity",
          "Continue while identities match",
          "Prefill after divergence",
        ),
        p(
          "Tokenization, chat-template choices, message order, document order and dynamic metadata can change the sequence even when the visible wording seems similar. Compatible model version, adapters and media identifiers also matter. Arbitrary KV transfer between unrelated models is not implied.",
        ),
      ),
      chapter(
        "Reuse complete eligible blocks",
        "Matched tokens and reused physical state are related but not identical.",
        formula(
          "Illustrative complete-block reuse",
          "floor(matching leading tokens / block size) × block size",
          "In the explorer, twelve tokens are grouped into four-token blocks. A first difference at token nine leaves eight matching, reusable tokens.",
        ),
        table(
          [
            "First different position",
            "Matching leading tokens",
            "Complete four-token blocks reused",
          ],
          [
            ["1", "0", "0"],
            ["4", "3", "0"],
            ["9", "8", "2"],
            ["12", "11", "2"],
            ["No difference", "12", "3"],
          ],
        ),
        p(
          "The final partial match may need processing depending on the engine’s cache representation. The block size is a teaching choice, not a universal configuration. Real systems must distinguish valid cached data from merely allocated or speculatively indexed blocks.",
        ),
      ),
      chapter(
        "Make reuse useful and measurable",
        "A hit is valuable only if it saves work on the request path.",
        list(
          "Keep stable shared instructions and reusable documents before request-specific suffixes when the task permits.",
          "Avoid placing a timestamp or unique identifier at the beginning of every otherwise identical prompt.",
          "Measure matched tokens/bytes as well as hit percentage.",
          "Separate cold-start, cold-prefix and warm-prefix runs.",
          "Check queue imbalance, evictions and p95/p99 TTFT when routing for locality.",
          "Preserve tenant isolation and model compatibility instead of maximizing cross-tenant hits blindly.",
        ),
        p(
          "A ten-token hit and an eight-thousand-token hit should not be treated as equally valuable. A high hit rate on one overloaded replica can be worse than some recomputation elsewhere.",
        ),
      ),
    ],
    example(
      "Stable prefix versus an early timestamp",
      table(
        ["Prompt layout", "Likely exact-match opportunity", "Reason"],
        [
          [
            "Shared instructions → shared document → user question",
            "Leading shared blocks",
            "Dynamic text is late",
          ],
          [
            "Timestamp → shared instructions → shared document",
            "Potentially little leading reuse",
            "The first block changes before the shared content",
          ],
          [
            "Same document, reordered paragraphs",
            "Only until the first changed token",
            "Later similarity does not restore the original prefix",
          ],
        ],
      ),
      p(
        "This is a design comparison, not a guarantee. Retention, token identity, isolation and routing still decide whether the compatible state is available.",
      ),
    ),
    [
      "Move the first changed token from nine to four in the explorer.",
      "Explain why later unchanged tokens do not become reusable prefix blocks again.",
      "Propose a controlled cold-versus-warm workload with identical tokenized prefixes.",
    ],
    [
      "Using semantic similarity as proof of KV compatibility.",
      "Reporting only request hit percentage without saved token work.",
      "Assuming a retained block is reachable from every replica.",
    ],
  ),

  "cache-tiers": guide(
    [
      "Separate cache identity, indexing, residency, transfer and reuse.",
      "Compare restore cost with recomputation rather than assuming any hit is faster.",
      "Explain why tier order and coherence depend on deployment policy.",
    ],
    [
      ["Hot tier", "State readily available near execution."],
      [
        "Offload",
        "Move retained state out of the active execution memory tier.",
      ],
      [
        "Index",
        "Metadata used to locate state; it is not necessarily the state itself.",
      ],
      [
        "Restore",
        "Make compatible retained state available to the worker that will use it.",
      ],
    ],
    [
      chapter(
        "Different tiers solve different capacity problems",
        "The execution tier and the retention tier need not be the same.",
        table(
          ["Tier", "Potential role", "Cost or constraint"],
          [
            [
              "GPU HBM",
              "Active GPU weights and hot KV",
              "Limited usable capacity",
            ],
            [
              "CPU DRAM",
              "Host retention or CPU execution memory",
              "GPU execution needs a suitable restore path",
            ],
            [
              "Local NVMe",
              "Larger nearby retained-state pool",
              "Storage latency and bandwidth",
            ],
            [
              "Remote memory / cache service",
              "Find or share state across a fleet",
              "Network, registration, consistency and placement",
            ],
            [
              "Object storage",
              "Large artifact/state retention where supported",
              "Not equivalent to low-latency active memory",
            ],
          ],
        ),
        p(
          "A cache manager may check several locations and use different transports or asynchronous prefetch. The explorer’s chain is one illustration, not a prescribed global order. A remote-memory hit can be preferable to local storage in some designs.",
        ),
      ),
      chapter(
        "A lookup is not the whole critical path",
        "A metadata hit must become usable data.",
        flow(
          "Compute compatible identity",
          "Locate candidate state",
          "Validate residency / layout",
          "Fetch or restore",
          "Make ready for execution",
          "Process uncached suffix",
        ),
        p(
          "An index can be stale after eviction or restart. A producer may not have finished a block when routing metadata first appears. The consumer needs valid state and completion synchronization before using it. With different block layouts or parallelism, conversion may be required or reuse may not be supported.",
        ),
        p(
          "Offload also does not free a resource unless ownership/reference rules permit release of the local copy. Duplicate state across tiers can increase total storage even when it lowers pressure on HBM.",
        ),
      ),
      chapter(
        "Decide whether restoring is worthwhile",
        "A cache hit is an opportunity, not automatically a latency win.",
        formula(
          "Teaching decision",
          "Reuse path = lookup + queue + restore + missing-suffix prefill",
          "Compare with the eligible recompute path, including its queue and full prefill cost.",
        ),
        p(
          "Effective transfer bandwidth can differ substantially from line rate. Small transfers pay fixed overhead, while large transfers compete with other traffic. A good policy considers saved work, data size, location, load and deadlines. Measure bytes restored, time, evictions, and actual prefill work rather than only cache hits.",
        ),
      ),
    ],
    example(
      "Restore or recompute?",
      table(
        [
          "Synthetic alternative",
          "Assigned costs",
          "Total before common decode work",
        ],
        [
          [
            "CPU restore",
            "Lookup 10 ms + restore 100 ms + suffix 40 ms",
            "150 ms",
          ],
          ["Cold prefill", "Queue 20 ms + full prompt 500 ms", "520 ms"],
          [
            "Slow remote restore",
            "Lookup 30 ms + transfer 600 ms + suffix 40 ms",
            "670 ms",
          ],
        ],
      ),
      p(
        "Under these assigned conditions CPU reuse wins and slow remote reuse loses. These numbers are invented to demonstrate the comparison, not claimed measurements.",
      ),
    ),
    [
      "Trace a hit in each tier and the no-hit path.",
      "Identify where restoration becomes necessary for GPU execution.",
      "Explain why an index hit might still lead to recomputation.",
    ],
    [
      "Equating a metadata index with a globally shared KV pool.",
      "Assuming object storage has active-memory latency.",
      "Ignoring lookup, transfer, layout and queue costs when claiming a speedup.",
    ],
  ),

  "continuous-batching": guide(
    [
      "Describe iteration-level admission and completion.",
      "Join scheduler token budgets with KV-memory constraints.",
      "Explain fairness, preemption and phase interference under mixed workloads.",
    ],
    [
      [
        "Fixed batch",
        "A group starts together and replacement work waits for its boundary.",
      ],
      [
        "Continuous batch",
        "The engine can change active membership between iterations.",
      ],
      [
        "Token budget",
        "A limit on the amount of work scheduled in an iteration.",
      ],
      [
        "Preemption",
        "Suspend or remove work so resources can be used elsewhere, potentially requiring later recomputation/restore.",
      ],
    ],
    [
      chapter(
        "Change batch membership at scheduling boundaries",
        "The longest request need not hold every finished slot idle.",
        p(
          "In a fixed group, a short request can finish while a longer request continues. If replacements must wait for the whole group, execution opportunities remain unused. Continuous scheduling can release finished sequence resources and admit waiting work between iterations, keeping useful work available.",
        ),
        p(
          "The explorer uses four requests and two slots to isolate this behavior. It omits prefill, memory admission and real iteration durations. Its tick count compares that toy schedule; it is not a throughput benchmark for a serving engine.",
        ),
        flow(
          "Collect ready work",
          "Check budgets / KV blocks",
          "Execute an iteration",
          "Update generated state",
          "Release finished / cancelled work",
          "Admit eligible waiting work",
        ),
      ),
      chapter(
        "An empty slot is not sufficient",
        "The request needs state capacity and phase work, not just a label in a batch.",
        p(
          "An incoming sequence may require a substantial prefill and enough KV blocks for its prompt. An ongoing sequence may request another block as generation grows. The scheduler must reconcile sequence limits, token work, memory availability, priority and deadlines. Preallocated pool memory can be large while free usable blocks are scarce.",
        ),
        table(
          ["Constraint", "Potential symptom", "Useful observation"],
          [
            [
              "KV capacity",
              "Waiting despite apparent compute opportunity",
              "Cache occupancy, active tokens, admission stalls",
            ],
            [
              "Large prefill",
              "Existing streams pause",
              "ITL distribution, prompt work per iteration",
            ],
            [
              "Long outputs",
              "High concurrency and slow completion",
              "Active duration and output-length buckets",
            ],
            [
              "Fairness policy",
              "Some requests repeatedly wait",
              "Age, priority and per-slice latency",
            ],
          ],
        ),
        p(
          "If the engine preempts work, capacity may be recovered at the cost of recomputing or restoring state later. Count that extra work and the request’s tail delay.",
        ),
      ),
      chapter(
        "Choose the objective explicitly",
        "A fuller batch can improve aggregate efficiency while hurting interactive latency.",
        list(
          "Evaluate TTFT, ITL, end-to-end latency and task success together.",
          "Use mixed short/long prompts and outputs, not a single uniform request shape.",
          "Inspect waiting work and fairness rather than only GPU utilization.",
          "Test overload and cancellation as well as a steady successful run.",
          "Use goodput under the specified SLO to locate safe capacity.",
        ),
        p(
          "Batch size, active users, prompt token batch, and microbatch size are different quantities. A configuration change is meaningful only when its resource boundary and workload are stated.",
        ),
      ),
    ],
    example(
      "Admission can fail even after request A finishes",
      table(
        ["Event", "Compute view", "Memory view"],
        [
          [
            "A completes",
            "One active slot becomes available",
            "Its referenced blocks may be released or retained by cache policy",
          ],
          [
            "D arrives with a long prompt",
            "The slot appears usable",
            "D still needs compatible/free KV capacity",
          ],
          [
            "KV budget is exhausted",
            "GPU may not reach the desired occupancy",
            "D queues, or policy preempts/restores other work",
          ],
        ],
      ),
      p(
        "This is why the toy scheduling lab and the memory-budget lab should be understood together.",
      ),
    ),
    [
      "Compare fixed and continuous membership using the same four requests.",
      "Explain why the toy iteration count is not real wall-clock speed.",
      "Name a memory and a fairness condition that a production scheduler must also consider.",
    ],
    [
      "Treating continuous batching as unlimited concurrency.",
      "Ignoring prefill/decode interference.",
      "Optimizing utilization while failing the user’s latency objective.",
    ],
  ),

  "distributed-serving": guide(
    [
      "Distinguish sharded replicas, independent replicas and phase-separated pools.",
      "Explain why locality and compatibility enter endpoint placement.",
      "Identify the added state dependency when prefill and decode are separated.",
    ],
    [
      [
        "Logical replica",
        "A complete model-serving unit, possibly spanning several devices.",
      ],
      ["Disaggregation", "Run prefill and decode in different serving roles."],
      [
        "Worker pair",
        "The chosen prefill and decode destinations for a request.",
      ],
      [
        "State locality",
        "How close reusable state is to the selected execution destination.",
      ],
    ],
    [
      chapter(
        "Three different reasons to distribute work",
        "They solve different resource problems.",
        table(
          ["Pattern", "Primary purpose", "State implication"],
          [
            [
              "TP / PP within a replica",
              "Fit or execute one model across devices",
              "Workers cooperate for each assigned request",
            ],
            [
              "Independent replicas",
              "Handle more concurrent work",
              "Each copy has its own scheduler and local KV",
            ],
            [
              "Prefill/decode pools",
              "Separate phase roles and capacity choices",
              "KV must reach the decode destination",
            ],
          ],
        ),
        p(
          "A four-GPU TP group is not four independent servers containing the full model. A four-replica deployment does not divide one copy of weights among those replicas. A phase-separated service is not simply a generic load balancer in front of identical servers.",
        ),
      ),
      chapter(
        "Place the request near useful computation",
        "Healthy and least busy are important but incomplete signals.",
        p(
          "The routing layer can filter by model/version, role, health and policy, then consider queue depth, state reuse, capacity and movement cost. After placement, the local engine still controls admission and scheduling. An endpoint with the strongest cache match can be a poor choice if it is overloaded.",
        ),
        flow(
          "Eligibility",
          "State / load knowledge",
          "Select endpoint or pair",
          "Local admission",
          "Prompt work / transfer",
          "Generation",
        ),
        p(
          "A conversation continuation may be warm at its previous endpoint, cold at another, or transferable under a compatible connector. A policy should distinguish these paths rather than pretend that every replica shares all context.",
        ),
      ),
      chapter(
        "The handoff is a real dependency",
        "Control coordination and tensor movement have separate jobs.",
        p(
          "A prefill worker computes KV state, while control messages identify the producer, consumer and buffers. The data path transfers or exposes the compatible tensors. Decode cannot safely use incomplete or incompatible state. The transfer must be included in TTFT and failure handling.",
        ),
        list(
          "Verify model, dtype, block layout and parallelism compatibility.",
          "Account for producer and consumer queues, not only link speed.",
          "Bound in-flight transfers and reserve destination memory.",
          "Record failures, timeout/recompute paths and cancellation cleanup.",
          "Compare monolithic and disaggregated serving on the same workload and SLO.",
        ),
      ),
    ],
    example(
      "A worker-pair choice can change the answer",
      table(
        [
          "Synthetic pair",
          "Queue + prefill + transfer",
          "Path cost before common decode",
        ],
        [
          ["Nearby busy decode", "150 + 300 + 40 ms", "490 ms"],
          ["Remote idle decode", "20 + 300 + 250 ms", "570 ms"],
        ],
      ),
      p(
        "These assigned costs demonstrate why choosing the idlest decode worker alone can lose. Real measured costs and eligible topology are needed to make the decision.",
      ),
    ),
    [
      "Trace the explorer from router to decode and identify the state producer.",
      "Explain which boxes coordinate and which execute.",
      "Name a workload where transfer might outweigh phase separation’s benefit.",
    ],
    [
      "Calling each device shard an independent replica.",
      "Leaving transfer off an end-to-end latency comparison.",
      "Assuming distributed routing replaces the engine’s scheduler.",
    ],
  ),

  "inference-metrics": guide(
    [
      "Calculate TTFT, inter-token intervals and complete response time.",
      "Separate endpoint, engine and workflow measurement boundaries.",
      "Interpret throughput, tails, failures and cache observations together.",
    ],
    [
      [
        "TTFT",
        "Elapsed time from the specified request-start boundary to the first output token.",
      ],
      [
        "ITL",
        "Intervals between successive output tokens; define aggregation and boundary.",
      ],
      [
        "Goodput",
        "Completed work meeting the specified success and SLO conditions per unit time.",
      ],
      [
        "p95 / p99",
        "Thresholds below which approximately 95% / 99% of observations fall.",
      ],
    ],
    [
      chapter(
        "State the measurement boundary",
        "The same name can hide different clocks and inclusion rules.",
        table(
          ["Measurement", "Can include", "Common omission"],
          [
            [
              "Client TTFT",
              "Network, gateway, queue and first-output work",
              "Server-only timing excludes some user wait",
            ],
            [
              "Engine prefill time",
              "Scheduled prompt computation",
              "Does not establish full TTFT",
            ],
            [
              "Token ITL",
              "Gaps between identified token deliveries",
              "Chunk spacing may aggregate several tokens",
            ],
            [
              "Workflow latency",
              "All calls, retries and external waits",
              "A single endpoint call is only one component",
            ],
          ],
        ),
        p(
          "Record the start event, finish event, clock source and aggregation method. A dashboard metric and a load-generator metric need not disagree to measure different things. Streaming transport can change observable chunk cadence without an identical change in token execution.",
        ),
      ),
      chapter(
        "Understand the arithmetic",
        "The first token is part of the total output count.",
        formula(
          "Simple constant-cadence model",
          "Full time = TTFT + (output tokens − 1) × interval",
          "The example assumes constant intervals. In an actual trace, add the observed individual gaps instead.",
        ),
        formula(
          "Output throughput",
          "Total observed output tokens / measured elapsed time",
          "State whether this is aggregate service throughput, per-request throughput, or a warm execution microbenchmark.",
        ),
        p(
          "Averages hide bursts, pauses and overloaded users. Tail measurements need enough samples to be credible. Do not compare a short p99 run with a long p95 run or average per-request ratios and assume they equal aggregate throughput.",
        ),
      ),
      chapter(
        "Use a set of signals to explain the result",
        "No one number proves the service is healthy.",
        list(
          "User outcomes: task success, TTFT, ITL, full latency and SLO goodput.",
          "Demand: offered arrival rate, attained completion rate, running and waiting requests.",
          "Memory: occupied KV, reserved pool, active tokens, evictions and preemption.",
          "Reuse: matched tokens/bytes, actual prefill work and cold/warm conditions.",
          "System: device execution, CPU/NUMA, storage and network observations.",
        ),
        p(
          "When throughput rises, check whether the service accepted more work at the expense of latency or failures. When cache hits rise, check whether saved prefill outweighs queue concentration. Preserve raw traces and the workload definition to connect symptoms to causes.",
        ),
      ),
    ],
    example(
      "One trace can describe three different experiences",
      formula(
        "Assigned request",
        "200 ms queue + 400 ms prefill + 50 ms network = 650 ms TTFT",
        "At sixteen tokens and 40 ms between tokens, total time is 1,250 ms. A user feels both the initial pause and the later cadence.",
      ),
      image(
        "/article-images/kirye-1.png",
        "Original concept-to-observability metrics mapping",
        "Original graphic from the author’s inference-metrics article. Labels must be interpreted with the measurement boundary of the actual implementation.",
      ),
    ),
    [
      "Increase queue delay without changing the token interval.",
      "Increase the output limit without changing TTFT in the teaching model.",
      "Explain why output tokens/sec alone cannot prove a responsive chat experience.",
    ],
    [
      "Calling stream-chunk cadence exact token ITL.",
      "Comparing measurements from different boundaries or workloads.",
      "Dropping failed requests from the report.",
    ],
  ),

  "attention-heads": guide(
    [
      "Relate query heads to shared KV heads in MHA, GQA and MQA.",
      "Calculate storage ratios without claiming equal model quality.",
      "Recognize architecture as a property of the trained model.",
    ],
    [
      [
        "MHA",
        "Multi-head attention with separate KV heads for query heads in the basic comparison.",
      ],
      [
        "GQA",
        "Grouped-query attention: a group of queries shares each KV-head pair.",
      ],
      [
        "MQA",
        "Multi-query attention: many query heads share one KV-head pair.",
      ],
      [
        "Architecture choice",
        "A structural model design, not generally an interchangeable runtime flag.",
      ],
    ],
    [
      chapter(
        "Queries and retained state have different counts",
        "Sharing keys and values does not delete query computation.",
        p(
          "A query head forms its own way to attend to context. In the basic MHA design, the corresponding keys and values are separate across heads. GQA retains fewer KV-head pairs and shares each pair among a group of queries. MQA is the one-KV-head case. The query-head count can remain unchanged while retained KV storage falls.",
        ),
        table(
          [
            "Hypothetical architecture",
            "Query heads",
            "KV heads",
            "Queries sharing each KV pair",
          ],
          [
            ["MHA", "32", "32", "1"],
            ["GQA", "32", "8", "4"],
            ["MQA", "32", "1", "32"],
          ],
        ),
        p(
          "This sharing is built into the model architecture and training. Lowering the weight precision does not turn MHA into GQA. Runtime support and checkpoint metadata must match the actual model.",
        ),
      ),
      chapter(
        "Calculate the storage ratio",
        "Hold every other term constant before attributing a saving.",
        formula(
          "Raw KV ratio",
          "KV(new) / KV(old) = KV-head count(new) / KV-head count(old)",
          "For the same layers, head dimension, dtype, tokens and sequences, eight KV heads need one quarter the raw KV of thirty-two heads.",
        ),
        p(
          "Fewer retained heads can reduce cache-memory traffic as well as capacity demand. That is an opportunity, not a promise of proportional throughput gain. Other layers, compute, scheduling and memory behavior still contribute.",
        ),
      ),
      chapter(
        "Do not turn a memory comparison into a quality ranking",
        "Architecture, training and workload must be evaluated together.",
        p(
          "A lower KV footprint can leave capacity for longer contexts or more sequences, but the trained checkpoint still determines what the model can do. A comparison of different checkpoints also changes training, weights and possibly other architecture choices. Separate the arithmetic storage comparison from a measured task-quality and performance comparison.",
        ),
        list(
          "Read query-head and KV-head counts separately from the model config.",
          "Check head dimension, included layer types and cache dtype.",
          "Evaluate task quality on the actual trained checkpoints.",
          "Measure backend performance with the same input/output mix and cache condition.",
          "Account for parallelism: a shard’s physical KV layout is not necessarily total logical KV divided naively by every device.",
        ),
      ),
    ],
    example(
      "The same 4,096-token context under three designs",
      table(
        [
          "32 layers, head dimension 128, FP16",
          "Raw KV per token",
          "One sequence",
        ],
        [
          ["MHA: 32 KV heads", "512 KiB", "2 GiB"],
          ["GQA: 8 KV heads", "128 KiB", "0.5 GiB"],
          ["MQA: 1 KV head", "16 KiB", "0.0625 GiB"],
        ],
      ),
      p(
        "All numbers use a hypothetical full-attention model. They compare retained storage only, not equivalent learned capability.",
      ),
    ),
    [
      "Select each architecture and inspect the groups of query heads.",
      "Verify the GQA-to-MHA storage ratio.",
      "Explain which model-config value belongs in the KV formula.",
    ],
    [
      "Using query heads in every KV-size estimate.",
      "Assuming the sharing pattern is a serving switch for any checkpoint.",
      "Inferring quality or proportional speed directly from the storage ratio.",
    ],
  ),

  "paged-attention": guide(
    [
      "Translate logical sequence blocks into scattered physical blocks.",
      "Distinguish external fragmentation and last-block waste.",
      "Explain allocation, references and reclamation as sequences grow.",
    ],
    [
      ["Logical block", "A block’s position in the sequence’s token order."],
      ["Physical block", "An allocated location in the actual KV pool."],
      [
        "Block table",
        "Mapping from sequence/logical block to physical location.",
      ],
      ["Tail waste", "Unused slots in the final partially filled block."],
    ],
    [
      chapter(
        "Separate sequence order from memory order",
        "Attention can follow a map rather than assume one contiguous reservation.",
        p(
          "A contiguous allocator needs one sufficiently large run of free space. A pool can have enough total free memory but lack that run. A paged representation allocates fixed-size blocks from available locations and records where each logical block lives. The attention implementation uses that mapping to retrieve state in the required sequence order.",
        ),
        table(
          [
            "Logical block for D",
            "Physical block in the explorer",
            "Sequence position",
          ],
          [
            ["D0", "3", "First"],
            ["D1", "4", "Second"],
            ["D2", "5", "Third"],
            ["D3", "9", "Fourth"],
          ],
        ),
        p(
          "The logical sequence is continuous even though its fourth block is physically separated. Paging does not reorder tokens, remove attention math, or allow arbitrary semantic reuse.",
        ),
      ),
      chapter(
        "Allocate growth rather than every maximum length",
        "Requests join, extend and finish at different times.",
        steps(
          "Allocate the blocks needed for admitted prompt state.",
          "Extend the table as generation needs more token slots.",
          "Retain references for any shared compatible blocks.",
          "Release or cache blocks when request references finish, according to policy.",
        ),
        p(
          "A reference-counted cache can share immutable compatible prefix blocks and avoid duplicating them. Extension of a partially shared block may need a copy-on-write or equivalent policy. Exact ownership rules are implementation-specific, but the invariant is that another request must not observe invalidated or modified state.",
        ),
      ),
      chapter(
        "Paging reduces one kind of waste, not all waste",
        "Block size and metadata still create tradeoffs.",
        formula(
          "Tail allocation",
          "ceil(tokens / block size) blocks",
          "A 35-token sequence with 16-token blocks uses three blocks and leaves 48 − 35 = 13 empty slots.",
        ),
        p(
          "Smaller blocks can reduce final-block waste but increase mapping/metadata work. Larger blocks can reduce bookkeeping but leave more unused tail capacity. Cached blocks also compete with new allocations. Measure actual utilization, evictions and admission behavior rather than assuming the pool can run at 100% useful occupancy.",
        ),
      ),
    ],
    example(
      "Four free blocks, but no four-block gap",
      p(
        "A occupies physical blocks 0–2. C occupies 6–8. Free blocks are 3, 4, 5 and 9. D needs four blocks. Contiguous allocation fails because the largest free run is three. Paged allocation can assign D’s four logical blocks to all four free locations.",
      ),
      formula(
        "Important distinction",
        "External gap problem ≠ partially empty final block",
        "Paging solves the scattered-gap problem in this example; the separate token slider illustrates tail waste.",
      ),
    ),
    [
      "Allocate D using paged mode, then compare contiguous mode.",
      "Read the logical-to-physical mapping aloud in sequence order.",
      "Move the token slider across 32 and 33 to observe a block-boundary change.",
    ],
    [
      "Claiming paging eliminates all fragmentation or overhead.",
      "Confusing a physical address order with token order.",
      "Treating free compute slots as proof of free KV blocks.",
    ],
  ),

  "engine-architecture": guide(
    [
      "Assign API, scheduling, memory, worker and sampling responsibilities.",
      "Trace state updates through one engine iteration.",
      "Explain admission, cancellation and distributed-worker boundaries.",
    ],
    [
      [
        "Sequence state",
        "Tokens, stopping conditions, ownership and progress for a request.",
      ],
      [
        "Execution plan",
        "The scheduled work and state locations given to workers.",
      ],
      [
        "Sampler",
        "Selects output tokens from model scores according to decoding settings.",
      ],
      [
        "KV manager",
        "Tracks allocation, residency and references for retained attention state.",
      ],
    ],
    [
      chapter(
        "Control work and execute work in separate roles",
        "The scheduler plans; workers run the model.",
        table(
          ["Role", "Input", "Output"],
          [
            [
              "API / frontend",
              "Client request",
              "Validated request and delivery stream",
            ],
            [
              "Engine / request tracker",
              "Waiting and active sequences",
              "Updated request lifecycle",
            ],
            [
              "Scheduler",
              "Budgets, priorities, phase and state",
              "Next execution plan",
            ],
            [
              "KV manager",
              "Allocation / release needs",
              "Usable block mappings and capacity information",
            ],
            [
              "Workers",
              "Plan + model parameters + state",
              "Computed scores and updated state",
            ],
            [
              "Sampler / output processor",
              "Scores + decoding configuration",
              "Selected token, stopping and streamed output",
            ],
          ],
        ),
        p(
          "This is a responsibility map, not a claim that every engine version has exactly six processes or classes. Frontends and workers can be separated, and one logical replica can use a distributed set of workers.",
        ),
      ),
      chapter(
        "The loop connects computation to lifetime",
        "A forward pass is only one step of serving.",
        flow(
          "Track waiting / active requests",
          "Choose admissible work",
          "Allocate / map KV",
          "Execute workers",
          "Sample and update sequences",
          "Deliver output / reclaim",
        ),
        p(
          "At each iteration, finished or cancelled work can release active references. Newly waiting requests can enter when their prompt work and state requirements fit. An active sequence may need a further allocation. Cache policy can keep a useful prefix after execution completes, so “request finished” does not necessarily mean “all its physical blocks instantly disappear.”",
        ),
      ),
      chapter(
        "Diagnose the right boundary",
        "A visible stall can originate outside model arithmetic.",
        list(
          "Validation/template failures belong before execution.",
          "Insufficient KV capacity can prevent admission even when a device is available.",
          "Distributed-worker communication can delay a scheduled operation.",
          "Sampling/output processing and transport can delay delivery after computation.",
          "Disconnect handling must cancel/reclaim work rather than let it run invisibly.",
        ),
        p(
          "Use correlated traces, engine queues, memory observations and worker metrics. A low device-utilization snapshot alone cannot distinguish an empty workload, blocked state admission, a stalled worker or a transport problem.",
        ),
      ),
    ],
    example(
      "A request that cannot be admitted",
      table(
        ["Observed event", "Interpretation", "Next check"],
        [
          [
            "API accepted the request",
            "Format was valid",
            "Waiting queue and route",
          ],
          [
            "Compute slot looks available",
            "Not sufficient for admission",
            "Free KV blocks and per-request needs",
          ],
          [
            "KV admission unavailable in the explorer",
            "This request stops before workers",
            "Allow memory, then rerun",
          ],
          [
            "Other sequences still progress",
            "The engine can schedule different admitted work",
            "Fairness and waiting age",
          ],
        ],
      ),
    ),
    [
      "Disable KV admission and step the engine.",
      "Verify that the request does not advance into model execution.",
      "Explain why a cancellation needs both delivery and resource-management handling.",
    ],
    [
      "Calling the API proxy the component that multiplies the model’s tensors.",
      "Treating scheduling, allocation and execution as interchangeable.",
      "Assuming a running container means its engine can admit requests.",
    ],
  ),

  "local-runtime": guide(
    [
      "Explain GGUF as a model artifact rather than a complete runtime budget.",
      "Separate weight quantization, KV precision and backend offload.",
      "Design controlled thread/build/quantization comparisons.",
    ],
    [
      [
        "GGUF",
        "A tensor-and-metadata artifact format used by compatible runtimes.",
      ],
      [
        "Q4_K_M / Q8_0",
        "Specific quantization-format names, not uniform per-tensor bit guarantees.",
      ],
      [
        "Offload",
        "Place supported work/tensors on an accelerator rather than only the CPU.",
      ],
      [
        "NUMA",
        "Memory-access domains that make CPU thread and memory placement relevant.",
      ],
    ],
    [
      chapter(
        "Read the artifact and runtime separately",
        "A filename is useful evidence, not a complete performance specification.",
        p(
          "A GGUF artifact contains model tensors and metadata needed by a compatible runtime, including architecture and tokenizer information. Quantization names describe a concrete format. Real artifacts can mix tensor precisions and include scales or other metadata, so ideal parameter-count × bits arithmetic is only a lower-detail estimate.",
        ),
        p(
          "The runtime still allocates KV, compute buffers, execution graphs and other state. A 4.5 GB file does not prove a process will stay below 4.5 GB or that an 8 GB machine supports the intended context and concurrency. Inspect runtime logs and process memory.",
        ),
      ),
      chapter(
        "Three independent knobs",
        "Do not attribute every resource change to the weight file.",
        table(
          ["Knob", "Main concern", "What remains separate"],
          [
            [
              "Weight format / quantization",
              "Artifact footprint, bandwidth and task quality",
              "KV dtype and active context",
            ],
            [
              "KV type / context / slots",
              "Retained-state footprint and supported active work",
              "Learned weight precision",
            ],
            [
              "Backend / offload / threads",
              "Where and how operations execute",
              "Quality of the checkpoint and workload shape",
            ],
          ],
        ),
        p(
          "Lower precision can reduce storage and data movement but may affect task quality. GPU offload depends on supported backends and available memory. More CPU threads can help until bandwidth, thread overhead or placement becomes limiting; there is no universal “use every logical thread” rule.",
        ),
      ),
      chapter(
        "Make local experiments reproducible",
        "A native build and a portable build answer different questions.",
        list(
          "Record the exact model file and hash, runtime revision and build features.",
          "Save CPU architecture, physical cores, RAM, NUMA topology and competing load.",
          "Separate context capacity, parallel slots, prompt batch and microbatch settings.",
          "Keep input/output distributions and sampling settings fixed.",
          "Compare accuracy/contract success as well as memory, TTFT and cadence.",
          "Read model, KV and compute buffer logs before increasing concurrency.",
        ),
        code(
          "Configuration checklist, not a launcher",
          "model artifact + hash\nruntime revision + backend/build\ncontext / active slots / batch / microbatch\nweight format + KV dtype\nthreads + placement + offload\nworkload + raw request traces",
          "Runtime flags evolve. Inspect the installed binary’s help and retain the actual launch command with each result.",
        ),
      ),
    ],
    example(
      "Quantization frees weight budget, not every byte",
      formula(
        "Ideal 8B weights",
        "FP16: 14.90 GiB; 8-bit: 7.45 GiB; 4-bit: 3.73 GiB",
        "Real GGUF files differ because of tensor precision choices, scales, metadata and layout.",
      ),
      p(
        "If the workload still needs 4 GiB of FP16 KV, that cache budget does not automatically become one quarter as large when weight precision changes from sixteen to four bits.",
      ),
    ),
    [
      "Compare ideal sixteen-, eight- and four-bit storage in the explorer.",
      "List the additional allocations needed to run a GGUF model.",
      "Design a thread-count comparison that keeps the model and workload constant.",
    ],
    [
      "Treating all tensors in a Q4 artifact as exactly four-bit values.",
      "Assuming more threads always means faster generation.",
      "Changing context, model and quantization together and attributing the result to one setting.",
    ],
  ),

  "controlled-experiments": guide(
    [
      "Create a baseline and change one variable at a time.",
      "Distinguish a client experiment from an engine microbenchmark.",
      "Retain results that explain failures, variance and limits.",
    ],
    [
      ["Baseline", "A named reproducible configuration used for comparison."],
      [
        "Independent variable",
        "The one intentional change in a controlled comparison.",
      ],
      [
        "Manifest",
        "The recorded configuration and artifact identities needed to repeat a run.",
      ],
      [
        "Warm / cold",
        "Explicit readiness and cache conditions, not vague labels.",
      ],
    ],
    [
      chapter(
        "Establish that the endpoint actually works",
        "A load test should not begin with an unknown baseline.",
        steps(
          "Choose a model artifact and installed runtime with a supported local backend.",
          "Record the launch command, revision, model hash and machine configuration.",
          "Verify health and one successful bounded request.",
          "Read memory allocations and check that no unintended swapping or competing load dominates.",
          "Save a baseline workload and repeat it before changing a setting.",
        ),
        p(
          "The original local-server experiment uses llama.cpp and a small GGUF model before moving to GPUs. This sequence separates learning the serving path from solving every cloud, network and accelerator issue at once. This app explains the experiment; it does not start a server.",
        ),
      ),
      chapter(
        "Build a small experiment matrix",
        "A question should map to a controlled change.",
        table(
          ["Question", "Intentional change", "Hold fixed"],
          [
            [
              "What is longer-prompt cost?",
              "Input length",
              "Output budget, model, concurrency, backend",
            ],
            [
              "What is longer-output occupancy?",
              "Output limit",
              "Prompt, model and arrivals",
            ],
            [
              "Where does contention begin?",
              "Arrival rate or concurrency",
              "Request-shape distribution and system",
            ],
            [
              "Does a batch setting help?",
              "One batch/microbatch setting",
              "Workload and other settings",
            ],
            [
              "Is quantization acceptable?",
              "Artifact format",
              "Task set, scoring policy and comparable model family",
            ],
          ],
        ),
        p(
          "Actual generated lengths can vary. Record observed prompt/output counts rather than assuming an output limit was fully used. Sampling changes can alter the workload and quality, so retain them too.",
        ),
      ),
      chapter(
        "Measure both the experience and the explanation",
        "A result needs conditions, raw data and uncertainty.",
        code(
          "Example experiment record",
          "experiment: prompt-length-sweep\nmodel_hash: <record actual hash>\nruntime_revision: <record actual revision>\ninput_tokens: [128, 2048, 8192]\nmax_output_tokens: 32\narrival_mode: fixed-and-recorded\ncache_condition: cold-prefix\ncollect: [success, ttft, chunks, tokens, total_latency, memory]\nrepeats: repeated-independent-runs",
          "This is a manifest template, not runnable benchmark syntax.",
        ),
        p(
          "Client timings include the path the client traverses. Stream chunks can contain multiple tokens; their gaps are a visible-cadence approximation unless token identity is instrumented. Record errors, timeouts, cancellations and raw traces. Compare distribution tails and repeated runs, not only one average tokens/sec figure.",
        ),
      ),
    ],
    example(
      "A fair comparison and an unfair comparison",
      table(
        ["Comparison", "Can you isolate prompt length?", "Reason"],
        [
          [
            "Same artifact / runtime / machine; 128 vs 2,048 input tokens; 32 output limit",
            "Reasonably, with recorded cache conditions and repeats",
            "One main variable changes",
          ],
          [
            "New model, faster machine, different quantization, longer output and prompt",
            "No",
            "Multiple interacting changes",
          ],
          [
            "Same system; second run silently gains a prefix hit",
            "Not without separating cache state",
            "Warmth is another changed condition",
          ],
        ],
      ),
    ),
    [
      "Select each experiment variable and read which metrics it emphasizes.",
      "Write a minimal manifest for the prompt-length question.",
      "Explain what you would preserve after a failed or unusually slow run.",
    ],
    [
      "Changing several knobs and naming only one in the result.",
      "Calling chunk timing exact token timing.",
      "Reporting only successful runs or a single unrepeated measurement.",
    ],
  ),
  "tensor-parallelism": guide(
    [
      "Distinguish tensor shards from independent model replicas.",
      "Explain where partitioning requires concatenation or reduction.",
      "Budget device memory and communication together.",
    ],
    [
      [
        "TP group",
        "Devices cooperating on tensor operations within one model-serving unit.",
      ],
      [
        "All-reduce",
        "Combine participant contributions and return the result to every participant.",
      ],
      [
        "All-gather",
        "Collect participant pieces so all participants obtain the assembled data.",
      ],
      [
        "Replicated tensor",
        "A tensor held on multiple participants rather than fully sharded.",
      ],
    ],
    [
      chapter(
        "Partition the operation, not the user population",
        "Every device contributes to a request handled by the group.",
        p(
          "Consider a linear operation y = W x. A partition that gives devices separate output rows can produce separate pieces of y that need to be assembled where the next operation requires them. A partition over input columns can produce contributions to the same output positions that need to be summed. Transformer implementations choose compatible partitions across attention and feed-forward operations to control these communication points.",
        ),
        table(
          ["Illustrative partition", "Local result", "Potential combination"],
          [
            [
              "Output rows of W",
              "Different output-vector pieces",
              "Concatenate / gather as required",
            ],
            [
              "Input columns of W with corresponding x pieces",
              "Partial contributions to output",
              "Reduce / all-reduce as required",
            ],
          ],
        ),
        p(
          "The lab’s row-contribution sum is a toy reduction, not a source-level implementation of every transformer linear layer. Its purpose is to expose the fact that partial compute is not necessarily a complete result.",
        ),
      ),
      chapter(
        "Memory falls unevenly, not magically",
        "Shards make room, while replicated and temporary state remain.",
        formula(
          "First-order weight shard",
          "Raw sharded weights per device ≈ total sharded weights / TP degree",
          "Add replicated tensors, local KV, workspaces, execution graphs and communication buffers. Their partitioning depends on the actual model and runtime.",
        ),
        p(
          "A larger TP degree can allow a model to fit and can change how much KV capacity remains. It also introduces synchronization. Small per-device operations, network delay or an imbalanced topology can consume the expected gain. Four TP devices therefore do not promise four times the throughput or create four independent caches.",
        ),
      ),
      chapter(
        "Place the group and measure its critical path",
        "Tightly coupled execution is sensitive to fabric topology.",
        list(
          "Confirm the model and backend support the intended TP degree and tensor dimensions.",
          "Map the actual device-to-device paths, not just device count.",
          "Keep model, dtype, request mix and cache state fixed in a TP sweep.",
          "Measure TTFT, ITL, per-device memory, useful throughput and collective time.",
          "Compare “fit” and “faster” as separate objectives.",
          "Treat a failure or slow worker as a group-level concern for its assigned request.",
        ),
        p(
          "Independent model-serving groups can be replicated after establishing the size of one group. That is the separate DP boundary.",
        ),
      ),
    ],
    example(
      "An 80 GiB sharded weight payload",
      table(
        [
          "TP degree",
          "Ideal sharded weight bytes/device",
          "What the estimate excludes",
        ],
        [
          ["1", "80 GiB", "KV and runtime overhead"],
          ["2", "40 GiB", "Replicated tensors and buffers"],
          ["4", "20 GiB", "Collective costs and implementation-specific state"],
        ],
      ),
      p(
        "These are arithmetic teaching values, not the footprint of a named checkpoint. A 24 GiB device is not proven adequate just because the four-way weight shard is 20 GiB.",
      ),
    ),
    [
      "Switch the lab from one to four devices and inspect local contributions.",
      "Step through the combination and verify that every participant receives the sum.",
      "Explain which additional memory and communication costs must be measured.",
    ],
    [
      "Calling each tensor shard a full replica.",
      "Dividing every allocation by TP degree without checking its layout.",
      "Predicting linear speedup from ideal weight sharding.",
    ],
  ),

  "pipeline-parallelism": guide(
    [
      "Partition model layers into dependent execution stages.",
      "Calculate bubbles in a simplified independent-item pipeline.",
      "Explain why autoregressive decode needs more than an assembly-line picture.",
    ],
    [
      [
        "Stage",
        "A sequential portion of model computation assigned to workers.",
      ],
      [
        "Activation",
        "Intermediate representation passed between model portions.",
      ],
      [
        "Microbatch / work item",
        "A scheduled portion that can advance through pipeline stages.",
      ],
      ["Bubble", "A stage-time interval without useful scheduled work."],
    ],
    [
      chapter(
        "Keep layer dependencies explicit",
        "The next stage requires the previous stage’s output.",
        p(
          "A model’s layers can be divided into stages, such as four groups of twenty layers in a hypothetical eighty-layer model. Each stage owns its assigned parameters and passes intermediate activations to the next stage. A stage can itself be a tensor-parallel group, so PP and TP can be composed.",
        ),
        flow(
          "Stage 1: layers 1–20",
          "Stage 2: layers 21–40",
          "Stage 3: layers 41–60",
          "Stage 4: layers 61–80",
        ),
        p(
          "Equal layer counts do not always mean equal execution time or memory. Embeddings, output projections, layer types, sequence shapes and communication can make stages imbalanced. The slowest stage can limit steady pipeline progress.",
        ),
      ),
      chapter(
        "Overlap independent work to reduce empty stages",
        "The diagram is a forward-pass schedule with deliberately simple timing.",
        formula(
          "Equal-stage teaching model",
          "P stages + M independent items − 1 ticks",
          "Each stage takes one tick, communication is omitted, and enough independent work is available. Occupied cells = P × M; total cells = P × (P + M − 1).",
        ),
        table(
          ["Four stages", "Ticks", "Occupied / available stage cells"],
          [
            ["One independent item", "4", "4 / 16 = 25%"],
            ["Three independent items", "6", "12 / 24 = 50%"],
          ],
        ),
        p(
          "More independent items improve this toy occupancy, but the comparison is not measured GPU utilization or request throughput. Memory and workload availability can limit how many items may be in flight.",
        ),
      ),
      chapter(
        "Decode introduces a feedback dependency",
        "One request’s next token cannot bypass its previous sampled result.",
        p(
          "After the final stage produces scores and a token is selected, the next generation step depends on that output. A real autoregressive pipeline needs a schedule that accounts for this feedback, active sequences and available KV state. Prompt chunks and independent requests create different overlap opportunities from one long generation stream.",
        ),
        list(
          "Measure stage balance, activation transfer and pipeline idle time.",
          "Evaluate both prompt-heavy and generation-heavy workloads.",
          "Account for per-stage KV, workspaces and output-head/embedding memory.",
          "Do not infer an individual request’s latency improvement from aggregate pipeline occupancy.",
        ),
      ),
    ],
    example(
      "Why “four stages” does not mean “one quarter the latency”",
      p(
        "A single forward item still traverses all four dependent stages and their transfer boundaries. Splitting the layers mainly changes where parameters and work reside. Overlapping multiple items can improve aggregate utilization while the individual item remains subject to the full chain.",
      ),
      p(
        "With unequal stage times, the one-tick diagram is no longer valid. Use actual per-stage durations and the engine’s schedule for a performance claim.",
      ),
    ),
    [
      "Compare one item with three items in the pipeline explorer.",
      "Identify the fill and drain bubbles.",
      "Explain the additional final-to-first dependency introduced by autoregressive generation.",
    ],
    [
      "Calling layer partitioning a duplication of the model.",
      "Assuming equal layer counts create balanced stages.",
      "Treating independent-item occupancy as a complete decode schedule.",
    ],
  ),

  "parallelism-topology": guide(
    [
      "Draw TP groups inside PP stages inside independent replicas.",
      "Calculate device counts with explicit topology assumptions.",
      "Place cache, failure and scheduling boundaries correctly.",
    ],
    [
      ["TP", "Partition operations/tensors inside cooperating model workers."],
      ["PP", "Partition dependent layers into execution stages."],
      [
        "DP in this lesson",
        "Independent complete inference replicas for separate request work.",
      ],
      [
        "Failure domain",
        "A group of resources that may fail together and affect usable serving capacity.",
      ],
    ],
    [
      chapter(
        "Count the nested execution unit",
        "A device total is not an architecture description.",
        formula(
          "Simple homogeneous topology",
          "Devices per replica = TP × PP; total devices = TP × PP × DP",
          "This assumes uniform groups and does not include additional expert-parallel or specialized role dimensions.",
        ),
        p(
          "Each PP stage contains a TP group. All stages together form one complete model-serving replica. DP duplicates that complete unit. A request sent to one replica uses its cooperating workers; it is not normally spread across every independent DP copy.",
        ),
        table(
          [
            "Boundary",
            "Shares a single model-serving computation?",
            "Normally independent local request scheduling?",
          ],
          [
            ["Inside TP", "Yes", "No, workers coordinate"],
            [
              "Between PP stages",
              "Dependent stage work",
              "Not independent complete models",
            ],
            ["Between DP replicas", "Separate assigned requests", "Yes"],
          ],
        ),
      ),
      chapter(
        "Place state and availability at the right boundary",
        "Replicas add capacity, not automatic global context.",
        p(
          "Each complete replica retains local request and cache state across its workers. If a new conversation turn lands in another replica, reuse depends on retained compatible blocks and any supported movement/remote-cache path. Adding replicas can increase throughput while reducing locality if routing is stateless.",
        ),
        p(
          "A lost worker inside a sharded replica can make that replica unusable even though most of its devices still run. Capacity planning should count healthy ready model-serving units and relevant failure domains, not merely powered-on GPUs.",
        ),
      ),
      chapter(
        "Topology should follow workload and hardware",
        "Different dimensions have different benefits and costs.",
        list(
          "Use sharding to address model fit and supported execution shape.",
          "Use replication to add independent request capacity once one replica is understood.",
          "Place frequent TP synchronization on a suitable low-cost fabric.",
          "Evaluate activation paths between PP stages.",
          "Reserve node/device resources and consider correlated failures.",
          "Measure queueing and SLO goodput per complete replica, alongside device metrics.",
        ),
        p(
          "A larger product TP × PP × DP says how many devices are allocated under this model; it does not prove a proportional gain. Heterogeneous pools and prefill/decode disaggregation require additional role-specific accounting.",
        ),
      ),
    ],
    example(
      "TP=4, PP=4, DP=3",
      formula(
        "One replica",
        "4 devices/stage × 4 stages = 16 devices",
        "A complete set of stages owns one model-serving unit.",
      ),
      formula(
        "Three replicas",
        "16 × 3 = 48 devices",
        "Removing one entire replica leaves two complete replicas, not thirty-two fragments that automatically merge their local contexts.",
      ),
      p(
        "The topology explorer exposes these boundaries explicitly. Its device labels are schematic rather than placement instructions for a real cluster.",
      ),
    ),
    [
      "Set TP=4, PP=4 and DP=3 and verify 48 labeled devices.",
      "Locate the boundary across which a conversation may lose local cache residency.",
      "Describe which count should fall when one complete replica becomes unavailable.",
    ],
    [
      "Multiplying device counts without identifying complete model units.",
      "Calling DP a division of one model’s weights.",
      "Planning availability from individual device uptime alone.",
    ],
  ),

  "gpu-networking": guide(
    [
      "Separate collectives, transport, topology and persistent storage.",
      "Explain all-reduce and distinguish TP, PP and DP communication.",
      "Calculate transfer lower bounds with consistent byte units.",
    ],
    [
      [
        "Scale-up",
        "Tightly connected devices in an integrated communication domain, which can extend beyond one chassis.",
      ],
      ["Scale-out", "Communication between separate nodes or domains."],
      [
        "RDMA",
        "A supported direct-memory data-movement mechanism with reduced host involvement.",
      ],
      ["NCCL", "A collective-communication library, not a physical network."],
    ],
    [
      chapter(
        "Match the operation to the fabric",
        "Names from different layers are not interchangeable.",
        table(
          ["Term", "Role", "Do not confuse it with"],
          [
            [
              "NVLink / NVSwitch",
              "Supported scale-up device interconnect/domain",
              "Persistent model storage",
            ],
            [
              "Ethernet / InfiniBand / cloud fabric",
              "Network transport/topology choices",
              "The collective operation itself",
            ],
            [
              "RDMA / GPUDirect RDMA",
              "Supported memory-transfer mechanisms",
              "Automatic zero-cost network movement",
            ],
            ["NCCL", "Software implementing collectives", "A GPU memory tier"],
          ],
        ),
        p(
          "Physical placement, adapter support, memory registration, topology and runtime configuration determine what path is actually used. “RDMA available” is not proof that every payload bypasses CPU staging, and link rate is not the measured bandwidth of the request’s critical path.",
        ),
      ),
      chapter(
        "Different parallelism creates different traffic",
        "Independent replicas need not synchronize each layer’s outputs.",
        table(
          ["Pattern", "Representative movement", "Timing sensitivity"],
          [
            [
              "TP",
              "Partial tensor results via collectives",
              "Frequent synchronization can affect each step",
            ],
            [
              "PP",
              "Intermediate activations across stage boundaries",
              "Stage balance and boundary transfer matter",
            ],
            [
              "Independent DP replicas",
              "Usually independent request execution",
              "Placement and external traffic matter more than layer-output collectives",
            ],
            [
              "Prefill/decode split",
              "Prompt KV from producer to consumer",
              "Transfer lies before useful decode",
            ],
          ],
        ),
        p(
          "A sum all-reduce takes each participant’s contribution, combines them, and gives the combined result to every participant. All-gather assembles distributed pieces; it does not perform the same reduction. The exact collective sequence depends on the partitioned operation.",
        ),
      ),
      chapter(
        "Measure movement where the workload uses it",
        "A raw bandwidth benchmark is only one component of inference.",
        formula(
          "Raw transfer lower bound",
          "Payload bytes / effective bytes per second",
          "Use measured effective bandwidth for the relevant size and path. Coordination, contention and conversion can add time.",
        ),
        list(
          "Record intra-domain and cross-node paths separately.",
          "Check repeated collectives as well as a single large transfer.",
          "Measure under concurrent serving traffic.",
          "Correlate communication delay with TTFT and ITL.",
          "Keep bytes and bits, and GB and GiB, distinct in calculations.",
        ),
      ),
    ],
    example(
      "Four contributions and one shared result",
      table(
        ["Participant", "Input", "Output after sum all-reduce"],
        [
          ["GPU 1", "1", "10"],
          ["GPU 2", "2", "10"],
          ["GPU 3", "3", "10"],
          ["GPU 4", "4", "10"],
        ],
      ),
      formula(
        "Separate transfer example",
        "4 GiB / 20 GiB/s = 0.2 s",
        "This is an assigned effective rate and raw lower bound, not a claim about NVLink, RDMA or any named cloud.",
      ),
    ),
    [
      "Step through the collective and verify that every GPU receives ten.",
      "Switch the communication domain and describe what stays logically the same.",
      "Explain why a fast fabric does not eliminate synchronization costs.",
    ],
    [
      "Calling NCCL a cable or RDMA a model cache.",
      "Comparing bits/sec with a bytes payload without conversion.",
      "Inferring endpoint latency from a standalone link-rate figure.",
    ],
  ),

  "llm-d-fleet": guide(
    [
      "Separate proxy traffic, Endpoint Picker policy, pool description and engine execution.",
      "Explain what changes when adding fleet coordination around an engine.",
      "Design a controlled routing experiment with locality and load signals.",
    ],
    [
      [
        "EPP",
        "Endpoint Picker: logic for evaluating eligible serving endpoints.",
      ],
      [
        "InferencePool",
        "A resource describing a set of model-serving endpoints.",
      ],
      [
        "Model server",
        "The endpoint/process running the selected inference engine.",
      ],
      [
        "Flow control",
        "Limit or coordinate work admission so downstream resources are not overwhelmed.",
      ],
    ],
    [
      chapter(
        "A pool resource is not another network hop",
        "Follow data traffic and decision inputs separately.",
        p(
          "The proxy carries client traffic. Endpoint-selection logic uses the pool and observed endpoint state to choose an eligible destination. The model server then admits and executes work with its local engine. The InferencePool describes candidates; it is not itself a model or a processor that transforms the request.",
        ),
        table(
          ["Component", "Decision/data", "Responsibility"],
          [
            [
              "Proxy",
              "Request and response bytes",
              "Carry traffic and enforce configured gateway behavior",
            ],
            [
              "Endpoint Picker",
              "Pool + state + request characteristics",
              "Filter/score/pick eligible placement",
            ],
            [
              "Pool resource",
              "Endpoint description",
              "Define the candidate serving pool",
            ],
            [
              "Engine",
              "Local sequence and KV state",
              "Schedule, execute and stream generation",
            ],
          ],
        ),
        p(
          "A deployment can have monolithic engines or specialized phase roles. Capabilities such as cache indexing or transfer require compatible components and configuration; the presence of a routing layer does not create them automatically.",
        ),
      ),
      chapter(
        "Fleet and local admission must agree",
        "Good placement does not make local capacity unlimited.",
        p(
          "A picker can observe queue depth, running work, cache affinity and memory pressure. Its information has collection and scheduling delay. The chosen engine may see new arrivals before the request reaches it. Local admission remains the final resource decision, and overload policy needs a defined response rather than an unbounded hidden queue.",
        ),
        list(
          "Exclude unhealthy, wrong-model or wrong-role endpoints first.",
          "Use state/locality signals only within eligible candidates.",
          "Track scheduling overhead and information freshness.",
          "Bound waiting work and define retry/cancellation behavior.",
          "Keep cluster-level endpoint selection separate from engine-level token scheduling.",
        ),
      ),
      chapter(
        "Add complexity with an experiment",
        "Compare the same model server before and after coordination.",
        steps(
          "Establish a working single-engine endpoint with reproducible request traces.",
          "Add a pool/proxy/picker while holding the model and local engine settings fixed.",
          "Verify request delivery, streaming, errors and cancellation.",
          "Introduce repeated prefixes, unique prompts and multi-turn work separately.",
          "Compare round-robin, locality-only and locality-plus-load policies where supported.",
        ),
        p(
          "Measure TTFT, prefill work, hit tokens, queue imbalance, memory pressure, picker latency and SLO goodput. A routing experiment that only reports cache hits cannot establish a user-facing benefit.",
        ),
      ),
    ],
    example(
      "Two schedulers, two scopes",
      table(
        ["Question", "Fleet decision", "Local engine decision"],
        [
          [
            "Where should this request go?",
            "Choose an eligible endpoint/pair",
            "Not the model’s batch plan",
          ],
          [
            "What should run next?",
            "May provide placement signals",
            "Choose prompt/decode work within token/KV budgets",
          ],
          [
            "Where is useful state?",
            "Locate likely/observed residency",
            "Validate and reuse actual local/received blocks",
          ],
        ],
      ),
      p(
        "The lab is a role map. Some diagram boxes represent metadata or control functions rather than sequential HTTP hops.",
      ),
    ),
    [
      "Trace a monolithic request and identify the actual model executor.",
      "Switch to split roles and describe the new coordination dependency.",
      "Design a workload that can reveal routing hotspots.",
    ],
    [
      "Claiming a pool resource executes inference.",
      "Treating routing metadata as exact instantaneous engine state.",
      "Assuming coordination software shrinks weights or eliminates cache growth.",
    ],
  ),

  "model-provider-replica": guide(
    [
      "Implement eligibility and preference at three distinct routing layers.",
      "Account for state warmth and migration across a conversation.",
      "Evaluate a policy by complete-task outcomes and route reasons.",
    ],
    [
      [
        "Model affinity",
        "Prefer a previously chosen model when it remains suitable.",
      ],
      [
        "Replica affinity",
        "Prefer the endpoint containing useful compatible state.",
      ],
      [
        "Routing regret",
        "Difference from a relevant evaluated alternative under the chosen objective.",
      ],
      [
        "Task slice",
        "A defined subset of workload with comparable requirements.",
      ],
    ],
    [
      chapter(
        "Model, deployment and replica use different evidence",
        "A single opaque score can hide a mandatory failure.",
        table(
          ["Layer", "Hard requirements", "Preferences after eligibility"],
          [
            [
              "Model",
              "Context, tools/schema and evaluated task ability",
              "Quality/cost/latency tradeoff",
            ],
            [
              "Deployment",
              "Permitted location/provider/version and health",
              "Service latency, readiness and available quota",
            ],
            [
              "Replica",
              "Compatible model/role and usable execution",
              "Queue, KV residency, memory pressure and topology",
            ],
          ],
        ),
        p(
          "Apply policy gates before ranking. A model can be capable but hosted in an ineligible region. A healthy replica can contain the wrong model or adapter. A cheap endpoint can violate the output contract. These are exclusions, not penalties to be compensated by a high cache score.",
        ),
      ),
      chapter(
        "State changes the cost of an otherwise good model choice",
        "The system has already paid for prior prompt work somewhere.",
        p(
          "A model change generally requires processing the visible history with the new model. The original KV tensors are not a transferable universal memory format. Remaining on the same model can still lose reuse if a different replica has no retained state. A remote compatible cache adds a restore path rather than an automatic local hit.",
        ),
        flow(
          "Task and policy eligibility",
          "Model decision",
          "Deployment decision",
          "Replica / state decision",
          "Execute and record route reason",
        ),
        p(
          "Affinity is conditional. Overload, failure, an expanded context, a new task, or a stronger capability requirement can justify leaving the warm route. Permanent stickiness and stateless per-turn routing are both extreme policies that need workload evaluation.",
        ),
      ),
      chapter(
        "Evaluate the complete conversation",
        "Repeated prefill and retries can alter both cost and experience.",
        list(
          "Replay whole sessions, including tools, history changes and resets.",
          "Record model/provider/replica switches separately.",
          "Track cache eligibility, actual reuse, repeated prefill and transfer bytes.",
          "Measure task success, route reasons, retries, TTFT/ITL tails and cost per successful outcome.",
          "Compare a fixed route, a stateless router and a session-aware hybrid on the same tasks.",
        ),
        p(
          "Use representative labels or task-specific evaluation to determine acceptable quality. The graphic does not invent real model rankings or pricing.",
        ),
      ),
    ],
    example(
      "Same latest message, different continuation paths",
      table(
        ["Path", "History processing", "Additional concern"],
        [
          [
            "Same model + local retained prefix",
            "Reuse eligible prefix; prefill new suffix",
            "Queue and eviction risk",
          ],
          [
            "Same model + transferable remote state",
            "Restore eligible KV; process suffix",
            "Transfer and layout cost",
          ],
          [
            "Same model + no retained state",
            "Recompute history",
            "New prefill work",
          ],
          [
            "Different model",
            "Process history with new parameters",
            "Quality/capability change and no assumed cross-model KV reuse",
          ],
        ],
      ),
    ),
    [
      "Toggle a model switch and inspect the changed prompt-work stage.",
      "Compare local, remote and missing state for the same model.",
      "Describe a legitimate reason to break affinity.",
    ],
    [
      "Optimizing advertised token price rather than successful-task cost.",
      "Treating every model switch as a cache transfer.",
      "Conflating model and replica affinity.",
    ],
  ),

  "kv-transfer": guide(
    [
      "Describe producer/consumer coordination separately from tensor movement.",
      "Calculate a transfer lower bound and compare worker pairs.",
      "Explain compatibility, buffer lifetime and failure cleanup.",
    ],
    [
      ["Producer", "Worker that computes or holds the prompt KV state."],
      [
        "Consumer",
        "Worker that needs compatible state to continue generation.",
      ],
      [
        "Control plane",
        "Coordinates identities, locations, transfer and completion.",
      ],
      ["Data plane", "Moves or exposes the actual tensor payload."],
    ],
    [
      chapter(
        "The consumer needs state, not only the prompt text",
        "Disaggregation adds an explicit dependency before decode.",
        flow(
          "Choose prefill / decode pair",
          "Produce KV",
          "Coordinate valid buffers",
          "Transfer / expose tensors",
          "Confirm usable state",
          "Begin decode",
        ),
        p(
          "Sending text to the decode worker without supplying the required state leads to repeated prompt processing rather than the intended handoff. A state connector needs a supported path to compatible storage and a way to determine when the state is valid. Control metadata alone is not the tensor payload.",
        ),
        p(
          "NIXL and RDMA-related mechanisms in the source describe communication building blocks. Their presence does not establish a supported combination of every runtime, layout and model; validate the actual connector configuration.",
        ),
      ),
      chapter(
        "Compatibility and lifetime are correctness requirements",
        "Fast movement of the wrong or incomplete tensor is not useful reuse.",
        table(
          ["Check", "Why it matters"],
          [
            [
              "Model/version/adapters",
              "The state was produced by specific computation",
            ],
            [
              "Dtype / dimensions / layer mapping",
              "The consumer must interpret tensors correctly",
            ],
            [
              "Block format / partitioning",
              "Logical state may have a different physical layout",
            ],
            [
              "Completion synchronization",
              "Consumer must not read incomplete state",
            ],
            [
              "Ownership and cancellation",
              "Buffers cannot be freed while still referenced or in flight",
            ],
          ],
        ),
        p(
          "Compatible conversion may be supported in a specific design, but should not be assumed. Timeouts and partial failures need a defined retry, recompute or rejection path. Cancellation must reclaim both producer and consumer reservations safely.",
        ),
      ),
      chapter(
        "Choose the pair on the full path",
        "The closest worker or idlest worker is not always the best pair.",
        formula(
          "Path estimate",
          "Prefill queue + missing prefill + transfer/coordination + decode queue + first decode",
          "The terms interact and should be validated with traces. A payload/bandwidth calculation bounds only part of transfer.",
        ),
        p(
          "Transfer can contend with other network or collective work. Destination memory must be available at the right time, and an idle worker on a distant path can lose to a busier nearby worker. Keep enough in-flight state capacity and backpressure to avoid pushing overload into the transfer stage.",
        ),
      ),
    ],
    example(
      "Raw transfer and the full request path",
      formula(
        "Assigned transfer condition",
        "4 GiB / 5 GiB/s = 0.8 seconds",
        "This is a lower-bound teaching calculation using an assigned effective rate.",
      ),
      table(
        ["Additional term", "Assigned duration"],
        [
          ["Producer queue", "100 ms"],
          ["Missing prefill", "300 ms"],
          ["Coordination/layout allowance", "50 ms"],
          ["Consumer queue + first decode", "80 ms"],
        ],
      ),
      formula(
        "Illustrative complete first-output path",
        "100 + 300 + 800 + 50 + 80 = 1,330 ms",
        "Compare this path with a measured monolithic alternative on the same workload before claiming a benefit.",
      ),
    ),
    [
      "Change the payload and effective bandwidth; verify the inverse relationship.",
      "Step through the difference between control and data roles.",
      "Name two compatibility checks and one cancellation-lifetime requirement.",
    ],
    [
      "Leaving the transfer off TTFT.",
      "Using line rate as measured payload bandwidth.",
      "Assuming identical visible text proves compatible tensor layouts.",
    ],
  ),

  "kubernetes-rollouts": guide(
    [
      "Separate requested replicas, schedulable pods and model-ready capacity.",
      "Explain surge versus replacement on a constrained cluster.",
      "Read resource requests and readiness as operational requirements.",
    ],
    [
      [
        "Pending",
        "The pod has not completed placement/startup; inspect its reason.",
      ],
      ["Running", "Container lifecycle state, not proof of usable inference."],
      [
        "Ready",
        "The configured readiness contract says traffic may be served.",
      ],
      [
        "Allocatable",
        "Node capacity available to workloads after system reservations.",
      ],
    ],
    [
      chapter(
        "Scheduling is a resource-fit decision",
        "Idle CPU percentage does not imply space for another requested pod.",
        p(
          "The scheduler evaluates resource requests and placement constraints against allocatable node capacity. A pod can remain Pending because requests do not fit, node selectors/affinity exclude nodes, a device is unavailable, or other constraints prevent placement. Inspect the actual scheduling events rather than assume every Pending pod means a generic CPU shortage.",
        ),
        p(
          "The original CPU-vLLM lab had limited cluster capacity. Its new revision could not coexist with the old pod under a surge rollout. This is a case study of deployment capacity, not a rule that CPU inference cannot use Kubernetes.",
        ),
      ),
      chapter(
        "Choose a rollout strategy with availability consequences",
        "Replacement fits a single slot by creating a service gap.",
        table(
          ["Strategy on one usable slot", "What happens", "Tradeoff"],
          [
            [
              "Keep old while adding new",
              "New pod cannot fit without more capacity",
              "Preserves old capacity but rollout waits",
            ],
            [
              "Stop old, then start new",
              "Old resources become available",
              "No ready replica during replacement/startup",
            ],
          ],
        ),
        code(
          "The constrained source-lab strategy",
          "strategy:\n  type: RollingUpdate\n  rollingUpdate:\n    maxSurge: 0\n    maxUnavailable: 1",
          "A Deployment strategy fragment illustrating the source lab. A single replica can be unavailable; this is not a high-availability recommendation.",
        ),
        p(
          "For a no-gap rollout, budget coexistence capacity and any startup/warmup time. A readiness probe must represent usable model serving, not merely an open HTTP port.",
        ),
      ),
      chapter(
        "Validate a model-serving rollout",
        "A manifest acceptance is the beginning, not the result.",
        steps(
          "Check requests/limits, node capacity, supported backend and model artifact access.",
          "Observe pod placement events and explain any Pending state.",
          "Verify artifact loading, KV allocation and engine startup logs.",
          "Confirm readiness with a bounded functional request and output delivery.",
          "Measure controlled latency/quality after the change before expanding traffic.",
        ),
        p(
          "Record the runtime image digest, model identity, configuration and workload. A rollback to an image alone may be incomplete if its model or prompt template changed independently.",
        ),
      ),
    ],
    example(
      "One old pod, one replacement, one slot",
      flow(
        "Old pod owns slot",
        "New revision requests slot",
        "New pod Pending",
        "Add eligible capacity OR release old slot",
        "Initialize model",
        "Ready to receive traffic",
      ),
      p(
        "Switching to replacement resolves the coexistence constraint only by removing the old service first. Node scaling can add another option, but still has provisioning and model-readiness delay.",
      ),
    ),
    [
      "Compare surge and replacement in the rollout explorer.",
      "Identify the service gap and explain its user impact.",
      "List what to inspect between a pod becoming Running and the endpoint becoming usable.",
    ],
    [
      "Counting desired replicas as ready serving capacity.",
      "Assuming low measured utilization means requests fit.",
      "Presenting maxUnavailable=1 on a single replica as zero downtime.",
    ],
  ),

  "private-workbench": guide(
    [
      "Describe the client, private tunnel, remote engine and results boundary.",
      "Make experiments reproducible across local and remote machines.",
      "Separate provisioning, inference startup and workload measurement.",
    ],
    [
      [
        "Loopback",
        "An address bound to the local host rather than exposing a service publicly.",
      ],
      [
        "Tunnel",
        "An authenticated transport forwarding a local connection to a remote private endpoint.",
      ],
      [
        "Workbench",
        "A controlled workflow for configurations, runs and results.",
      ],
      [
        "Cleanup",
        "Release experiment resources and retained access when they are no longer needed.",
      ],
    ],
    [
      chapter(
        "Keep the endpoint boundary explicit",
        "Remote compute does not require a casually public model server.",
        flow(
          "Local experiment client",
          "Local loopback port",
          "Authenticated SSH tunnel",
          "Private remote endpoint",
          "Model runtime",
          "Local result archive",
        ),
        p(
          "The source workbench separates a local interface/control workflow from the machine running inference. A tunnel lets a local client reach a private model endpoint through authorized access. It is not a replacement for authentication, access policy or protecting logs and model artifacts.",
        ),
        p(
          "The app’s diagram does not provision infrastructure, create credentials, start a tunnel or open a firewall. Those actions need their own environment-specific configuration and authority.",
        ),
      ),
      chapter(
        "Provisioning success and serving success are separate",
        "Record stage boundaries to explain a failed experiment.",
        table(
          ["Stage", "Evidence to retain"],
          [
            [
              "Resource provisioned",
              "Shape, region, image and resource identity",
            ],
            [
              "Runtime installed / built",
              "Revision, build features and dependencies",
            ],
            ["Model available", "Artifact/version/hash and location"],
            [
              "Engine ready",
              "Startup/memory logs and successful bounded request",
            ],
            [
              "Experiment complete",
              "Workload manifest, raw results, errors and metrics",
            ],
            [
              "Resources retired",
              "Explicit cleanup outcome and retained artifacts",
            ],
          ],
        ),
        p(
          "A machine being reachable over SSH does not prove that the model is loaded. A tunnel opening does not prove that the forwarded service is ready. Separate health, inference correctness and performance checks.",
        ),
      ),
      chapter(
        "Build a repeatable learning loop",
        "The workbench should turn “feels slow” into a conditional measurement.",
        steps(
          "Pin a baseline model, runtime, shape and request mix.",
          "Run locally or on one authorized remote shape and save traces.",
          "Change only the intended variable such as context, slots or hardware.",
          "Compare memory, TTFT, cadence, full latency, failures and task success.",
          "Preserve a manifest sufficient to repeat the run and retire unneeded resources.",
        ),
        p(
          "Remote client timing includes the tunnel and network path. A local execution measurement omits them. Report both boundaries if needed, rather than presenting the remote result as pure model speed. Avoid credentials or sensitive customer prompts in reproducibility files.",
        ),
      ),
    ],
    example(
      "A useful workbench result",
      code(
        "Result card template",
        "model + hash: recorded\nruntime + build: recorded\nCPU/GPU shape + RAM: recorded\ncontext / slots / batch: recorded\ninput-output distribution: recorded\nnetwork boundary + cache condition: recorded\nTTFT / cadence / total latency / errors: raw traces\nmodel / KV / compute allocations: runtime logs",
        "Replace “recorded” with actual evidence. This is a documentation template, not a machine provisioner.",
      ),
      p(
        "With this record, a larger-context failure can be investigated as memory pressure, network behavior or scheduler contention instead of an unexplained impression.",
      ),
    ),
    [
      "Disconnect the illustrative tunnel and identify where the client path stops.",
      "Separate model readiness from machine reachability.",
      "Specify the metadata required to compare a local and remote result fairly.",
    ],
    [
      "Exposing the endpoint publicly just to make a test convenient.",
      "Comparing client timings across different network boundaries without stating them.",
      "Leaving experiment resources running without a deliberate plan.",
    ],
  ),

  "nvidia-inference-stack": guide(
    [
      "Separate artifact storage, active memory, fabrics, runtime and serving products.",
      "Explain HGX/DGX and scale-up/scale-out at an architectural level.",
      "Avoid presenting NIM and Triton as mandatory consecutive hops.",
    ],
    [
      ["HBM", "High-bandwidth memory holding active GPU tensors and state."],
      [
        "NVMe",
        "Persistent local storage useful for artifacts and supported retention paths.",
      ],
      [
        "HGX / DGX",
        "GPU platform/system families; exact configurations depend on the product.",
      ],
      [
        "NIM / Triton",
        "Serving choices with different packaging and deployment responsibilities.",
      ],
    ],
    [
      chapter(
        "Data moves between storage and execution",
        "A model file on disk is not already executing in HBM.",
        table(
          ["Layer", "What it holds or does", "Important distinction"],
          [
            [
              "Artifact storage",
              "Model files, versions and reports",
              "Capacity is not active-memory bandwidth",
            ],
            [
              "Host memory / local NVMe",
              "Staging and nearby persistence",
              "Loading still creates usable tensors",
            ],
            [
              "GPU HBM",
              "Active weights, KV and execution buffers",
              "Limited per-device capacity",
            ],
            [
              "Fabrics",
              "Collectives, activations and supported transfers",
              "Topology and communication cost",
            ],
            [
              "Kernels / runtime",
              "Execute supported operations",
              "Model/backend compatibility",
            ],
            [
              "Serving layer",
              "Expose and manage model requests",
              "Application policy and task evaluation remain separate",
            ],
          ],
        ),
        p(
          "Quantized artifacts, sharding, local staging and retained warm replicas target different parts of this path. The correct optimization depends on where startup or serving time is spent.",
        ),
      ),
      chapter(
        "Scale-up and scale-out belong to the topology",
        "A box label is not a universal performance prediction.",
        p(
          "Tightly coupled GPU domains use supported scale-up interconnects such as NVLink/NVSwitch. Separate nodes or domains require a scale-out fabric. Platforms and integrated systems package these resources differently. Tensor synchronization, pipeline activations and KV transfer can stress different paths.",
        ),
        p(
          "Read the actual system’s device topology, memory capacity, network support and runtime configuration. Do not treat one generation’s device count or advertised fabric bandwidth as an invariant for all systems with the same family name.",
        ),
      ),
      chapter(
        "Serving choices are not a required linear chain",
        "Packaging changes operational work, not the meaning of the task.",
        table(
          ["Choice", "What to investigate", "What remains your responsibility"],
          [
            [
              "NIM-based service",
              "Supported model, backend/profile and container configuration",
              "Task quality, route policy, workload/SLO and deployment validation",
            ],
            [
              "Triton-based service",
              "Configured model backend and serving integration",
              "Correct backend, model lifecycle and application behavior",
            ],
            [
              "Another engine",
              "Supported model/runtime and operational features",
              "Equivalent workload testing and safe release policy",
            ],
          ],
        ),
        p(
          "A packaged service can reduce integration work but is not proof that it is the optimal configuration for every workload. Keep functional behavior, model quality and serving performance as independent evaluation dimensions.",
        ),
      ),
    ],
    example(
      "A startup optimization and a serving optimization",
      table(
        [
          "Action",
          "Potential stage affected",
          "What it does not automatically solve",
        ],
        [
          [
            "Keep model artifacts on nearby NVMe",
            "Artifact retrieval",
            "Device tensor loading or prefix warmth",
          ],
          [
            "Retain a model-ready replica",
            "Startup before serving",
            "Task capability or queue imbalance",
          ],
          [
            "Choose suitable TP topology",
            "Distributed execution / fit",
            "Application-level routing quality",
          ],
          [
            "Use compatible prefix reuse",
            "Repeated prefill",
            "Long-output decode work",
          ],
        ],
      ),
    ),
    [
      "Switch between the two serving choices in the explorer.",
      "Explain why neither choice needs to be a mandatory hop through the other.",
      "Identify which memory tier holds active GPU KV state.",
    ],
    [
      "Equating persistent artifact size with active HBM needs.",
      "Using platform names as an unsupported speed ranking.",
      "Presenting NIM → Triton as a universal consecutive architecture.",
    ],
  ),
  "cache-aware-placement": guide(
    [
      "Construct compatible prefix identity and separate it from semantic similarity.",
      "Explain approximate, event-driven and speculative cache knowledge.",
      "Balance saved prefill, queueing and eligibility under stale information.",
    ],
    [
      [
        "Cache index",
        "Metadata mapping eligible state identities to likely/observed owners.",
      ],
      [
        "Speculative entry",
        "Expected state recorded before confirmed residency/completion.",
      ],
      [
        "Eviction event",
        "A signal that previously retained state is no longer available.",
      ],
      [
        "Affinity score",
        "A routing preference for useful state, not an eligibility override.",
      ],
    ],
    [
      chapter(
        "Cache identity represents computation",
        "A suffix is not independently reusable merely because its text matches.",
        formula(
          "Conceptual chained identity",
          "hᵢ = H(hᵢ₋₁, token blockᵢ, relevant execution identity)",
          "Relevant identity can include model/version, adapters, media and isolation salt. This is pseudocode, not a mandated hash implementation.",
        ),
        p(
          "Changing an early block changes the preceding identity used by later blocks. Exact tokenization, chat templates and prompt order therefore matter. A text-only approximation can be cheaper at the router but does not prove that the engine’s exact compatible block exists. The engine validates actual reuse.",
        ),
        p(
          "Isolation can deliberately prevent otherwise identical tenant prompts from sharing an identity. Cache hit maximization must not override the platform’s data-isolation policy.",
        ),
      ),
      chapter(
        "Know what the index knows",
        "Precise identity does not imply zero observation delay.",
        table(
          ["Knowledge path", "Evidence", "Possible error"],
          [
            [
              "Routing-history approximation",
              "Where the router previously sent a prefix",
              "Eviction/restart or engine behavior changes residency",
            ],
            [
              "Cache-event index",
              "Compatible store/remove events",
              "Delayed, lost or reordered observations",
            ],
            [
              "Speculative indexing",
              "Expected state from an in-flight request",
              "Producer not finished or failed",
            ],
            [
              "Engine check",
              "Current valid blocks at execution",
              "Reuse can still require admission or transfer",
            ],
          ],
        ),
        p(
          "Store/remove event handling, endpoint epochs, expiration, reconciliation and in-flight ownership are important consistency concerns. A stale entry should lead to a safe miss/recompute or another defined path, not reading invalid tensors. Distinguish metadata confidence from physical state validity.",
        ),
      ),
      chapter(
        "Filter, score, pick, then validate",
        "Maximum hit rate is not the complete objective.",
        steps(
          "Filter wrong model/version/role, unhealthy endpoints and policy violations.",
          "Find eligible prefix-match candidates and estimate saved token work.",
          "Combine queue delay, memory pressure, transfer and missing-prefill cost.",
          "Pick a destination under the chosen workload objective.",
          "Have the engine verify actual state and record reuse/miss evidence.",
        ),
        formula(
          "Lab’s toy path cost",
          "Estimated queue ms + missing prefix tokens × 0.5 ms",
          "This is an assigned linear teaching cost, not a performance model for real engines.",
        ),
        p(
          "Locality-only routing can concentrate arrivals on a warm endpoint. Round robin can throw away locality. Compare both with a balanced policy using TTFT tails, goodput, actual computed prefill, matched tokens, evictions, request distribution and picker overhead.",
        ),
      ),
    ],
    example(
      "A stale index can select the wrong warm endpoint",
      table(
        [
          "Replica",
          "Queue",
          "Observed cached prefix",
          "Actual state after eviction",
        ],
        [
          ["A", "600 ms", "1,000 tokens in stale index", "0 tokens"],
          ["B", "20 ms", "500 tokens", "500 tokens"],
          ["C", "0 ms", "1,000 tokens", "Wrong model: excluded"],
        ],
      ),
      formula(
        "With cache-only stale knowledge",
        "A estimated 600 ms; actual toy path 600 + 1,000 × 0.5 = 1,100 ms",
        "Current events reveal A’s miss; B costs 20 + 500 × 0.5 = 270 ms. C must remain excluded regardless of its apparent cache advantage.",
      ),
    ),
    [
      "Select cache-only policy, evict A, and compare stale versus current knowledge.",
      "Select the queue-plus-missing-prefill policy and inspect its route.",
      "Explain why matched token volume and user latency matter alongside hit percentage.",
    ],
    [
      "Treating routing history as proof of current residency.",
      "Allowing a cache score to override model or tenant compatibility.",
      "Claiming a high hit rate proves high SLO goodput.",
    ],
  ),

  "conversation-affinity": guide(
    [
      "Evaluate route choices across turns rather than only the latest message.",
      "Distinguish model affinity, replica affinity and transferable state.",
      "Define when a hybrid policy should deliberately break affinity.",
    ],
    [
      [
        "Warm continuation",
        "A turn can use compatible retained prefix state on a reachable path.",
      ],
      [
        "Migration",
        "Move execution to a different destination, with transfer or recomputation as needed.",
      ],
      [
        "Session reset",
        "A change that deliberately ends or invalidates the prior context/affinity expectation.",
      ],
      [
        "Successful-task cost",
        "All attempts and work required to reach an acceptable outcome.",
      ],
    ],
    [
      chapter(
        "The conversation has accumulated computational value",
        "A new short turn can refer to a long history.",
        p(
          "Earlier prompt processing produced reusable intermediate state at specific engines or cache locations. A per-turn router that sees only the newest message can ignore thousands of history tokens, previous tool results, and the benefit of a retained prefix. The next request’s cost includes the effective context, not only the new text.",
        ),
        table(
          ["Affinity", "Potential benefit", "What it cannot guarantee"],
          [
            [
              "Same model",
              "Avoid incompatible model-state switch",
              "Local residency or an uncongested endpoint",
            ],
            [
              "Same replica",
              "Opportunity to find local retained blocks",
              "Indefinite retention or adequate capacity",
            ],
            [
              "Compatible remote state",
              "Potential reuse after movement",
              "Cheap transfer or immediate readiness",
            ],
          ],
        ),
        p(
          "A different model can replay the text but should not be assumed able to consume the original model’s KV tensors. Staying on the same model but losing the replica can also make the history cold.",
        ),
      ),
      chapter(
        "Use affinity as a preference with explicit exceptions",
        "Permanent stickiness can become a hotspot.",
        list(
          "Keep the warm path when the task, policy, health and load still make it suitable.",
          "Reconsider on task/capability change, context-limit growth, failure or overload.",
          "Treat explicit conversation reset and model-version change as state transitions.",
          "Compare migration/transfer with recomputation and queueing before breaking locality.",
          "Avoid a policy that silently violates eligibility to preserve a hit.",
        ),
        p(
          "A hybrid policy needs route reasons and a definition of session scope. Independent extraction requests may not benefit from long-lived affinity, while a document-heavy multi-turn workflow often can. Evaluate both types rather than generalize from one demo.",
        ),
      ),
      chapter(
        "Measure the whole interaction",
        "A successful final response can hide repeated wasted work.",
        steps(
          "Replay fixed conversations with identical histories and task outcomes.",
          "Compare fixed-model, stateless per-turn and session-aware policies.",
          "Record all model/provider/replica switches, attempts and reasons.",
          "Track recomputed prefill, actual hits, transferred state, queue imbalance and warm/cold TTFT.",
          "Report total task latency, quality and cost, not only one call’s token price.",
        ),
        p(
          "Tail behavior matters particularly when several calls must finish. A route that looks cheap in isolation can be expensive after another prefill or retry.",
        ),
      ),
    ],
    example(
      "Why a smaller model can start the next answer later",
      table(
        [
          "Assigned continuation path",
          "Queue + prompt work",
          "Initial work estimate",
        ],
        [
          ["Warm suitable model", "100 ms + 50 ms suffix", "150 ms"],
          ["New smaller model", "20 ms + 500 ms history prefill", "520 ms"],
          ["Warm but overloaded original", "600 ms + 50 ms suffix", "650 ms"],
        ],
      ),
      p(
        "Synthetic values show both sides of the decision: a smaller model can lose to preserved state, but severe overload can justify migration. The app does not rank actual models.",
      ),
    ),
    [
      "Toggle a model switch and compare the prompt-work stage.",
      "Compare local, remote and evicted prefix paths.",
      "Describe the evidence that would justify leaving a warm but overloaded replica.",
    ],
    [
      "Counting only the latest message’s tokens.",
      "Treating cache affinity as an unconditional routing rule.",
      "Using unrelated model tensors as if they were portable conversation memory.",
    ],
  ),

  "capacity-planning": guide(
    [
      "Derive warm-replica needs from measured SLO goodput.",
      "Use steady-state concurrency and startup backlog with their assumptions.",
      "Budget node allocatable capacity and realistic failure reserve.",
    ],
    [
      [
        "Capacity knee",
        "Load region where additional offered work sharply worsens latency or failures.",
      ],
      [
        "Warm capacity",
        "Ready usable replicas available before a demand surge.",
      ],
      [
        "N+1",
        "A reserve for one specified unit’s loss; state what the unit is.",
      ],
      [
        "Little’s law",
        "For a stable system, average work in the system = arrival/completion rate × average time in system.",
      ],
    ],
    [
      chapter(
        "Find the safe operating point first",
        "A peak tokens/sec result is not a serving-capacity number.",
        p(
          "Define workload distributions and an SLO, then sweep offered load or controlled concurrency. Measure successful completions, TTFT, cadence, full latency, queue growth and memory pressure. Choose an operating point that meets the targets with room for variance rather than the absolute highest attained throughput.",
        ),
        p(
          "Short unique prompts, shared long prefixes, long unique prompts, long outputs and multimodal inputs can have different safe rates. Maintain separate workload buckets or a measured representative mix. A quantized artifact fitting in memory is only the first constraint.",
        ),
        formula(
          "Equal independent replicas",
          "Minimum ready replicas = ceil(peak arrival rate / measured safe per-replica goodput)",
          "The rates must refer to the same workload and success/SLO criteria. Routing and shared bottlenecks can invalidate simple linear scaling.",
        ),
      ),
      chapter(
        "Demand duration and startup are different constraints",
        "Autoscaling cannot serve yesterday’s queue before it becomes ready.",
        formula(
          "Stable average concurrency",
          "L = λ × W",
          "At 10 completed requests/s and 2 s average time in a stable system, average in-system work is 20 requests. This is not an overload calculation or a tail-concurrency guarantee.",
        ),
        formula(
          "Simple startup backlog",
          "max(0, arrival − current usable service rate) × time to new ready capacity",
          "Assumes constant rates over the interval, no abandonment, and a sufficiently large queue. Add drain time, bursts and service variability in a real plan.",
        ),
        p(
          "Warm minimum replicas, forecast/pre-scale and bounded queueing address delays that reactive pod scaling cannot remove. A new container still needs a loaded, initialized model before it adds useful capacity.",
        ),
      ),
      chapter(
        "Make reserve physical and failure-aware",
        "One spare replica is not always one spare node.",
        table(
          ["Constraint", "Calculation / question"],
          [
            [
              "Per-node slots",
              "min(floor(allocatable CPU / pod CPU request), floor(allocatable RAM / pod RAM request)), plus devices and placement constraints",
            ],
            ["Replica loss", "Can remaining ready replicas serve peak demand?"],
            ["Node/domain loss", "How many replicas disappear together?"],
            [
              "Rollout coexistence",
              "Can candidate and old revision fit while maintaining readiness?",
            ],
            [
              "Queue limit",
              "What happens when accepted work cannot meet its deadline?",
            ],
          ],
        ),
        p(
          "For a node with 32 allocatable vCPUs and 112 GiB RAM, pods requesting 12 vCPUs and 40 GiB fit only two under this CPU/RAM-only example. Four replicas across two such nodes leave only two after losing one node. If three are required, “four total” is replica N+1 but not node-failure-safe capacity.",
        ),
      ),
    ],
    example(
      "12 requests/s, safe 5 requests/s per replica",
      formula(
        "Minimum and one-replica reserve",
        "ceil(12 / 5) = 3 ready replicas; simple replica N+1 = 4",
        "This does not establish independent failure domains or rollout capacity.",
      ),
      formula(
        "Two warm replicas during 60 seconds of startup",
        "(12 − 2 × 5) × 60 = 120 queued requests",
        "After new capacity arrives, backlog still needs to drain. Check waiting deadlines and overload policy.",
      ),
    ),
    [
      "Use the capacity lab to reproduce three minimum replicas, four with a one-replica reserve, and 120 queued requests.",
      "Raise the measured safe rate and explain which results change.",
      "Name a failure or placement assumption not represented by the simple calculator.",
    ],
    [
      "Using configured request targets as measured safe goodput.",
      "Applying Little’s law to a growing unstable queue without qualification.",
      "Calling one spare replica protection against every node or domain failure.",
    ],
  ),

  "demand-driven-scaling": guide(
    [
      "Trace metric collection through pod and node scaling to model readiness.",
      "Separate a configured autoscaling target from measured safe capacity.",
      "Interpret the source workload experiments without generalizing their hardware results.",
    ],
    [
      ["Prometheus", "Collects the selected measured time-series signals."],
      [
        "KEDA / HPA",
        "Uses configured scaling logic/targets to request replica changes.",
      ],
      [
        "Node autoscaler",
        "Adds/removes eligible infrastructure capacity under its configured policy.",
      ],
      [
        "Usable scale-out",
        "New replicas are placed, initialized, ready and able to admit useful work.",
      ],
    ],
    [
      chapter(
        "Two control loops act on different resources",
        "Requested pods and node capacity are not the same output.",
        flow(
          "Running / waiting request signals",
          "Metric collection",
          "Desired replica calculation",
          "Pod placement",
          "Node capacity if required",
          "Load model → Ready",
        ),
        p(
          "In the recorded lab, eight running requests with a target of four requested two replicas. A replacement/additional pod could not fit and remained Pending until infrastructure capacity was added. KEDA requested pods; the node autoscaler addressed the placement capacity. Neither event by itself proved model readiness.",
        ),
        formula(
          "Lab’s simplified target rule",
          "Desired = max(minimum, ceil(active requests / target))",
          "This explains the displayed rule. Production scaler behavior also depends on metric definitions, aggregation, polling, stabilization and configured bounds.",
        ),
      ),
      chapter(
        "Choose signals and timing deliberately",
        "Utilization alone can miss queues and phase differences.",
        list(
          "Define whether the signal is running, waiting, total in-system work or another measure.",
          "Validate the target against workload-specific SLO goodput.",
          "Measure collection/polling delay and time from scale request to usable engine.",
          "Set deliberate minimum/maximum replicas and scale-down behavior.",
          "Ensure node provisioning can satisfy requests, labels, devices and limits.",
          "Keep overload handling explicit while the scale-out chain completes.",
        ),
        p(
          "A steady low-utilization snapshot may coexist with admission pressure or an idle-but-unready new pod. Cache-rich work can have different prefill demand from unique prompts at the same active-request count.",
        ),
      ),
      chapter(
        "Read the source case study as evidence, not a predictor",
        "The experiments changed workload shape while observing the serving path.",
        table(
          [
            "Author’s recorded workload",
            "Approx. p95 TTFT",
            "Approx. chunk cadence",
            "Output throughput",
          ],
          [
            ["Short unique prompts", "144 ms", "34 ms", "41.5 tokens/s"],
            ["Long unique prompts", "764 ms", "36 ms", "32.4 tokens/s"],
            ["Shared long prefix", "172 ms", "36.5 ms", "39.9 tokens/s"],
            ["Longer output", "146 ms", "35.6 ms", "41.7 tokens/s"],
          ],
        ),
        p(
          "The shared-prefix case reported about 53% cache hits. The longer-output case had about 16 s p95 end-to-end latency. Chunk cadence is not guaranteed token-level ITL. These are source-lab observations under its configuration, not expected measurements for a different cluster.",
        ),
        image(
          "/article-images/cf8ie-2.png",
          "Author’s long unique prompt workload dashboard",
          "Original long-unique-prompt case. Use its workload and measurement boundary when interpreting the chart.",
        ),
        image(
          "/article-images/cf8ie-3.png",
          "Author’s shared-prefix workload dashboard",
          "Original shared-prefix case. More reuse coincided with lower TTFT in this recorded experiment.",
        ),
      ),
    ],
    example(
      "Desired two does not mean two usable replicas",
      table(
        ["Milestone", "Replica state", "Serving implication"],
        [
          [
            "Metric asks for two",
            "One existing ready replica",
            "No added capacity yet",
          ],
          [
            "New pod Pending",
            "Requests do not fit",
            "Queue may continue growing",
          ],
          [
            "Node joins / pod starts",
            "Engine initializing",
            "Still not usable serving",
          ],
          [
            "Model becomes Ready",
            "Two usable replicas",
            "Routing and prefix warmth still need attention",
          ],
        ],
      ),
      image(
        "/article-images/cf8ie-5.png",
        "Old model-serving pod Running while the new pod is Pending",
        "Original source pod-state observation. Inspect scheduling events to determine the actual Pending reason.",
      ),
    ),
    [
      "Set eight active requests, target four, and one available slot.",
      "Step until model readiness and distinguish both autoscaling layers.",
      "Switch the recorded workload case without treating its numbers as slider predictions.",
    ],
    [
      "Calling desired or Running pods ready capacity.",
      "Using a target of four as proof of safe capacity.",
      "Generalizing the author’s measured throughput to different hardware.",
    ],
  ),

  "cold-start-readiness": guide(
    [
      "Break startup into infrastructure, artifacts, runtime and model stages.",
      "Separate model warmth from prefix/cache warmth.",
      "Choose mitigations that remove the actual expensive stage.",
    ],
    [
      [
        "Time to usable capacity",
        "Elapsed time from the defined scale/provision event to serving readiness.",
      ],
      [
        "Image warmth",
        "The container image is already near the execution node.",
      ],
      ["Artifact warmth", "Model files are available near the loader."],
      [
        "Prefix warmth",
        "Compatible retained prompt state is available for reuse.",
      ],
    ],
    [
      chapter(
        "A pod-start event is not the end of startup",
        "Initialization can involve several expensive movement and compute steps.",
        steps(
          "Provision or choose a node and initialize the necessary drivers/services.",
          "Obtain the container image and start its process.",
          "Locate and retrieve model/tokenizer artifacts.",
          "Deserialize tensors, initialize worker groups, and place weights on their execution devices.",
          "Allocate cache/workspaces and initialize supported execution paths, kernels or graphs.",
          "Validate usable inference and publish readiness.",
        ),
        p(
          "Stages can overlap or be skipped depending on the configuration. Measure their timestamps rather than assigning all delay to “loading the model.” Distributed-worker initialization, artifact contention or a failing readiness check can dominate in a particular deployment.",
        ),
      ),
      chapter(
        "Warmth has several meanings",
        "A locally available file is not a warm conversation.",
        table(
          ["Mitigation", "Potentially avoids", "Does not automatically avoid"],
          [
            [
              "Warm node pool",
              "Infrastructure provisioning",
              "Image/model/engine initialization",
            ],
            ["Pre-pulled image", "Image retrieval", "Weight tensor creation"],
            [
              "Nearby model files",
              "Remote artifact fetch",
              "Deserialization and device placement",
            ],
            [
              "Retained ready replica",
              "Most model startup",
              "Queueing or cold prefixes",
            ],
            [
              "Retained compatible prefix",
              "Some repeated prefill",
              "Container/model startup for an absent engine",
            ],
          ],
        ),
        p(
          "A newly Ready replica can receive requests with no useful retained prefix. Scale-out can therefore increase compute capacity and dilute cache locality at the same time. Routing and warmup policy should distinguish both effects.",
        ),
      ),
      chapter(
        "Make readiness an inference contract",
        "An open port can precede usable model execution.",
        list(
          "Record the event from which startup time is measured.",
          "Check artifact, image and runtime identities to keep comparisons fair.",
          "Define readiness so it reflects a loaded usable model, not only a process.",
          "Observe memory setup, first functional inference and later warm-prefix behavior separately.",
          "Protect downstream services from bursts of simultaneous artifact retrieval.",
          "Keep enough warm capacity for arrival bursts or schedule pre-warm when appropriate.",
        ),
        p(
          "Avoid a readiness test that accidentally changes the workload or fills a cache without recording it. A bounded warmup can be useful, but it becomes part of the readiness and cache condition being measured.",
        ),
      ),
    ],
    example(
      "A storage bound is not full startup time",
      formula(
        "Assigned artifact-transfer lower bound",
        "32 GiB / 8 GiB/s effective retrieval = 4 seconds",
        "These are invented teaching conditions. Tensor creation, movement, worker initialization and execution warmup can add time after retrieval.",
      ),
      p(
        "If the weights are already on local NVMe, only the retrieval stage is reduced. The ready engine can still have a cold context cache for the first real conversation.",
      ),
    ),
    [
      "Toggle warm nodes, images and local weights one at a time.",
      "Identify the specific stage each change affects.",
      "Explain how to measure time to Ready separately from warm-prefix TTFT.",
    ],
    [
      "Calling Running or an open health port inference-ready without validation.",
      "Treating local files as already resident device tensors.",
      "Confusing pre-warmed model execution with all conversations being cached.",
    ],
  ),

  "benchmark-design": guide(
    [
      "Define the system boundary and a reproducible workload matrix.",
      "Separate offered load, completions, task success and SLO goodput.",
      "Use arrival mode, cache conditions, repeated runs and tails correctly.",
    ],
    [
      [
        "Open loop",
        "Send arrivals according to the offered process without waiting for every previous completion.",
      ],
      [
        "Closed loop",
        "A fixed population submits replacement work after completion.",
      ],
      [
        "Attained rate",
        "Observed completion/output rate under the measured run.",
      ],
      [
        "Benchmark card",
        "Configuration, method, workload and conditions needed to interpret a result.",
      ],
    ],
    [
      chapter(
        "A benchmark is a conditional claim",
        "Different tests measure different layers.",
        table(
          ["Test boundary", "Answers", "Does not establish"],
          [
            [
              "Local execution path",
              "How this runtime/model executes a defined shape",
              "Remote endpoint or workflow experience",
            ],
            [
              "Serving endpoint",
              "Behavior under a client workload and load process",
              "Universal model quality or all workload shapes",
            ],
            [
              "Standardized system benchmark",
              "A prescribed comparable procedure",
              "Your application’s untested workload",
            ],
            [
              "Complete workflow",
              "User task behavior across calls and tools",
              "Which internal stage is responsible without traces",
            ],
          ],
        ),
        p(
          "Pin artifact and tokenizer, template, precision, runtime/image, hardware/topology, workload distribution, sampling/output limits, arrival model and cache condition. Retain failures and cancellation behavior. A headline rate without this card is difficult to reproduce or compare.",
        ),
      ),
      chapter(
        "Offered work and useful work are different",
        "A growing queue can hide behind attained throughput.",
        formula(
          "SLO goodput",
          "Number of successful completions meeting all defined SLO conditions / elapsed test duration",
          "Include task-quality conditions when the benchmark claims useful task outcomes.",
        ),
        p(
          "Closed-loop clients slow their offered rate when responses become slower. Open-loop arrivals can keep coming and expose queue buildup. Neither is universally the right test; choose the one matching the question and report both the offered and attained rates where relevant.",
        ),
        p(
          "Do not label configured output limits as actual generated lengths. Do not silently drop failed requests or stop the measurement before the accepted queue drains without explaining the window. These choices can inflate apparent throughput or hide unacceptable latency.",
        ),
      ),
      chapter(
        "Control state and uncertainty",
        "Warmth and a few tail observations can change the conclusion.",
        steps(
          "Run a reproducible baseline and a planned input/output/load matrix.",
          "Separate cold model, cold prefix and warm-prefix conditions.",
          "Use sufficient repeated measurements and request-level samples.",
          "Compare success, TTFT, cadence, full latency, queues and resource pressure.",
          "Preserve raw traces and plot distributions by workload bucket.",
        ),
        p(
          "A tiny run’s p99 is mostly a statement about a handful of observations, not strong evidence of a production tail. Repeating a noisy test and explaining variance is better than selecting the best run. Quality and performance changes may need independent evaluations.",
        ),
      ),
    ],
    example(
      "Five completed requests, only two meet both limits",
      table(
        [
          "Synthetic trace",
          "TTFT",
          "Token interval",
          "Outcome under 500 / 50 ms limits",
        ],
        [
          ["R1", "120 ms", "30 ms", "Pass"],
          ["R2", "260 ms", "45 ms", "Pass"],
          ["R3", "710 ms", "35 ms", "TTFT fail"],
          ["R4", "340 ms", "90 ms", "Cadence fail"],
          ["R5", "220 ms", "40 ms", "Request failed"],
          ["R6", "850 ms", "80 ms", "Both latency limits fail"],
        ],
      ),
      formula(
        "Ten-second window",
        "Completed throughput = 5/10 = 0.5 req/s; SLO goodput = 2/10 = 0.2 req/s",
        "These fixed traces are teaching data, not a run against your hardware.",
      ),
    ),
    [
      "Tighten each SLO limit and inspect which traces no longer qualify.",
      "Explain why the arrival-mode switch does not regenerate the fixed synthetic sample.",
      "Write a benchmark card before making a model/server comparison.",
    ],
    [
      "Calling any tokens/sec number interchangeable.",
      "Using closed-loop slowdown as proof the service can sustain the original offered rate.",
      "Publishing tails without enough samples or known cache conditions.",
    ],
  ),

  "agent-inference": guide(
    [
      "Model a task as calls, tool waits, state transitions and retries.",
      "Explain repeated prefill and prompt growth after tool results.",
      "Evaluate success and latency for the complete workflow.",
    ],
    [
      [
        "Tool wait",
        "External work between model stages that still contributes to user task time.",
      ],
      [
        "Task graph",
        "Dependencies and possible branches among workflow stages.",
      ],
      [
        "Context growth",
        "Additional messages/evidence that increase later input.",
      ],
      [
        "Retry amplification",
        "Extra attempts that consume resources and extend latency.",
      ],
    ],
    [
      chapter(
        "Endpoint behavior is only one part of the task",
        "Different model calls can have different work shapes.",
        flow(
          "Interpret task / choose tool",
          "External tool wait",
          "Process returned evidence",
          "Decide next action",
          "Synthesize final answer",
        ),
        p(
          "A short structured tool-selection call can be followed by a large evidence prefill and a long final generation. During a tool wait the GPU may serve other work, but the user’s task is still incomplete. A single request benchmark cannot describe this whole path.",
        ),
        p(
          "Retries, branches and parallel independent calls alter the task graph. Model calls that depend on a tool result cannot be started safely before that result exists. Parallelism must follow actual dependencies rather than treating every stage as interchangeable.",
        ),
      ),
      chapter(
        "Manage context as a resource",
        "Repeated history can multiply work across a workflow.",
        list(
          "Keep stable shared prefixes ordered consistently when possible.",
          "Bound tool output and retain evidence needed for the task instead of dumping every result.",
          "Use explicit structured state outside the prompt where the application design supports it.",
          "Record resets, model switches, migrations and actual cache reuse.",
          "Treat summaries/compression as quality-changing transformations and evaluate them.",
        ),
        p(
          "New tool evidence is not made free by reusing an earlier prefix. It still needs processing. Reordering prior messages or inserting new metadata near the start can invalidate otherwise reusable leading blocks.",
        ),
      ),
      chapter(
        "Report the complete outcome",
        "Stage targets can compound into a weaker all-stage result.",
        formula(
          "Specific independent-event teaching assumption",
          "P(all five stages meet their individual target) = 0.95⁵ ≈ 77.4%",
          "This is not the workflow’s p95 latency and does not apply without the stated independence assumption. Shared failures and correlated queues change the result.",
        ),
        p(
          "Track total task time, all calls/tokens, tool delays, retries, failures, final quality and cost per successful task. Correlate endpoint traces with the workflow so you can distinguish compute, queue and external bottlenecks. A fast average endpoint can coexist with a poor end-user task.",
        ),
      ),
    ],
    example(
      "Five model calls with four external waits",
      formula(
        "Assigned serial workflow",
        "5 × 1 s model work + 4 × 2 s tool wait = 13 s task time",
        "Model time is five seconds; the user does not receive the complete result after five seconds. The example omits retries, prompt growth and parallel branches.",
      ),
      p(
        "If the final synthesis receives a large tool result, its prefill may be much larger than the earlier routing call. Record stage-specific shapes instead of dividing thirteen seconds by five and calling it model latency.",
      ),
    ),
    [
      "Set five calls and two-second tool gaps in the explorer.",
      "Change per-stage target probability and inspect the all-stage teaching result.",
      "Identify a retry and a prompt-growth condition that the toy timeline omits.",
    ],
    [
      "Removing tool waits from user-visible task time.",
      "Assuming every stage’s p95 implies task p95.",
      "Treating reused history as making new tool output free.",
    ],
  ),

  "multimodal-serving": guide(
    [
      "Trace media preparation, encoding, effective context and generation.",
      "Separate embedding reuse from KV-prefix reuse.",
      "Account for input shapes and evidence-quality tradeoffs.",
    ],
    [
      [
        "Effective prompt",
        "The model-ready representation, which can be much larger than visible text.",
      ],
      [
        "Media preparation",
        "Fetch, decode, sample, resize, tile or chunk input.",
      ],
      ["Embedding cache", "Retains compatible encoded media representations."],
      [
        "Shape bucket",
        "Group of inputs with similar execution-relevant dimensions.",
      ],
    ],
    [
      chapter(
        "The hidden work arrives before LLM prefill",
        "File size and text length are incomplete workload descriptors.",
        flow(
          "Fetch / decode media",
          "Resize / tile / select frames",
          "Modality encoder",
          "Construct model-ready prompt",
          "LLM prefill",
          "Decode answer",
        ),
        p(
          "Image resolution and tiling, retained video frames, audio duration/chunks and encoder output shape can drive work. A compressed file can be small while its decoded or encoded representation is large. Common embedding-insertion models expand the sequence; resamplers and cross-attention designs need architecture-specific state accounting.",
        ),
        table(
          ["Input", "Useful workload descriptors", "Possible missed evidence"],
          [
            [
              "Image",
              "Processed resolution, tiles and encoder representation",
              "Small chart labels or objects",
            ],
            [
              "Video",
              "Retained frames, time coverage and per-frame shape",
              "A brief event between sampled frames",
            ],
            [
              "Audio",
              "Duration, chunks and representation",
              "Short or low-volume content lost in preprocessing",
            ],
          ],
        ),
      ),
      chapter(
        "Two caches remove different stages",
        "A hit at one stage does not prove reuse at another.",
        table(
          ["Cache", "Potential saving", "Compatibility and lifetime"],
          [
            [
              "Media/embedding cache",
              "Skip eligible preparation/encoder work",
              "Same relevant media, processing and encoder identity",
            ],
            [
              "LLM KV prefix",
              "Skip eligible LLM prompt work",
              "Matching leading model state, tokens/media identity and retained blocks",
            ],
          ],
        ),
        p(
          "An embedding hit can still be followed by cold LLM prefill. A KV hit needs compatible state at a usable location and may have a restore path. Track each layer’s hits, saved work and transfer separately. Architecture can change where these opportunities exist.",
        ),
      ),
      chapter(
        "Schedule shapes and preserve evidence",
        "Less work is not a win if the task becomes wrong.",
        list(
          "Bucket by processed media shapes and effective context, not just file extension.",
          "Measure preparation, encoder, LLM, queue and transfer stages separately.",
          "Observe tails when heterogeneous items share a batch.",
          "Compare fewer tiles/frames with task-quality outcomes, including small/brief evidence.",
          "Record cache conditions and exact preprocessing/version identity.",
          "Keep ingress limits explicit for oversized or unsupported media.",
        ),
        p(
          "A policy that discards frames can improve latency while losing the event the user asked about. Evaluate success and resource use together.",
        ),
      ),
    ],
    example(
      "A hypothetical image expands the sequence",
      formula(
        "Assigned embedding-insertion representation",
        "4 media units × 256 positions/unit + 128 text tokens = 1,152 input positions",
        "256 is an invented example, not a universal visual-token count.",
      ),
      formula(
        "Example raw KV",
        "1,152 × 128 KiB = 144 MiB; adding 64 generated positions reaches 152 MiB",
        "This uses the earlier hypothetical full-attention architecture. Different multimodal designs need different accounting.",
      ),
    ),
    [
      "Change tile/frame count and inspect preparation before prefill.",
      "Toggle only embedding reuse, then only compatible prefix reuse.",
      "Explain why lowering frame count needs a quality test.",
    ],
    [
      "Sizing a multimodal request from its short text prompt alone.",
      "Calling any media cache hit a KV cache hit.",
      "Claiming a fixed token count per image for every model.",
    ],
  ),

  "routing-policy": guide(
    [
      "Separate mandatory eligibility from preferences.",
      "Distinguish direct, quality-cascade and availability-fallback attempts.",
      "Evaluate route decisions, whole-task cost and policy errors.",
    ],
    [
      [
        "Hard gate",
        "A requirement that cannot be compensated by another score.",
      ],
      [
        "Cascade",
        "A planned earlier attempt followed by task-quality-based escalation.",
      ],
      ["Fallback", "An alternate eligible route after failure/unavailability."],
      [
        "Policy evaluation",
        "Measure the outcomes of route choices, not only model endpoint capability.",
      ],
    ],
    [
      chapter(
        "Define the contract before the score",
        "Mandatory failures are not preferences.",
        list(
          "Context must fit the effective input and output requirement.",
          "Required tool/schema behavior must be supported and evaluated.",
          "Provider/region/model version must meet policy.",
          "Health, quotas and availability must permit an attempt.",
          "Task-quality expectations must be backed by representative evaluation.",
        ),
        p(
          "Only eligible candidates should be ranked by cost, latency, state affinity or other preferences. A gateway can execute a deterministic or custom policy without implying a newly trained model router. Separate policy execution from learning the policy.",
        ),
      ),
      chapter(
        "Attempts have different causes and costs",
        "A cascade and a fallback are not the same event.",
        table(
          ["Path", "Trigger for another attempt", "What to evaluate"],
          [
            [
              "Direct",
              "No planned second attempt",
              "Whether the first route meets requirements",
            ],
            [
              "Cascade",
              "Task-specific check rejects an earlier answer",
              "Checker errors, added model work and task success",
            ],
            [
              "Fallback",
              "Preferred path is unavailable/fails",
              "Failure handling, eligibility and retry latency",
            ],
          ],
        ),
        p(
          "A quality check can be wrong. A cascade needs representative validation of both the earlier model and the escalation decision. A fallback should preserve mandatory contracts; silently falling back to an ineligible region or unsupported tool model is not resilience.",
        ),
        p(
          "Retries and cascades can repeat prefill and generate discarded output. Count all attempts, tokens and delays in successful-task cost and tail latency.",
        ),
      ),
      chapter(
        "Retain route reasons and compare alternatives",
        "Aggregate pass rate can hide broken workload slices.",
        steps(
          "Build labeled representative tasks, including structured/tool failures and long contexts.",
          "Compare a fixed baseline route with the candidate policy.",
          "Record eligibility exclusions, selections, route reasons and every additional attempt.",
          "Evaluate final task success, JSON/tool contracts, tails and cost per outcome.",
          "Replay complete sessions when cached context and switching matter.",
        ),
        p(
          "Routing regret is meaningful only relative to a stated alternative and objective. Do not claim a single universal best model or policy from one mixed average.",
        ),
      ),
    ],
    example(
      "Cheap but ineligible is not a tradeoff",
      table(
        [
          "Fictional candidate",
          "JSON",
          "Tools",
          "Approved region",
          "Eligibility when all required",
        ],
        [
          ["Small", "Yes", "No", "Yes", "Excluded: missing tools"],
          ["General", "Yes", "Yes", "Yes", "Eligible"],
          ["External", "Yes", "Yes", "No", "Excluded: policy"],
        ],
      ),
      p(
        "Capabilities here are invented to explain gates. They are not actual provider rankings. After filtering, a direct/cascade/fallback policy can operate only among suitable destinations.",
      ),
    ),
    [
      "Require tools and inspect which destinations remain.",
      "Switch attempt policy and explain why the second attempt occurs.",
      "Identify an evaluation that checks route quality rather than HTTP availability.",
    ],
    [
      "Letting a low price compensate for a hard-policy violation.",
      "Treating every second attempt as a quality cascade.",
      "Counting only final-call cost or ignoring escalation-check errors.",
    ],
  ),

  "moe-routing": guide(
    [
      "Locate expert selection inside model computation rather than application routing.",
      "Explain top-k selection, dispatch, combination and load imbalance.",
      "Distinguish active computation from total stored parameters.",
    ],
    [
      ["Expert", "A specialized subnetwork within an MoE model layer."],
      [
        "Gate",
        "Model computation selecting/scoring experts for a token representation.",
      ],
      [
        "Top-k",
        "Choose a configured number of experts from scored candidates.",
      ],
      [
        "Expert parallelism",
        "Place experts across devices and move token representations to their owners.",
      ],
    ],
    [
      chapter(
        "The gate is part of the forward pass",
        "The application normally chooses the model, not an expert for a whole session.",
        flow(
          "Token representation at MoE layer",
          "Gate scores experts",
          "Select configured subset",
          "Run selected experts",
          "Combine outputs",
          "Continue model layers",
        ),
        p(
          "A later token or another MoE layer can choose different experts. Attention and other dense components may still execute as part of the architecture. Internal gating is therefore not equivalent to sending the user’s HTTP request to a small or large provider model.",
        ),
        p(
          "The lab’s scores are hypothetical. Selected gate weights are normalized for its combination example; actual architectures have their own gating, normalization and capacity behavior.",
        ),
      ),
      chapter(
        "Dispatch creates movement and balance work",
        "Sparse activation does not erase resource constraints.",
        p(
          "If selected experts are on different devices, token representations may need to be dispatched to them and expert results returned for combination. A batch can concentrate tokens on a few experts. Memory, network, scheduling and imbalance can then matter as much as nominal active parameter count.",
        ),
        table(
          ["Quantity", "Meaning", "Do not infer"],
          [
            [
              "Total experts/parameters",
              "Model state that must be available under the execution design",
              "Only active experts need any storage",
            ],
            [
              "Experts selected/token",
              "Sparse computation for that token/layer",
              "Dense-model-equivalent latency",
            ],
            [
              "Dispatch distribution",
              "Where token work lands",
              "Every device is equally utilized",
            ],
            [
              "Gate scores",
              "Internal routing preferences",
              "Calibrated answer correctness",
            ],
          ],
        ),
      ),
      chapter(
        "Benchmark the actual execution design",
        "Parameter labels alone do not explain serving experience.",
        list(
          "Pin the full architecture, expert placement, precision and runtime support.",
          "Record input/output shapes and batch/concurrency.",
          "Measure per-device memory and expert-work distribution.",
          "Observe dispatch/return communication and imbalance.",
          "Evaluate end-to-end latency and task quality, not only arithmetic saved.",
        ),
        p(
          "Offloading or other memory strategies can change where state lives, but must be measured with their movement cost. A top-two configuration is not evidence that all unselected experts can be omitted from a general deployment.",
        ),
      ),
    ],
    example(
      "Two selected experts do not mean two stored experts",
      formula(
        "Lab token A",
        "Expert 3 score 0.55 and expert 2 score 0.10; normalized weights ≈ 0.846 and 0.154",
        "The lab has eight candidate experts. The selected pair changes for another example token.",
      ),
      p(
        "Combination weights are illustrative internal values, not probabilities that the response is factually correct. The full serving system must make the architecture’s required expert state available.",
      ),
    ),
    [
      "Switch among the example tokens and observe selected experts.",
      "Step through dispatch and combination.",
      "Explain one reason sparse active computation may not yield a proportional latency reduction.",
    ],
    [
      "Calling an expert an independent chat provider.",
      "Sizing all memory from active parameters alone.",
      "Interpreting gate weights as answer-confidence probabilities.",
    ],
  ),

  "structured-decisions": guide(
    [
      "Separate evidence, structured model judgment, deterministic arithmetic and authorized policy.",
      "Interpret mutually exclusive choices versus separate yes/no estimates.",
      "Explain calibration, shadow evaluation and version control.",
    ],
    [
      ["Choice in the source", "A judgment among mutually exclusive options."],
      [
        "Noul in the source",
        "A yes-probability-style judgment; use the source’s stated interpretation.",
      ],
      [
        "Score in the source",
        "An ordered-score judgment for a defined question.",
      ],
      [
        "Calibration",
        "Across comparable predictions in a probability bin, outcomes occur at approximately the stated frequency.",
      ],
    ],
    [
      chapter(
        "Define what the model is judging",
        "A structured number needs a question, evidence and interpretation.",
        p(
          "The source Jev article separates supplied state, instructions for the judgment and criteria describing possible answers. A concise structured result can be useful, but the schema itself does not make the estimate correct. The evidence must support the question, and the evaluated model/version must match the application’s use.",
        ),
        table(
          ["Question type", "Interpretation", "Constraint"],
          [
            [
              "Mutually exclusive Choice",
              "A distribution among alternative answers",
              "Probabilities refer to the same exclusive choice",
            ],
            [
              "Separate yes/no questions",
              "An estimate for each distinct event",
              "The estimates need not sum to one",
            ],
            [
              "Ordered score",
              "A judgment on explicitly defined ordered outcomes",
              "Explain the scale and evaluate its meaning",
            ],
          ],
        ),
        p(
          "Separate questions need not be statistically independent. “Do these two yes estimates sum to one?” is different from “may their probabilities be multiplied?” Multiplication requires additional assumptions about the events.",
        ),
      ),
      chapter(
        "Keep arithmetic and actions outside an unexplained judgment",
        "A high estimate is not automatic authorization.",
        flow(
          "Supplied evidence",
          "Focused model judgment",
          "Deterministic calculation",
          "Explicit approved policy",
          "Shadow / reviewed outcome",
        ),
        p(
          "Application code can calculate a budget, expected score or threshold outcome from defined inputs. The model can interpret evidence under an evaluated question. Consequential actions still require an explicit approved policy and appropriate authority. An optional generated explanation should describe supplied evidence and the approved result, not invent hidden reasoning.",
        ),
        code(
          "Abstract separation of responsibilities",
          "estimate = evaluated_judgment(evidence, question, version)\ncalculation = deterministic_code(approved_inputs)\nshadow_result = approved_policy(estimate, calculation)\nrecord_for_evaluation(shadow_result, eventual_outcome)",
          "Pseudocode only. This app calls no Jev service and executes no financial, security or consequential action.",
        ),
      ),
      chapter(
        "Evaluate calibration and drift on the real task",
        "Confidence concentration is not an independent truth check.",
        p(
          "A calibrated 0.8 bin means about 80% of comparable cases in that bin have the event occur across a suitable dataset. It does not guarantee a particular case, and twenty constructed dots are not validation. Evaluate representative and difficult slices, ambiguous evidence, distribution shifts and version changes.",
        ),
        list(
          "Define labels and criteria before examining the candidate outputs.",
          "Keep evaluation examples distinct from tuning examples.",
          "Compare probability calibration and decision errors, not just format validity.",
          "Run shadow evaluation before consequential use where appropriate.",
          "Pin model/question/policy versions and repeat evaluation when they change.",
        ),
      ),
    ],
    example(
      "Two different events can both be likely",
      table(
        ["Fictional estimate", "Value", "Interpretation"],
        [
          ["Event A occurs", "0.80", "Separate yes/no question"],
          ["Event B occurs", "0.65", "Another event; may coexist with A"],
          [
            "Sum",
            "1.45",
            "Not invalid merely because the events are not mutually exclusive",
          ],
        ],
      ),
      p(
        "By contrast, a single three-option exclusive Choice can use 0.70, 0.20 and 0.10. Both examples are invented for teaching; neither is a validated model output.",
      ),
    ),
    [
      "Compare separate yes/no estimates with a mutually exclusive Choice.",
      "Change the calibration-bin illustration and explain why the constructed dots are not measured evidence.",
      "Identify which stage owns arithmetic and which owns action authorization.",
    ],
    [
      "Treating concentrated probability as proof of truth.",
      "Confusing separate questions with statistically independent events.",
      "Letting a model estimate silently authorize a consequential action.",
    ],
  ),

  "release-validation": guide(
    [
      "Define independent functional, task-quality and performance requirements.",
      "Compare controlled candidate and baseline evidence against absolute and relative gates.",
      "Promote the tested artifact through a measured canary with rollback conditions.",
    ],
    [
      [
        "Functional gate",
        "API/stream/error/cancellation behavior meets requirements.",
      ],
      [
        "Quality gate",
        "Representative task outcomes meet the defined evaluation.",
      ],
      [
        "Performance gate",
        "The workload meets latency/goodput and regression policy.",
      ],
      [
        "Artifact promotion",
        "Release the same tested image/model/configuration identities.",
      ],
    ],
    [
      chapter(
        "Three green lights are required",
        "One successful dimension does not compensate for another failure.",
        table(
          ["Gate", "Example checks", "Insufficient evidence"],
          [
            [
              "Function",
              "Streaming, errors, cancellation, request limits",
              "Only container build or startup",
            ],
            [
              "Task quality",
              "Extraction, evidence-based answers, tool choices/arguments",
              "Only valid JSON or HTTP success",
            ],
            [
              "Performance",
              "TTFT/ITL tails, end-to-end SLO, useful throughput",
              "Only aggregate tokens/sec",
            ],
          ],
        ),
        p(
          "A lower-level kernel or runtime change can preserve API function while regressing user experience. A prompt/model change can preserve speed while failing the task. Keep the gate outcomes separate and retain evidence for the failed dimension.",
        ),
      ),
      chapter(
        "Control the comparison and define policy before testing",
        "Absolute targets and baseline regressions answer different questions.",
        list(
          "Pin model, tokenizer/template, quantization, hardware, runtime, workload and cache condition except for the intended change.",
          "Keep a known-good baseline plus absolute service targets.",
          "Define acceptable regression, sample sufficiency and rerun rules before seeing the result.",
          "Inspect distributions and workload slices, not only means.",
          "Preserve raw request/task results, failures and the complete reproducibility manifest.",
        ),
        p(
          "A candidate can meet an absolute limit while degrading far beyond the permitted baseline regression. Conversely, matching a bad baseline does not satisfy an absolute service requirement. Short noisy runs should not silently become release evidence.",
        ),
      ),
      chapter(
        "Canary the tested system, not a newly assembled one",
        "Artifact and configuration identity are part of correctness.",
        flow(
          "Pinned candidate",
          "Controlled functional / quality / performance runs",
          "Reports and raw traces",
          "Explicit custom release gate",
          "Limited canary",
          "Validate → expand or rollback",
        ),
        p(
          "Fast PR checks, broader nightly runs and release-candidate runs provide different feedback scopes. The canary adds production observation, not permission to skip earlier gates. Define abort/rollback thresholds and a known-good image/model/configuration before sending more traffic.",
        ),
        p(
          "The original OCI graphic is a proposed design: DevOps/build, immutable OCIR artifact, OKE clients and GPU servers, Object Storage evidence, custom Functions gate, and rollout/canary. It is not evidence that this app has deployed that pipeline.",
        ),
        image(
          "/article-images/ess3e-1.png",
          "Proposed OCI inference CI and release-gate architecture",
          "Original proposed workflow. Test clients and release-gate logic require explicit custom implementation and policy.",
        ),
      ),
    ],
    example(
      "Higher throughput, failed release",
      table(
        ["Synthetic candidate evidence", "Policy", "Decision"],
        [
          [
            "Functional tests pass",
            "All required behaviors pass",
            "Function: pass",
          ],
          [
            "Task success 96%",
            "At least 95% on the defined set",
            "Quality: pass",
          ],
          [
            "p95 TTFT 390 ms; baseline 300 ms",
            "Absolute ≤400 ms and relative regression ≤10%",
            "Performance: hold; regression is 30%",
          ],
          [
            "Throughput improves 20%",
            "Does not override latency gate",
            "Still hold",
          ],
        ],
      ),
      p(
        "All values and thresholds here are invented. The point is to define independent and jointly required policies before evaluating a candidate.",
      ),
    ),
    [
      "Leave performance unchecked and observe promotion stopping at the gate.",
      "Enable all three gates and follow the permitted canary path.",
      "Explain why a canary must use the exact evaluated image and model/configuration.",
    ],
    [
      "Equating valid API behavior with correct task outcomes.",
      "Choosing acceptable regression after inspecting a candidate.",
      "Deploying an untested artifact or lacking rollback conditions.",
    ],
  ),
};

export function detailText(study) {
  const collect = (value) =>
    typeof value === "string"
      ? value
      : Array.isArray(value)
        ? value.map(collect).join(" ")
        : value && typeof value === "object"
          ? Object.values(value).map(collect).join(" ")
          : "";
  return collect(study);
}
