import { courseExtensions, sourceMappings } from "./curriculum.js";
import { getArticle } from "./articles.js";
import { lessonDetails, detailText } from "./lesson-details.js";

const source = (label, url) => ({ label, url });
const generation = source(
  "Hugging Face · Text generation",
  "https://huggingface.co/docs/transformers/en/llm_tutorial",
);
const cache = source(
  "Hugging Face · How caching works",
  "https://huggingface.co/docs/transformers/en/cache_explanation",
);
const quantization = source(
  "Hugging Face · Quantization concepts",
  "https://huggingface.co/docs/transformers/en/quantization/concept_guide",
);
const routing = source(
  "LiteLLM · Routing and load balancing",
  "https://docs.litellm.ai/docs/routing",
);
const prefix = source(
  "vLLM · Automatic prefix caching",
  "https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/",
);
const lmcache = source(
  "LMCache · Cache architecture",
  "https://docs.lmcache.ai/",
);
const metrics = source(
  "NVIDIA · Inference benchmarking",
  "https://developer.nvidia.com/blog/llm-benchmarking-fundamental-concepts/",
);

export const courses = [
  {
    id: "100",
    title: "Inference foundations",
    subtitle: "Build your mental model",
    description:
      "Start with a prompt. Understand the journey to an answer, the role of memory, and the hardware that makes it possible.",
    lessons: [
      {
        id: "what-is-inference",
        title: "What is LLM inference?",
        minutes: 6,
        lab: "inference",
        labTitle: "From a question to an answer",
        labHint: "Run the request, or step through it at your own pace.",
        intro:
          "Every time you ask a language model a question, you set inference in motion. A trained model uses what it has already learned to produce a response.",
        sections: [
          {
            title: "Using a model that has already learned",
            text: "Think of training as preparing a musician, and inference as a performance. The model’s learned parameters—also called weights—are already in place. During a typical text-generation request, those weights stay fixed while the model calculates what token could come next.",
          },
          {
            title: "A response grows one token at a time",
            text: "A token can be a word, part of a word, or punctuation. The model considers the prompt and the output so far, then selects another token. Repeating that process creates a response. Fluent output can still be incorrect; generating plausible text and checking facts are different tasks.",
          },
        ],
        takeaway:
          "Inference is the act of running a trained model on new input. Serving is the system that makes this available to users.",
        quiz: {
          question: "When a typical chat request runs, what changes?",
          answers: [
            "The model learns new weights from the question.",
            "The working context grows as the model generates tokens.",
            "The model retrains before every answer.",
          ],
          correct: 1,
          explanation:
            "The prompt and generated tokens form a growing context. The trained weights normally remain fixed.",
        },
        sources: [generation],
        layer: "serving",
      },
      {
        id: "training-vs-inference",
        title: "Inference vs. training",
        minutes: 5,
        lab: "training",
        labTitle: "Same model. Different job.",
        labHint: "Switch between learning the weights and using the weights.",
        intro:
          "Both training and inference run model computations. The difference is whether the goal is to change the model or use it.",
        sections: [
          {
            title: "Training changes the parameters",
            text: "Training compares predictions with a target or objective, calculates gradients, and uses an optimizer to update weights. Fine-tuning is also training, even when only a small set of parameters is updated. It requires additional memory for gradients and optimizer state.",
          },
          {
            title: "Inference uses the parameters",
            text: "Inference runs forward computations to produce an output. A chat history changes the input available to the model, rather than permanently teaching it. Retrieval can add fresh information to that input. Neither requires changing the weights.",
          },
        ],
        takeaway:
          "Do not use a training memory estimate to size inference. Inference needs weights, request state, and runtime workspace.",
        quiz: {
          question:
            "Does adding a document to a chat prompt fine-tune the model?",
          answers: [
            "Yes, because the model sees new information.",
            "No. It changes the input context, not the trained weights.",
          ],
          correct: 1,
          explanation:
            "The document can inform this response, but a parameter update requires a separate training process.",
        },
        sources: [
          source(
            "Hugging Face · Fine-tuning a pretrained model",
            "https://huggingface.co/docs/transformers/en/training",
          ),
        ],
        layer: "runtime",
      },
      {
        id: "request-lifecycle",
        title: "The life of a request",
        minutes: 7,
        lab: "inference",
        labTitle: "Follow the inference pipeline",
        labHint:
          "Watch the prompt become tokens, context state, and streamed output.",
        intro:
          "The answer you see is the last part of a small pipeline. Understanding the stages helps you ask better questions when an app feels slow.",
        sections: [
          {
            title: "Prepare and process the prompt",
            text: "An application assembles instructions, conversation history, and any retrieved information. A tokenizer converts this text to model-specific token IDs. The model processes the input in a phase called prefill, which prepares the attention state used during generation.",
          },
          {
            title: "Generate and stream the response",
            text: "Decode extends the sequence through successive model steps. A server can stream chunks of text to the client before generation is finished. A request can end at an end-of-sequence token, an output limit, a stop rule, or cancellation.",
          },
        ],
        takeaway:
          "Waiting for the first visible token and waiting between subsequent tokens are different experiences—and different performance problems.",
        quiz: {
          question: "Which phase processes the input prompt?",
          answers: ["Prefill", "Decode", "An optimizer update"],
          correct: 0,
          explanation:
            "Prefill processes prompt tokens. Decode continues the sequence with generated tokens.",
        },
        sources: [
          source(
            "Hugging Face · Tokenization",
            "https://huggingface.co/docs/transformers/en/tokenizer_summary",
          ),
          metrics,
        ],
        layer: "input",
      },
      {
        id: "kv-cache-basics",
        title: "KV cache, simply explained",
        minutes: 7,
        lab: "kv",
        labTitle: "Keep the work you already did",
        labHint:
          "Generate a token, then compare keeping the cache with recomputing context.",
        intro:
          "The KV cache stores attention keys and values for earlier tokens. It helps a model continue a sequence without calculating those same keys and values again.",
        sections: [
          {
            title: "A working memory for attention",
            text: "For each new token, attention needs information about the earlier context. With a KV cache, the model reads previously stored keys and values and adds those for the new token. It still performs attention over the relevant context; the cache does not eliminate all work on earlier tokens.",
          },
          {
            title: "Useful, but not free",
            text: "This state takes memory and usually grows with context length and the number of active sequences. It is separate from model weights. It is also separate from a response cache, which stores a finished answer and can sometimes bypass model execution entirely.",
          },
        ],
        takeaway:
          "KV cache reuses intermediate attention state. It does not store a ready-made answer or permanently teach the model.",
        quiz: {
          question: "What does the KV cache retain?",
          answers: [
            "A database of finished answers",
            "Attention keys and values from prior tokens",
            "Newly trained model weights",
          ],
          correct: 1,
          explanation:
            "Keys and values are intermediate attention state used to continue generation.",
        },
        sources: [cache],
        layer: "kv-cache",
      },
      {
        id: "model-routing",
        title: "Why route between models?",
        minutes: 6,
        lab: "routing",
        labTitle: "Give each request a suitable destination",
        labHint: "Change the task to see an example routing policy in action.",
        intro:
          "An app does not have to send every request to the same model. A gateway can choose a destination according to task requirements and operational policy.",
        sections: [
          {
            title: "Match the model to the task",
            text: "A short rewrite and a difficult coding problem may need different capabilities. A routing policy might choose a smaller general model, a coding specialist, or a more capable general model. These choices need evaluation on your own tasks; parameter count alone does not establish quality.",
          },
          {
            title: "Keep the service available",
            text: "After a model is chosen, traffic can be spread across compatible deployments. Health checks, rate limits, timeouts, and fallback rules help handle unavailable destinations. A fallback must still satisfy the application’s requirements for quality, privacy, and format.",
          },
        ],
        takeaway:
          "Model selection chooses the capability. Load balancing chooses a deployment that can serve it.",
        quiz: {
          question:
            "What should decide whether a smaller model can handle a task?",
          answers: [
            "Its name",
            "Evaluated task quality and the application’s requirements",
            "The shortest possible answer",
          ],
          correct: 1,
          explanation:
            "A routing decision should be grounded in task evaluation, then constrained by operating requirements.",
        },
        sources: [routing],
        layer: "gateway",
      },
      {
        id: "hardware-sizing",
        title: "Size a GPU or CPU for inference",
        minutes: 10,
        lab: "memory",
        labTitle: "Will the model and its context fit?",
        labHint:
          "Change precision, context, and concurrency. Watch the memory budget move.",
        intro:
          "Downloading a model is only the first step. To run it, the execution device needs room for weights, active context, and the engine’s working memory.",
        sections: [
          {
            title: "Start with the weights, then add the workload",
            text: "A rough raw-weight estimate is parameter count × bits per weight ÷ 8. An 8-billion-parameter model at 16 bits has about 16 GB of raw weights. Quantized formats add metadata and may keep some tensors at higher precision. The loaded footprint depends on the runtime and model format.",
          },
          {
            title: "Memory fit is only one part of sizing",
            text: "Longer contexts and more simultaneous sequences need more KV memory. Leave space for activations, temporary buffers, and the runtime. On a GPU, check usable device memory and supported kernels. On a CPU, check available RAM, memory bandwidth, thread scaling, and acceptable response time. Unified-memory systems share capacity with other applications.",
          },
          {
            title: "Measure before you choose",
            text: "A model that fits can still be too slow. Benchmark representative prompts, outputs, and concurrency on the intended runtime. Offloading to CPU memory or splitting across GPUs changes performance and adds transfer considerations. This lab estimates memory, not tokens per second or a recommended hardware purchase.",
          },
        ],
        takeaway:
          "Budget for weights + KV cache + runtime headroom. Then measure latency and throughput on the actual hardware.",
        quiz: {
          question: "A model’s weights fit into device memory. Is that enough?",
          answers: [
            "Yes, the weight file is the entire working set.",
            "No. Context state and runtime workspace also need capacity.",
          ],
          correct: 1,
          explanation:
            "The workload adds KV cache, and the engine needs additional working space.",
        },
        sources: [quantization, metrics],
        layer: "runtime",
      },
    ],
  },
  {
    id: "200",
    title: "Inside the serving engine",
    subtitle: "Understand the tradeoffs",
    description:
      "Go below the API. Explore how engines schedule work, reuse context, and balance memory, latency, and throughput.",
    lessons: [
      {
        id: "prefill-decode",
        title: "Prefill and decode, in depth",
        minutes: 8,
        lab: "phases",
        labTitle: "Two phases, two kinds of work",
        labHint:
          "Change prompt and output length to explore a simplified request timeline.",
        intro:
          "Prefill and decode both run the model, but their workload shapes differ. That difference drives many inference optimizations.",
        sections: [
          {
            title: "Prefill works across the prompt",
            text: "A causal transformer can process many prompt positions in parallel while respecting its attention mask. Longer prompts increase work and attention-state storage. Prefill often makes good use of large matrix operations, though its bottleneck depends on the model, sequence length, and hardware.",
          },
          {
            title: "Decode advances each sequence",
            text: "Ordinary autoregressive decode adds one token per active sequence per step. Small-batch decode is often constrained by moving weights and cache state through memory. Batching can improve utilization, but larger batches and longer contexts can shift the bottleneck. Chunked prefill lets an engine interleave pieces of prompt work with decode.",
          },
        ],
        takeaway:
          "A long prompt can delay the first token. A long output can keep a decode slot and its cache occupied for longer.",
        quiz: {
          question: "Why can a long prompt hurt time to first token?",
          answers: [
            "It adds prefill work before output begins.",
            "It always changes the model’s precision.",
            "It disables the tokenizer.",
          ],
          correct: 0,
          explanation:
            "The input must be processed before the model can continue it; queueing and transfers can add more delay.",
        },
        sources: [
          source(
            "NVIDIA · Benchmarking overview",
            "https://docs.nvidia.com/nim/benchmarking/llm/latest/overview.html",
          ),
          source(
            "Hugging Face · Continuous batching",
            "https://huggingface.co/docs/transformers/en/continuous_batching",
          ),
        ],
        layer: "serving",
      },
      {
        id: "kv-memory",
        title: "The KV cache memory budget",
        minutes: 10,
        lab: "memory",
        labTitle: "Make context memory visible",
        labHint:
          "Try increasing active sequences, then switch from 8 to 32 KV heads.",
        intro:
          "Weight precision and cache precision are separate choices. Even a small quantized model can have a large context-memory footprint.",
        sections: [
          {
            title: "Read the model architecture",
            text: "For a conventional full-attention cache, raw KV bytes ≈ 2 × layers × KV heads × head dimension × cached tokens × active sequences × bytes per cache element. The factor of two accounts for keys and values. Use KV heads, not query heads: grouped-query attention shares keys and values across groups of query heads.",
          },
          {
            title: "Know what the estimate leaves out",
            text: "This formula assumes equally long sequences and uniform full-attention layers. Sliding windows, hybrid models, latent attention, shared prefixes, cache quantization, and sharding change the calculation. Allocation blocks and fragmentation add overhead. Read the model configuration and inspect the engine’s actual memory use.",
          },
        ],
        takeaway:
          "Concurrency and retained token length multiply the cache footprint. Weight quantization alone does not shrink a 16-bit KV cache.",
        quiz: {
          question:
            "Which change doubles raw KV memory under this lab’s assumptions?",
          answers: [
            "Doubling the number of equally long active sequences",
            "Changing weights from 16-bit to 8-bit",
            "Renaming the model",
          ],
          correct: 0,
          explanation:
            "Each active sequence retains its own attention state in this unshared-cache estimate.",
        },
        sources: [
          source(
            "Hugging Face · Cache strategies",
            "https://huggingface.co/docs/transformers/en/kv_cache",
          ),
        ],
        layer: "kv-cache",
      },
      {
        id: "prefix-reuse",
        title: "Reuse a prefix across requests",
        minutes: 8,
        lab: "prefix",
        labTitle: "Same beginning. Less repeated work.",
        labHint:
          "Change where the new request diverges from the cached token sequence.",
        intro:
          "Many requests begin with the same instructions or reference document. Prefix caching can reuse the attention state for that common beginning.",
        sections: [
          {
            title: "Match the beginning of the sequence",
            text: "Reuse depends on a matching token prefix and compatible model state. A change early in the prompt invalidates the later prefix, even if the rest looks similar. Engines commonly reuse complete cache blocks rather than arbitrary partial blocks. Stable shared content at the beginning can improve reuse opportunities.",
          },
          {
            title: "The new answer still needs generation",
            text: "A prefix hit saves eligible prefill work; it does not retrieve a finished response or eliminate decode. Cache eviction and tenant isolation also matter. KV chunks from unrelated positions cannot simply be stitched together for a normal causal transformer: specialized blending approaches may recompute selected tokens to account for changed context.",
          },
        ],
        takeaway:
          "Prefix caching is exact context-state reuse, not semantic answer caching. Similar wording is not enough.",
        quiz: {
          question:
            "If token 3 changes, can an ordinary prefix cache reuse unchanged tokens after it?",
          answers: [
            "Yes, unchanged words anywhere in the prompt are reusable.",
            "No. Ordinary prefix reuse stops before the divergence.",
          ],
          correct: 1,
          explanation:
            "Later attention state depends on the preceding context. This lab also rounds reuse down to full blocks.",
        },
        sources: [
          prefix,
          source(
            "LMCache · CacheBlend",
            "https://docs.lmcache.ai/kv_cache_optimizations/cacheblend.html",
          ),
        ],
        layer: "kv-cache",
      },
      {
        id: "cache-tiers",
        title: "KV cache tiers and chaining",
        minutes: 9,
        lab: "tiers",
        labTitle: "Find context before recomputing it",
        labHint:
          "Choose where the cache lives, then trace its path back to execution.",
        intro:
          "Cache chaining here means checking a sequence of storage tiers for compatible KV state. It extends the reuse pool beyond the executing device.",
        sections: [
          {
            title: "Separate capacity from execution",
            text: "A serving system may retain hot state in GPU memory and offload reusable state to host RAM, local storage, or a remote store. A lookup can check successive tiers. A hit outside the execution device generally needs transfer or staging before the attention kernel can use it.",
          },
          {
            title: "Reuse has a cost",
            text: "A cache hit is useful only when lookup and restore cost compare favorably with recomputation. Transfer size, interconnect bandwidth, eviction policy, and workload locality affect that decision. A remote cache is a fleet resource, not necessarily a slower tier beneath local disk. The order shown in this lab is one illustrative policy, rather than a universal architecture.",
          },
        ],
        takeaway:
          "A tier can hold more context without making it instantly accessible. Account for the path back to the execution device.",
        quiz: {
          question:
            "Why might an engine recompute instead of restoring a cache hit?",
          answers: [
            "Restoring the state may cost more than recomputation.",
            "All remote caches change the model weights.",
            "A cache always contains final answers.",
          ],
          correct: 0,
          explanation:
            "Reuse must justify its lookup and transfer cost for the workload and hardware.",
        },
        sources: [
          lmcache,
          source(
            "vLLM · KV offloading",
            "https://docs.vllm.ai/en/latest/features/kv_offloading_usage/",
          ),
        ],
        layer: "kv-cache",
      },
      {
        id: "continuous-batching",
        title: "Continuous batching",
        minutes: 8,
        lab: "batching",
        labTitle: "Fill a slot as soon as it opens",
        labHint:
          "Compare fixed batches with an engine that admits work between decode steps.",
        intro:
          "User requests arrive at different times and produce different output lengths. A serving engine can schedule them together without making every request wait for the longest one.",
        sections: [
          {
            title: "A fixed batch can leave gaps",
            text: "In a simple static batch, short sequences finish while a longer sequence is still running. Their slots may remain idle until the batch ends. Continuous batching revisits scheduling between iterations so a waiting request can use an available slot.",
          },
          {
            title: "Admission is a memory decision too",
            text: "A free compute slot does not guarantee room for a request’s cache. Engines budget tokens and KV blocks, manage prefill alongside decode, and may preempt work when memory is tight. Increasing concurrency can improve aggregate throughput while increasing queueing or per-request latency. The animation isolates slot scheduling, omitting prefill and memory constraints.",
          },
        ],
        takeaway:
          "Keep the engine busy, but judge throughput together with latency and memory limits.",
        quiz: {
          question:
            "What can continuous batching do after a short request finishes?",
          answers: [
            "Admit a waiting request at a later iteration",
            "Guarantee zero queueing for every request",
            "Remove the need for KV memory",
          ],
          correct: 0,
          explanation:
            "A new request can join when scheduling and memory constraints permit.",
        },
        sources: [
          source(
            "Hugging Face · Continuous batching",
            "https://huggingface.co/docs/transformers/en/continuous_batching",
          ),
        ],
        layer: "serving",
      },
      {
        id: "distributed-serving",
        title: "Split work and route for locality",
        minutes: 9,
        lab: "distributed",
        labTitle: "Prefill here. Decode there.",
        labHint:
          "Trace the handoff, including the KV state that has to move with the request.",
        intro:
          "At fleet scale, choosing a worker is more than choosing the least busy machine. The location of reusable context and the type of work can matter.",
        sections: [
          {
            title: "Separate prefill and decode pools",
            text: "Disaggregated serving assigns prompt processing and token generation to different workers. This can reduce interference and let each pool scale independently. The decode worker needs compatible model weights and the prompt’s KV state, so the handoff requires an explicit transfer mechanism.",
          },
          {
            title: "Balance load with cache locality",
            text: "A worker with a reusable prefix may save prefill work, but it may also have a long queue. A router must weigh locality against capacity and transfer cost. Splitting the phases adds network and orchestration overhead, so it is a workload-dependent choice. A single local runtime often does not need this complexity.",
          },
        ],
        takeaway:
          "Distributed inference moves both work and state. A faster pool is useful only if the whole request path improves.",
        quiz: {
          question: "What must a decode worker receive after remote prefill?",
          answers: [
            "Only the finished answer",
            "Compatible KV state for the processed context",
            "The training optimizer history",
          ],
          correct: 1,
          explanation:
            "Decode continues from the prompt’s attention state, with a compatible model and cache layout.",
        },
        sources: [
          source(
            "vLLM · Disaggregated prefilling",
            "https://docs.vllm.ai/en/latest/features/disagg_prefill/",
          ),
          source(
            "llm-d · Distributed inference",
            "https://github.com/llm-d/llm-d",
          ),
        ],
        layer: "distributed",
      },
      {
        id: "inference-metrics",
        title: "Measure the user experience",
        minutes: 8,
        lab: "metrics",
        labTitle: "Where does the waiting happen?",
        labHint:
          "Adjust queueing and generation to see first-token and total latency.",
        intro:
          "“Tokens per second” is useful, but it cannot describe the whole experience. Measure the wait to start, the pace of output, and behavior under load.",
        sections: [
          {
            title: "Use the right latency measure",
            text: "Time to first token (TTFT) is the delay from sending a request to receiving its first output token. It can include queueing, prompt work, and network time. Inter-token latency measures the spacing of later tokens. End-to-end latency measures the wait until the response finishes.",
          },
          {
            title: "Compare equivalent workloads",
            text: "Report prompt and output lengths, concurrency or arrival rate, model, precision, hardware, and cache conditions alongside results. Check tail latency as well as averages. A service can raise aggregate token throughput while making individual users wait longer. Evaluate answer quality alongside performance.",
          },
        ],
        takeaway:
          "Optimize for the application: a responsive chat and a background batch job can have different targets.",
        quiz: {
          question:
            "Which metric best describes how soon a streaming answer starts?",
          answers: [
            "Time to first token",
            "Model download size",
            "Total number of parameters",
          ],
          correct: 0,
          explanation:
            "TTFT captures the user’s initial wait. Inter-token latency describes the pace after that.",
        },
        sources: [
          metrics,
          source(
            "NVIDIA · Benchmark metrics",
            "https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html",
          ),
        ],
        layer: "observe",
      },
    ],
  },
];

