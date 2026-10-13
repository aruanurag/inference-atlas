const section = (title, text) => ({ title, text });
const lesson = (
  id,
  title,
  lab,
  articleIds,
  intro,
  sections,
  takeaway,
  question,
  answers,
  correct = 0,
  layer = "serving",
) => ({
  id,
  title,
  lab,
  articleIds,
  intro,
  sections,
  takeaway,
  minutes: 8,
  sources: [],
  layer,
  labTitle: title,
  labHint:
    "Change a setting or step through the process. Connect the behavior to the explanation below.",
  quiz: { question, answers, correct, explanation: takeaway },
});

export const sourceMappings = {
  "what-is-inference": ["o0hke", "xbm8e"],
  "training-vs-inference": ["z7ede", "r5oec"],
  "request-lifecycle": ["ehxof", "0d1ee"],
  "kv-cache-basics": ["lcdee"],
  "model-routing": ["xjyve", "uh5ve"],
  "hardware-sizing": ["kcpre", "z7ede"],
  "prefill-decode": ["tl4fe"],
  "kv-memory": ["kcpre", "cmare"],
  "prefix-reuse": ["8bjge", "t6xfe"],
  "cache-tiers": ["jqjne", "t6xfe"],
  "continuous-batching": ["i5bre", "cmare"],
  "distributed-serving": ["ckarc", "jqjne"],
  "inference-metrics": ["kirye"],
};