for (const extension of courseExtensions) {
  const existing = courses.find((course) => course.id === extension.id);
  if (existing) existing.lessons.push(...extension.lessons);
  else courses.push(extension);
}
for (const course of courses) {
  for (const lesson of course.lessons) {
    lesson.articleIds ||= sourceMappings[lesson.id] || [];
    lesson.study = lessonDetails[lesson.id];
    if (!lesson.study)
      throw new Error(`Missing standalone guide: ${lesson.id}`);
    const readingCharacters =
      detailText(lesson.study).length +
      lesson.sections.reduce(
        (total, section) => total + section.text.length,
        0,
      );
    lesson.minutes = Math.max(
      lesson.minutes,
      Math.ceil(readingCharacters / 1300) + 5,
    );
    lesson.sources = [
      ...lesson.articleIds.map((id) => {
        const article = getArticle(id);
        if (!article) throw new Error(`Missing article ${id}`);
        return { label: article.title, url: article.url, articleId: id };
      }),
      ...lesson.sources,
    ];
  }
}

export const allLessons = courses.flatMap((course) =>
  course.lessons.map((lesson) => ({ ...lesson, courseId: course.id })),
);
export function getLesson(id) {
  return allLessons.find((lesson) => lesson.id === id) || allLessons[0];
}
export function getCourse(id) {
  return courses.find((course) => course.id === id) || courses[0];
}