export const courseExtensions = [
  {
    id: "100",
    lessons: [
      lesson(
        "inference-stack",
        "Put the stack together",
        "stack",
        ["xjyve", "5unre", "xbm8e"],
        "A model request crosses several layers. Each has a different job, from choosing the work to doing the math.",
        [
          section(
            "Give each layer a job",
            "An agent coordinates a workflow. A model router chooses a suitable model or service. A load balancer selects a serving endpoint. The engine schedules requests and manages state. A hardware runtime launches operations, and the processor performs the computation. These roles may share a product, but they remain useful distinctions.",
          ),
          section(
            "Follow the hardware path",
            "CUDA is a platform for NVIDIA GPUs; it is not an inference gateway. PyTorch expresses tensor computations. vLLM combines serving and engine functions. llama.cpp supports local and quantized execution across several backends. The correct path depends on supported hardware, workload, and runtime configuration.",
          ),
          section(
            "Use the landscape as a map",
            "The Atlas connects concepts to projects. It explains what problem a component addresses and where it fits. It does not establish that one tool is universally best. Learn the role first, then follow the official project source and measure the configuration you intend to use.",
          ),
        ],
        "Workflow, model selection, endpoint placement, scheduling, and execution are separate decisions.",
        "Which component normally decides what steps an agent should take?",
        ["The agent runtime", "GPU HBM"],
        0,
        "runtime",
      ),
    ],
  },
  {
    id: "200",
    lessons: [
      lesson(
        "attention-heads",
        "MHA, MQA, and GQA",
        "attention-heads",
        ["cmare", "kcpre"],
        "Multiple query heads do not always require equally many sets of keys and values. That distinction changes cache memory.",
        [
          section(
            "Separate query heads from KV heads",
            "In multi-head attention, query heads typically have separate key/value heads. Multi-query attention shares one KV head across the query heads. Grouped-query attention shares KV heads within groups. These are model architecture choices; a serving flag cannot generally convert a trained MHA model into GQA.",
          ),
          section(
            "Count the retained state",
            "For the same layers, head dimension, token count, sequences, and cache dtype, raw KV bytes scale with the number of KV heads. In a hypothetical 32-query-head layer, MHA has 32 KV heads, GQA might have 8, and MQA has 1. Query computation still exists in all three.",
          ),
          section(
            "Evaluate the actual model",
            "Sharing KV heads changes the architecture’s expressiveness and memory access pattern. Quality and speed depend on the trained model and workload. The explorer compares raw KV storage only, rather than predicting which architecture produces the best answers.",
          ),
        ],
        "Use the model’s KV-head count in cache sizing, not its query-head count.",
        "Can changing the weight precision alone turn an MHA model into GQA?",
        [
          "No; KV sharing is an architecture property.",
          "Yes; 4-bit weights share all heads.",
        ],
        0,
        "kv-cache",
      ),
      lesson(
        "paged-attention",
        "PagedAttention and block tables",
        "paging",
        ["sokpe", "8bjge"],
        "A sequence has a logical order even when its KV blocks occupy scattered physical memory.",
        [
          section(
            "Reuse scattered free blocks",
            "A contiguous allocator can fail when four free units are split into a three-unit gap and a one-unit gap. A paged allocator can use both gaps. A block table records the physical location of each logical KV block, so the attention kernel can find the sequence in the correct order.",
          ),
          section(
            "Grow and release on demand",
            "The engine obtains another block when a sequence needs more space. When work finishes, blocks can return to the free pool, subject to cache-reuse policies and references. This pairs naturally with requests entering and leaving a continuous batch.",
          ),
          section(
            "Account for the last block",
            "Paging reduces the need for large contiguous reservations; it does not erase every source of waste. A 35-token sequence in 16-token blocks needs three blocks, leaving 13 unused token slots in its final block. Paging also does not eliminate attention or sequential generation.",
          ),
        ],
        "The block table preserves logical order while physical allocation becomes flexible.",
        "What makes a scattered KV cache readable in sequence order?",
        [
          "A logical-to-physical block table",
          "Alphabetically sorting generated words",
        ],
        0,
        "kv-cache",
      ),
      lesson(
        "engine-architecture",
        "Inside the serving engine",
        "engine",
        ["0d1ee", "i5bre", "sokpe"],
        "Serving is a repeating coordination loop involving requests, memory, model execution, sampling, and output.",
        [
          section(
            "Plan work before executing it",
            "The API layer receives and validates a request. The engine tracks waiting and active work. Its scheduler considers token budgets, phase work, and KV availability before creating an execution plan. The scheduler does not itself multiply the model’s matrices.",
          ),
          section(
            "Run and update state",
            "Workers execute the planned forward pass. Logits are converted to a token using the configured sampling policy. The engine updates sequence and cache state, streams output, detects stopping or cancellation, and decides which resources can be released.",
          ),
          section(
            "Join compute and memory admission",
            "A waiting request may need both prefill work and enough KV blocks. An active decode sequence may need another block as it grows. The next batch therefore depends on more than an empty compute slot. The explorer shows roles rather than promising an exact source-code layout across engine versions.",
          ),
        ],
        "Scheduling chooses work, the memory manager tracks capacity, and workers execute the model.",
        "Why might a request wait even when compute appears available?",
        [
          "Its required KV state cannot yet be admitted.",
          "The API must retrain the model first.",
        ],
        0,
        "serving",
      ),
      lesson(
        "local-runtime",
        "GGUF and quantized local inference",
        "quantization",
        ["4hv1e"],
        "The model artifact, execution backend, and workload together determine what a local machine can run usefully.",
        [
          section(
            "Read the artifact",
            "A GGUF file packages tensors and metadata used by a compatible runtime, including architecture and tokenizer information. Names such as Q4_K_M describe quantization formats, not a guarantee that every tensor consumes exactly four bits. File size is a practical weight-footprint clue, but it is not the whole runtime budget.",
          ),
          section(
            "Treat quality as a requirement",
            "Lower precision can reduce weight storage and bandwidth demand. It can also change answer quality. Compare the same model on representative tasks, including structured outputs and difficult slices. Do not assume a quantized or smaller model is interchangeable with the original.",
          ),
          section(
            "Measure backend and thread choices",
            "llama.cpp can use CPU and supported accelerator backends. Offload choices, memory bandwidth, thread placement, context, batch/ubatch sizes, and native build features affect execution. More threads are not always faster. A portable build and a native build make different compatibility tradeoffs.",
          ),
        ],
        "Quantization changes weight storage; context and concurrency still create a separate cache budget.",
        "Does a 4-bit GGUF file eliminate the need for KV memory?",
        [
          "No; the runtime still retains attention state.",
          "Yes; all memory is part of the weight file.",
        ],
        0,
        "runtime",
      ),
      lesson(
        "controlled-experiments",
        "Run a controlled inference experiment",
        "experiment",
        ["0y6oe", "kirye", "4hv1e"],
        "Start with a working endpoint, then change one variable so the result answers a clear question.",
        [
          section(
            "Establish a reproducible baseline",
            "The original local lab uses llama.cpp and a small GGUF model, with an OpenAI-compatible endpoint. First verify health and a successful request. Save the model, runtime, configuration, workload, and failures alongside measurements.",
          ),
          section(
            "Isolate prompt and generation work",
            "A longer prompt with a short output tests prefill sensitivity. A short prompt with a longer output exposes decode occupancy. A concurrency sweep explores serving contention. Compare batch/ubatch settings while keeping the workload fixed; those settings are not synonyms for the number of concurrent users.",
          ),
          section(
            "Know the measurement boundary",
            "Client timing includes the network and serving path. Time between streamed chunks can approximate visible cadence, but a chunk can contain multiple tokens. Token-level ITL needs token-aware instrumentation. This explorer is a test-design aid, not a live benchmark or a server launcher.",
          ),
        ],
        "Change one variable, retain raw results, and distinguish chunk timing from true token timing.",
        "Which comparison best isolates the cost of longer prompts?",
        [
          "Same system and output budget, with only input length changed.",
          "Different model, hardware, output, and prompt together.",
        ],
        0,
        "observe",
      ),
    ],
  },
  {
    id: "300",
    title: "Distributed inference",
    subtitle: "Connect engines into systems",
    description:
      "Explore parallelism, networks, fleet routing, private endpoints, and Kubernetes deployment.",
    lessons: [
      lesson(
        "tensor-parallelism",
        "Split tensors across GPUs",
        "tensor",
        ["qvsve"],
        "Tensor parallelism partitions operations inside a layer so multiple devices cooperate on one model-serving unit.",
        [
          section(
            "Partition a weight tensor",
            "A matrix can be split by rows or columns, depending on the operation and execution design. Each device holds its assigned shard and computes a partial result. Sharding weights reduces the amount held by each device, while some tensors and buffers may remain replicated.",
          ),
          section(
            "Combine the computation",
            "Devices may need collective operations such as all-reduce or all-gather to reconcile partial outputs. Which collective is required depends on the partition. The explorer uses a row-partitioned sum example and explicitly shows the communication step.",
          ),
          section(
            "Place tightly coupled workers carefully",
            "Frequent synchronization makes latency and interconnect topology important. More shards do not guarantee a proportional speedup. One tensor-parallel group remains one logical model instance; adding independent groups is a different scaling decision.",
          ),
        ],
        "Tensor parallelism splits layer computation, and communication is part of the resulting critical path.",
        "Does a four-GPU tensor-parallel group necessarily create four independent replicas?",
        [
          "No; the devices cooperate on one serving unit.",
          "Yes; each shard is a complete model.",
        ],
        0,
        "distributed",
      ),
      lesson(
        "pipeline-parallelism",
        "Layers, stages, and pipeline bubbles",
        "pipeline",
        ["vi12e", "tl4fe"],
        "Pipeline parallelism places different portions of the model on different workers and passes activations between them.",
        [
          section(
            "Divide the model into stages",
            "A hypothetical 80-layer model might use four stages of 20 layers. Each stage can itself contain a tensor-parallel group. Activations cross stage boundaries; weights for later layers remain on their assigned workers.",
          ),
          section(
            "Follow a dependency",
            "One request’s computation must advance through the stages in order. Empty stages are pipeline bubbles. Multiple requests or microbatches can overlap when dependencies and the engine’s schedule allow, improving occupancy compared with a single item traversing alone.",
          ),
          section(
            "Understand the simplified schedule",
            "The explorer is a forward pipeline for independent work items. Autoregressive generation adds a dependency from the final sampled token back to the next step. Prefill chunks and decode scheduling therefore need more careful engine support than the animation’s assembly-line model.",
          ),
        ],
        "Pipeline partitioning spreads layers; overlapping independent work helps reduce empty stages.",
        "What crosses a normal boundary between pipeline stages?",
        [
          "Intermediate activations",
          "A separately trained copy of every layer",
        ],
        0,
        "distributed",
      ),
      lesson(
        "parallelism-topology",
        "Combine TP, PP, and replicas",
        "parallelism",
        ["gvbne", "z7ede", "vi12e"],
        "The GPU count only makes sense when you know which devices cooperate and which serving units are independent.",
        [
          section(
            "Count one replica",
            "With TP=4 and PP=4, a simple topology has 16 devices cooperating in one complete model replica. Each pipeline stage owns a tensor-parallel group. The topology explorer makes those boundaries visible.",
          ),
          section(
            "Replicate the complete unit",
            "DP=3 creates three independent copies of that 16-device serving unit: 48 devices in total under this simplified layout. Each replica has its own scheduler, requests, and local cache. DP does not divide one copy of the weights among replicas.",
          ),
          section(
            "Keep state with its execution",
            "During generation, continuing elsewhere requires compatible state to be transferred or reconstructed. Subsequent conversation turns may reuse a prefix if the engine retains it and routing finds it. Affinity is a policy choice, not a guarantee of indefinite cache residency.",
          ),
        ],
        "In the simple topology, total devices = TP × PP × DP; the DP boundary separates independent serving units.",
        "Which setting duplicates the entire model-serving unit?",
        ["Data parallel replicas", "A larger head dimension"],
        0,
        "distributed",
      ),
      lesson(
        "gpu-networking",
        "Scale-up, scale-out, and collectives",
        "network",
        ["3omve", "bxwse"],
        "Computation and data movement must be designed together when one model spans devices or nodes.",
        [
          section(
            "Match the fabric to the domain",
            "NVLink/NVSwitch describes a tightly coupled scale-up domain, including some rack-scale systems. Scale-out connects separate nodes or domains using a high-performance fabric such as RDMA-capable Ethernet, InfiniBand, or cloud-specific networking. The implementation depends on the platform.",
          ),
          section(
            "Distinguish software from transport",
            "NCCL is a collective communication library. RDMA is a mechanism for moving data between registered memory with reduced host involvement. GPUDirect RDMA can enable a network adapter to access GPU memory on supported systems. None of these terms is a kind of persistent model storage.",
          ),
          section(
            "See the communication pattern",
            "Tensor parallel work may require frequent collectives. Pipeline parallel work sends activations between stages. Independent inference replicas usually do not exchange their layer outputs. A sum all-reduce combines every participant’s contribution and makes the result available to every participant.",
          ),
        ],
        "A collective is a software operation; the available topology and transport determine its cost.",
        "What does a sum all-reduce return to each participant?",
        [
          "The combined sum of all contributions",
          "Only the next participant’s input",
        ],
        0,
        "distributed",
      ),
      lesson(
        "llm-d-fleet",
        "Router, EPP, pool, and engine",
        "fleet",
        ["jqjne", "ehxof"],
        "llm-d coordinates serving endpoints; the selected engine still owns local model execution and scheduling.",
        [
          section(
            "Separate the roles",
            "A proxy carries the network request. The Endpoint Picker evaluates eligible model-server endpoints. An InferencePool describes the serving pool. The selected model server runs the engine. Cache locality, queue depth, memory pressure, and role can inform placement.",
          ),
          section(
            "Choose an endpoint, then admit work",
            "Fleet placement answers where a request should go. The local scheduler answers what can run in an engine step. A good fleet decision can still encounter engine-level memory limits; these are connected decisions rather than interchangeable schedulers.",
          ),
          section(
            "Compose only the capabilities needed",
            "A deployment may use monolithic model servers, specialized prefill/decode roles, distributed cache metadata, or flow control. A tested deployment recipe is a starting point to measure, not a universal best topology. llm-d does not shrink weights or erase KV growth.",
          ),
        ],
        "Cluster routing places work; the engine decides how and when local inference executes.",
        "Which component performs the model forward pass?",
        [
          "The selected inference engine and its workers",
          "The cache metadata index itself",
        ],
        0,
        "distributed",
      ),
      lesson(
        "model-provider-replica",
        "Three layers of model routing",
        "conversation-routing",
        ["uh5ve"],
        "Choosing the model, its deployment, and its serving replica are distinct decisions that affect the whole path.",
        [
          section(
            "Choose capability before location",
            "Model selection considers the task, context, tools, output contract, and evaluated quality. Deployment selection considers an eligible provider or region and its health. Replica selection considers the local queue, cache, and capacity within the chosen serving service.",
          ),
          section(
            "Include the cost of a continuation",
            "A model switch usually loses reusable KV state and requires the new model to process the visible history. Staying on a model does not guarantee a local cache hit if the turn moves to another replica or the cache has been evicted.",
          ),
          section(
            "Evaluate the policy across a conversation",
            "A fixed model, a stateless per-turn router, and a session-aware policy can behave differently on the same multi-turn task. Record switches, route reasons, retries, user-facing latency, and quality by task slice. Advertised per-token price is not the full cost of a successful interaction.",
          ),
        ],
        "Evaluate a routing decision over the complete request and conversation path, including repeated prefill.",
        "Can a different model normally consume the first model’s KV cache unchanged?",
        [
          "No; compatible state across unrelated models cannot be assumed.",
          "Yes; text history and KV tensors are interchangeable.",
        ],
        0,
        "gateway",
      ),
      lesson(
        "kv-transfer",
        "The KV transfer critical path",
        "transfer",
        ["ckarc"],
        "Splitting prefill and decode creates a placement decision and a state-movement dependency for each request.",
        [
          section(
            "Move state as well as control",
            "The control plane coordinates worker identities, memory locations, and completion. The data plane moves the KV tensors. The decode worker must receive compatible state before continuing the request; forwarding only the text would repeat prefill.",
          ),
          section(
            "Evaluate a worker pair",
            "An idle decode worker may be far from the prefill worker. Queue delay, missing prefill work, transfer cost, and first decode work together determine the path. A raw transfer lower bound is bytes ÷ effective bandwidth; fixed overheads, contention, and layout conversion can add time.",
          ),
          section(
            "Check layouts and workload benefit",
            "Model version, cache dtype, block layout, runtime, and partitioning must be compatible or explicitly supported by a transfer mechanism. Asynchronous transfers may overlap other requests, but this request still depends on its state. Disaggregation is useful only when its benefits justify those costs.",
          ),
        ],
        "Independent phase scaling adds a network-dependent state handoff; measure the whole request path.",
        "Why can an empty decode queue still be a poor destination?",
        [
          "The KV transfer path may add more delay than the queue saves.",
          "An empty queue means the model was retrained.",
        ],
        0,
        "kv-cache",
      ),
      lesson(
        "kubernetes-rollouts",
        "Pending pods and rollout capacity",
        "rollout",
        ["hv9te"],
        "A desired replica is not usable capacity until the cluster can place it and the model server becomes ready.",
        [
          section(
            "Respect allocatable resources",
            "CPU/memory requests and accelerator topology determine placement. A one-node lab can lack room for both the old and new serving pods. An additional desired replica may remain Pending even when the configuration and container are correct.",
          ),
          section(
            "Choose a rollout tradeoff deliberately",
            "A surge rollout needs spare resources for overlapping old and new pods. A capacity-constrained lab can use maxSurge=0 and maxUnavailable=1, making room by stopping the old pod. That introduces an interruption and does not establish a zero-downtime production strategy.",
          ),
          section(
            "Tune one engine setting at a time",
            "CPU allocation, thread binding, KV size, model length, active sequences, and token budgets control different constraints. Hold workload and measurement boundaries fixed. A test with zero successful requests is a connectivity or readiness failure, not a performance comparison.",
          ),
        ],
        "Rollout and scale-out require real placement capacity plus model readiness.",
        "What can happen if a surge pod cannot fit alongside the existing pod?",
        [
          "The new pod remains Pending.",
          "The cluster automatically halves all model weights.",
        ],
        0,
        "distributed",
      ),
      lesson(
        "private-workbench",
        "A private, repeatable inference workbench",
        "workbench",
        ["mqdqe"],
        "A repeatable experiment loop connects infrastructure, serving, endpoint access, measurement, and cleanup.",
        [
          section(
            "Keep the endpoint path explicit",
            "In the source workbench, a local frontend uses a local backend, which reaches a remote llama-server through an SSH tunnel. The remote server binds to its loopback interface. That private path differs from publishing a model endpoint on a public address.",
          ),
          section(
            "Track the experiment as a unit",
            "Record infrastructure, model artifact, runtime build, workload, and benchmark outputs together. A native CPU build can improve a specific execution path but introduce instruction compatibility constraints. Changing several variables simultaneously hides which choice caused the result.",
          ),
          section(
            "Finish the lifecycle",
            "Retain outputs before terminating app-created resources. The source provides the actual external lab and setup commands. This visual only demonstrates the workflow; it does not provision cloud infrastructure, use credentials, or start a paid model server.",
          ),
        ],
        "Provision → deploy → privately access → benchmark → retain evidence → clean up is one experiment lifecycle.",
        "What makes two experiment results interpretable?",
        [
          "A preserved configuration and one controlled change",
          "Only a screenshot of the fastest number",
        ],
        0,
        "managed",
      ),
      lesson(
        "nvidia-inference-stack",
        "From storage and GPUs to a serving API",
        "nvidia-stack",
        ["bxwse"],
        "Memory, persistent storage, interconnects, systems, runtimes, and packaged endpoints solve different problems.",
        [
          section(
            "Separate storage from movement",
            "NVMe and object stores retain model artifacts. HBM holds the active working set. NVLink and scale-out fabrics move data between devices or domains. A faster interconnect does not itself provide persistent model storage or make all memory one uniform pool.",
          ),
          section(
            "Connect hardware to software",
            "A GPU is an accelerator; HGX is a multi-GPU platform; DGX is an integrated NVIDIA system. CUDA provides GPU programming/runtime facilities. TensorRT-LLM is an optimization path. Cloud offerings combine these and other building blocks with provider-specific operations and networking.",
          ),
          section(
            "Keep alternative serving paths visible",
            "Triton can host inference backends. NIM packages optimized model-serving components into deployable microservices. They are not mandatory consecutive boxes. A vLLM or other engine path is another architecture to evaluate according to required control, support, and workload.",
          ),
        ],
        "Choose a coherent serving path; do not treat every product name as another mandatory layer.",
        "Which component stores active model weights on a GPU?",
        ["HBM", "A scale-out network link"],
        0,
        "runtime",
      ),
    ],
  },
  {
    id: "400",
    title: "Production inference design",
    subtitle: "Optimize the complete outcome",
    description:
      "Design state-aware policies, measure useful capacity, and protect quality, latency, and reliability.",
    lessons: [
      lesson(
        "cache-aware-placement",
        "Cache knowledge and endpoint placement",
        "cache-routing",
        ["t6xfe"],
        "Routing must reconcile reusable state with load, memory capacity, compatibility, and the freshness of its own cache knowledge.",
        [
          section(
            "Build a cache identity, not a text-similarity score",
            "Full token blocks use a chained identity incorporating the preceding prefix. Model state, adapter or media identifiers, and isolation salts may also matter. A change early in the prefix changes downstream identity. Exact token reuse differs from semantic similarity.",
          ),
          section(
            "Compare estimated and observed residency",
            "An approximate router can remember where it sent a prefix and infer likely residency. A precise path uses compatible token identities and cache-store/removal events. Eviction, restart, and delayed events can make any index stale; speculative indexing handles the gap before confirmed state arrives.",
          ),
          section(
            "Filter, score, and pick",
            "First remove ineligible endpoints. Then combine cache affinity, queue delay, and capacity according to the workload. Matched percentage and absolute saved tokens tell different stories. A cache-only policy can create hotspots; spreading every request evenly can destroy locality. The explorer’s latency model is deliberately simplified.",
          ),
        ],
        "The router places a request near useful state; the engine performs the actual reuse. Index freshness and load both matter.",
        "What can make routing-history-based cache knowledge inaccurate?",
        [
          "The endpoint evicts the prefix or restarts.",
          "The same user asks a different question at the end.",
        ],
        0,
        "distributed",
      ),
      lesson(
        "conversation-affinity",
        "Route a conversation, not just a turn",
        "conversation-routing",
        ["etkfc", "uh5ve"],
        "A follow-up can depend on work the serving system has already paid to compute.",
        [
          section(
            "Distinguish model and replica affinity",
            "Model affinity preserves the chosen model and may avoid a cross-model prefill restart. Replica affinity increases the opportunity to find local KV state. Neither guarantees reuse: token-prefix compatibility, residency, version, and policy still determine whether a hit is possible.",
          ),
          section(
            "Break affinity for a reason",
            "A hybrid policy prefers useful existing state but can reconsider on overload, failure, task change, context reset, or a stronger capability requirement. Permanent stickiness can create load imbalance. Stateless routing can repeatedly make warm conversations cold.",
          ),
          section(
            "Measure the whole interaction",
            "Track cold versus warm TTFT, recomputed prefill tokens, migrations, queue imbalance, tail latency, quality, and SLO goodput. The cheapest latest-turn model can be expensive after repeated history processing and retries. Independent extraction steps may justify different routing from a long reasoning thread.",
          ),
        ],
        "State locality is a benefit to evaluate, not an absolute rule that overrides task requirements or availability.",
        "When can changing to a smaller model increase the next turn’s initial wait?",
        [
          "When it must prefill the accumulated context again.",
          "Only when the browser font changes.",
        ],
        0,
        "gateway",
      ),
      lesson(
        "capacity-planning",
        "Plan SLO-safe capacity",
        "capacity",
        ["oplvc"],
        "Measured goodput, workload duration, warm replicas, and scaling delay are more useful than one peak token-rate number.",
        [
          section(
            "Find a safe operating point",
            "Fix the model, runtime, hardware, and workload profile. Sweep demand and observe latency, errors, memory, and queue growth. Identify the capacity knee and an operating region that meets the application SLO with headroom. A configured scaling threshold is not proof of measured replica capacity.",
          ),
          section(
            "Translate demand into replicas and nodes",
            "A first estimate is ceil(peak request rate ÷ measured safe goodput per replica). Add the explicitly chosen failure or burst policy. Node placement is constrained by allocatable CPU, memory, accelerators, and topology. Independent replicas need their own model copies and serving state.",
          ),
          section(
            "Account for time to usable capacity",
            "Under steady-state assumptions, mean concurrency is arrival rate × mean request duration. Long outputs increase occupancy without increasing arrivals. During a burst, a simplified backlog estimate is max(0, arrivals − warm service rate) × readiness delay. Real batching and variable traffic require load-test validation.",
          ),
        ],
        "Plan for useful work inside the SLO, failure headroom, and the interval before new models become ready.",
        "Does a KEDA threshold of four active requests prove a replica’s optimal capacity is four?",
        [
          "No; that target still needs workload/SLO validation.",
          "Yes; every model has the same four-request limit.",
        ],
        0,
        "distributed",
      ),
      lesson(
        "demand-driven-scaling",
        "From inference demand to usable replicas",
        "autoscaling",
        ["cf8ie", "oplvc"],
        "Pod scaling and node scaling form a chain, with inference readiness at the end.",
        [
          section(
            "Use signals with a clear boundary",
            "Running requests and waiting requests can expose demand that utilization alone misses. Prometheus collects the chosen metrics; KEDA and its generated HPA use configured targets. These signals need validation against the workload and user-facing SLO rather than a universal threshold.",
          ),
          section(
            "Follow the two scaling layers",
            "In the recorded lab, eight running requests divided by a target of four per replica requested two replicas. A new pod could not fit, so it remained Pending until the node autoscaler added capacity. KEDA requested pods; it did not create CPU or memory itself.",
          ),
          section(
            "Learn from the recorded workload experiments",
            "Long unique prompts raised the source lab’s p95 TTFT from about 144 to 764 ms. Reusing a shared prefix reduced it to about 172 ms, with roughly 53% cache hits. Those are the author’s case-study observations, not predicted results for your hardware. Endpoint and engine metrics have different measurement boundaries.",
          ),
        ],
        "Demand → desired pods → placement → node capacity when needed → model readiness is the scaling path.",
        "Which component responds when requested pods cannot fit on existing nodes?",
        ["The cluster/node autoscaler", "The tokenizer"],
        0,
        "distributed",
      ),
      lesson(
        "cold-start-readiness",
        "Cold start versus cold context",
        "cold-start",
        ["r5oec"],
        "A created pod, a running container, a loaded model, and a ready inference engine are different milestones.",
        [
          section(
            "Locate the startup work",
            "Capacity may require provisioning a node, pulling an image, finding model files, deserializing tensors, transferring weights, initializing worker communication, reserving buffers, and exercising kernels or graphs. Storage and data movement can dominate before user inference even begins.",
          ),
          section(
            "Remove a stage, not a mysterious number",
            "Warm nodes, pre-pulled images, nearby model artifacts, and retained serving replicas target different startup stages. Their costs and deployment constraints differ. A locally cached model file still needs to become usable tensors and execution state.",
          ),
          section(
            "Keep two kinds of warmth separate",
            "A Ready model can still have no reusable prefix. A new replica first pays startup cost, then builds useful cached context over time. Routing must reconcile readiness, queue depth, and locality. Measure time to usable capacity separately from warm-prefix request latency.",
          ),
        ],
        "Model readiness means the engine can serve; prefix warmth means it may be able to reuse earlier prompt work.",
        "Can a Ready replica still have a cold prefix cache?",
        [
          "Yes. Readiness and cached context are separate states.",
          "No. Every Ready replica contains all conversations.",
        ],
        0,
        "serving",
      ),
      lesson(
        "benchmark-design",
        "Design a benchmark you can trust",
        "benchmark",
        ["gqljc", "kirye"],
        "A benchmark is a conditional statement about a configuration under a workload, not a universal model or GPU score.",
        [
          section(
            "State the tested layer",
            "A local execution-path benchmark differs from an endpoint load test, which differs from a standardized system benchmark. Record the model artifact, tokenizer, quantization, runtime, hardware, arrival pattern, input/output distributions, cache state, and success target.",
          ),
          section(
            "Separate offered work from useful work",
            "Closed-loop concurrency waits for completions before sending replacement requests. Open-loop arrivals continue at the offered rate and reveal queue growth. Attained throughput can look healthy while requests fail the SLO. Goodput counts completed work meeting the specified objectives.",
          ),
          section(
            "Preserve evidence and repeat",
            "Keep a benchmark card, reproducibility manifest, raw request-level results, and relevant plots. Test cold and warm conditions separately. Repeated measurements and enough samples are needed to interpret tails; a short run’s p99 is weak evidence. The explorer uses synthetic example traces only.",
          ),
        ],
        "Compare equivalent conditions, report offered load and SLO goodput, and retain enough evidence to reproduce the claim.",
        "Is an API load test interchangeable with a local matrix execution benchmark?",
        [
          "No; they measure different system boundaries.",
          "Yes; any tokens-per-second number has the same meaning.",
        ],
        0,
        "observe",
      ),
      lesson(
        "agent-inference",
        "One task, many model calls",
        "workflow",
        ["far6c"],
        "An agent’s user-visible task can include repeated inference, growing context, external waits, and retries.",
        [
          section(
            "Trace calls and pauses",
            "Tool selection may be a short structured call. A tool result can create a large new prefill. Final synthesis may be decode-heavy. While one workflow waits on a tool, the GPU can serve other work, but the user’s task remains incomplete.",
          ),
          section(
            "Preserve only the evidence needed",
            "Stable prior tokens can support prefix reuse if compatible state is reachable. New tool output still requires processing. Reordering early messages, migrating replicas, or switching models can lose reuse. Structured state outside the prompt and bounded tool output help control repeated context cost.",
          ),
          section(
            "Evaluate the complete task",
            "Track calls, tokens, tool delays, retries, quality, cost, and total task latency. Under the specific assumption of independent stage events, five stages each meeting a target with probability 0.95 all meet it with probability 0.95⁵ ≈ 77%. This is a teaching model, not a prediction of a real workflow.",
          ),
        ],
        "A fast endpoint does not guarantee a fast or successful workflow; optimize the complete outcome.",
        "Does a tool wait disappear from the user’s task latency because the GPU can serve others?",
        ["No; the task is still waiting.", "Yes; only GPU time counts."],
        0,
        "serving",
      ),
      lesson(
        "multimodal-serving",
        "The hidden multimodal prompt",
        "multimodal",
        ["2dzgf"],
        "A short text prompt can conceal a large media-processing and context workload.",
        [
          section(
            "Follow the work before prefill",
            "Media retrieval, decoding, resizing or tiling, and modality encoding can occur before LLM prefill. Processed image resolution, retained video frames, audio duration/chunks, and resulting representations describe work more usefully than text length or file size alone.",
          ),
          section(
            "Separate the cache opportunities",
            "A media/embedding-cache hit may skip encoder work. A prefix/KV hit may skip eligible LLM prefill. These are different savings. For common embedding-insertion models, media expands the sequence and its KV state. Resamplers and cross-attention models require architecture-specific accounting.",
          ),
          section(
            "Balance evidence and resource use",
            "Fewer frames or tiles can reduce work but discard evidence needed for a brief event or small chart label. Grouping compatible input shapes can reduce uneven batching effects. Break down TTFT by preparation, encoder, LLM, and queue stages, and report tails by workload bucket.",
          ),
        ],
        "Measure the work that creates the effective prompt, and keep encoder-cache and KV-cache metrics separate.",
        "Does reusing an image embedding prove that the LLM’s prefix computation was also reused?",
        [
          "No; the two caches operate at different stages.",
          "Yes; all cache hits have the same meaning.",
        ],
        0,
        "input",
      ),
      lesson(
        "routing-policy",
        "Hard gates, cascades, and fallbacks",
        "routing-policy",
        ["ouxxf"],
        "Eligibility comes before ranking, and different multi-attempt paths need different evaluation.",
        [
          section(
            "Apply mandatory contracts first",
            "Context capacity, required tools, output schema, permitted provider/region, and evaluated task quality can disqualify a candidate. Cheap pricing cannot compensate for a mandatory requirement that is not met. A gateway can execute a custom policy without requiring a custom-trained router.",
          ),
          section(
            "Distinguish three paths",
            "Direct routing selects an eligible destination before generation. A cascade deliberately tries an earlier answer and escalates if task-specific evaluation rejects it. A fallback responds to unavailability or failure. Both can add attempts, cost, and tail delay, but they have different causes.",
          ),
          section(
            "Evaluate policy and system together",
            "Measure quality by task slice, JSON/tool failures, switches, route reasons, retries, actual cost per successful task, tails, and routing regret. Replay full conversations when state matters. Model routing, deployment routing, replica routing, and MoE routing are not one interchangeable operation.",
          ),
        ],
        "Filter out unsuitable candidates before applying preferences; distinguish quality escalation from availability fallback.",
        "What is a provider fallback normally responding to?",
        [
          "Unavailability or a failed preferred route",
          "A proof that every input became simpler",
        ],
        0,
        "gateway",
      ),
      lesson(
        "moe-routing",
        "Routing inside a Mixture-of-Experts model",
        "moe",
        ["ouxxf"],
        "An application chooses a model; an MoE gate chooses internal computation paths for tokens inside that model.",
        [
          section(
            "Route inside a layer",
            "A gate can assign scores to experts and choose a subset for a token at a particular MoE layer. Selected expert outputs are combined using gate weights. The next token or next layer can select a different set.",
          ),
          section(
            "Follow expert-parallel movement",
            "When experts are placed on different devices, token representations may need dispatch and return communication. Uneven expert selection can create hotspots. Expert parallelism therefore has a different communication and balance problem from choosing an HTTP model endpoint.",
          ),
          section(
            "Interpret sparse activation carefully",
            "Activating fewer experts does not imply that only those experts need to be stored or that latency equals a dense model of the active parameter count. Memory, routing, communication, architecture, and batch shape still matter. The explorer’s gate scores are illustrative.",
          ),
        ],
        "MoE routing is part of the model forward pass, not the application choosing a model for the whole request.",
        "Does the application normally pick “expert 3” for an entire user conversation?",
        [
          "No; the model’s gate routes token computation internally.",
          "Yes; an expert is a standalone chat provider.",
        ],
        0,
        "runtime",
      ),
      lesson(
        "structured-decisions",
        "Evidence, judgment, and application policy",
        "decisions",
        ["5cxge"],
        "A structured model estimate, a deterministic calculation, and a policy action are three different outputs.",
        [
          section(
            "Give the judgment a clear meaning",
            "In the source Jev article, state supplies evidence, instructions define the focused judgment, and criteria define possible answers. Choice, yes-probability, and ordered-score questions serve different purposes. Multiple independent yes/no estimates need not sum to one.",
          ),
          section(
            "Keep calculations and actions explicit",
            "A model can interpret supplied evidence, while application code performs arithmetic and applies an approved policy. A high estimated probability does not prove a claim or automatically authorize an action. An optional generative model can explain evidence and approved results without inventing internal reasoning.",
          ),
          section(
            "Evaluate calibration and version changes",
            "A calibrated 0.8 probability means about 80% of comparable cases assigned that value have the event occur across a dataset. It is not a guarantee about one answer. A concentrated distribution is not independent evidence of correctness. Test on the real workload, use shadow evaluation where appropriate, and pin versions after tuning.",
          ),
        ],
        "Treat probabilities as estimates, calculations as code, and consequential actions as explicit application policy.",
        "Must two independent yes/no estimates add up to one?",
        [
          "No; they describe different events.",
          "Yes; all probabilities are mutually exclusive choices.",
        ],
        0,
        "gateway",
      ),
      lesson(
        "release-validation",
        "Beyond green CI: release gates",
        "release-gates",
        ["ess3e"],
        "An inference release must preserve function, answer quality, and the required serving experience.",
        [
          section(
            "Make three separate decisions",
            "Functional checks cover API behavior, streaming, errors, and cancellation. Quality checks evaluate representative task outcomes, including tool choice and arguments. Performance checks measure user-facing latency and SLO goodput under the intended workload. Passing one does not prove the others.",
          ),
          section(
            "Compare a controlled candidate",
            "Pin the model, template, tokenizer, precision, hardware, runtime, workload, and cache condition except for the intended change. Compare both the known-good baseline and absolute targets. Repeat questionable results and examine distributions as well as explicit tail limits.",
          ),
          section(
            "Promote the tested image",
            "Fast PR checks, broader nightly runs, release-candidate tests, and a canary provide feedback at different stages. Preserve raw results on failure, define rollback conditions before expanding traffic, and promote the exact tested image/configuration. The original OCI graphic is a proposed workflow with custom test and gate code, not an automatically deployed system.",
          ),
        ],
        "Functional success, task quality, and SLO performance are independent release requirements.",
        "Can a candidate with higher throughput still fail an interactive service’s release gate?",
        [
          "Yes; quality or latency may no longer meet the requirements.",
          "No; throughput is the only release criterion.",
        ],
        0,
        "observe",
      ),
    ],
  },
];
