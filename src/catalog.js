const reviewed = '2026-07-23';

const makeTool = (
  id,
  name,
  type,
  primaryLayer,
  supportedHardware,
  description,
  chooseWhen,
  relationships,
  officialUrl,
  status = 'active',
) => ({
  id,
  name,
  type,
  primaryLayer,
  supportedHardware,
  description,
  chooseWhen,
  relationships,
  officialUrl,
  status,
  lastReviewed: reviewed,
});

export const layers = [
  {
    id: 'input',
    number: '01',
    name: 'Input efficiency',
    short: 'Tokens in',
    description: 'Tokenization, prompt compression, and constrained output before a request enters the serving plane.',
    modeNote: 'These tools are hardware-neutral; CPU mode makes local tokenization and compact prompts especially valuable.',
    stackPosition: 'At the application edge, before the request is routed to a provider or self-hosted model.',
    guide: [
      'Keeps token counts and tokenizer behavior aligned with the target model.',
      'Reduces expensive prompt work through compression when quality permits.',
      'Constrains output when downstream systems need a reliable schema.',
    ],
    readMoreUrl: 'https://huggingface.co/docs/transformers/main/en/tokenizer_summary',
    readMoreLabel: 'tokenization fundamentals',
  },
  {
    id: 'gateway',
    number: '02',
    name: 'Gateway & routing',
    short: 'Route',
    description: 'Provider abstraction, policy, rate control, fallback, and model-aware routing at the request edge.',
    modeNote: 'The gateway remains active in both modes; the destination set changes with the serving path.',
    stackPosition: 'At request ingress, after application policy and before a cache, fleet controller, or model destination is chosen.',
    guide: [
      'Normalizes model APIs so applications are not tied to one provider or engine.',
      'Applies authentication, rate limits, budgets, retries, and fallbacks.',
      'Chooses the destination using policy, cost, latency, or model capability.',
    ],
    readMoreUrl: 'https://docs.litellm.ai/docs/proxy/quick_start',
    readMoreLabel: 'LLM gateway patterns',
  },
  {
    id: 'response-cache',
    number: '04',
    name: 'Response cache',
    short: 'Shortcut',
    description: 'Exact and semantic response reuse that can answer a request before model execution.',
    modeNote: 'Response caching is hardware-neutral and is the fastest possible inference optimization on either path.',
    stackPosition: 'Immediately after gateway policy. A cache hit short-circuits the rest of the inference stack.',
    guide: [
      'Checks exact or semantically similar requests before model execution.',
      'Returns a validated prior answer with no prefill or decode cost on a hit.',
      'Needs freshness, tenancy, and correctness rules before reuse is allowed.',
    ],
    readMoreUrl: 'https://redis.io/langcache/',
    readMoreLabel: 'semantic response caching',
  },
  {
    id: 'kv-cache',
    number: '05',
    name: 'KV cache fabric',
    short: 'Reuse context',
    description: 'Prefix reuse, offload tiers, and remote KV cache transfer for long-context and repeated-prefix workloads.',
    modeNote: 'GPU mode activates the full multi-tier fabric. CPU mode retains local context reuse while GPU-specific transfer layers recede.',
    stackPosition: 'Beside the model engine, retaining the context state created during prefill so it can be reused for decode.',
    guide: [
      'Stores the attention state produced while the engine processes a prompt.',
      'Reuses repeated prefixes to avoid recomputing the same context tokens.',
      'Moves state through memory tiers when the hottest GPU cache is full.',
    ],
    readMoreUrl: 'https://docs.vllm.ai/en/latest/features/kv_offloading_usage/',
    readMoreLabel: 'KV cache offloading',
  },
  {
    id: 'serving',
    number: '06',
    name: 'Serving engines',
    short: 'Generate',
    description: 'The schedulers and runtimes that batch, prefill, decode, and stream model tokens.',
    modeNote: 'GPU mode favors continuous batching and disaggregated prefill/decode; CPU mode favors compact local runtimes.',
    stackPosition: 'At the execution core: the engine schedules prefill and decode work, then streams generated tokens back to the client.',
    guide: [
      'Loads the model, batches requests, and decides when each request is admitted.',
      'Runs prefill for the prompt and decode for each output token.',
      'Exposes the inference API and reports queue, token, and cache metrics.',
    ],
    readMoreUrl: 'https://docs.vllm.ai/en/latest/serving/openai_compatible_server/',
    readMoreLabel: 'production model serving',
  },
  {
    id: 'runtime',
    number: '07',
    name: 'Runtime & optimization',
    short: 'Execute',
    description: 'Hardware execution, quantization, compilation, and deployment primitives below the serving engine.',
    modeNote: 'GPU mode spotlights CUDA-oriented compilation; CPU mode spotlights quantized local execution and Intel/Apple paths.',
    stackPosition: 'Below the serving engine, translating model operations to the selected accelerator, processor, or local device.',
    guide: [
      'Selects the execution backend, kernels, model format, and numeric precision.',
      'Uses quantization or compilation to trade small accuracy changes for lower memory and latency.',
      'Defines whether a model runs on a server GPU, CPU, Apple Silicon, browser, or edge device.',
    ],
    readMoreUrl: 'https://github.com/ggml-org/llama.cpp',
    readMoreLabel: 'portable local inference',
  },
  {
    id: 'distributed',
    number: '03',
    name: 'Distributed control plane',
    short: 'Scale out',
    description: 'Fleet scheduling, inference-aware gateways, and operators that scale serving across nodes.',
    modeNote: 'This becomes central when GPU inference is split across many workers; it is optional for local CPU serving.',
    stackPosition: 'Between ingress and execution, coordinating which worker, prefill pool, decode pool, or endpoint receives each request.',
    guide: [
      'Places requests on healthy workers with capacity and, ideally, reusable KV context.',
      'Separates prefill and decode pools when their resource demands differ.',
      'Coordinates autoscaling, endpoint discovery, topology, and Kubernetes lifecycle.',
    ],
    readMoreUrl: 'https://github.com/llm-d/llm-d',
    readMoreLabel: 'Kubernetes-native distributed inference',
  },
  {
    id: 'managed',
    number: '08',
    name: 'Managed endpoints',
    short: 'Consume',
    description: 'Hosted model endpoints that can be targets behind a universal gateway.',
    modeNote: 'Managed endpoints abstract the accelerator choice, so they stay available in both modes.',
    stackPosition: 'An alternate destination selected from the gateway when you consume hosted inference instead of operating the serving fleet.',
    guide: [
      'Outsources model capacity, patching, and accelerator management to a cloud service.',
      'Still benefits from a gateway for provider portability, policy, and fallback.',
      'Moves control from engine tuning toward service selection, quota, and governance.',
    ],
    readMoreUrl: 'https://huggingface.co/inference-endpoints',
    readMoreLabel: 'managed model endpoints',
  },
  {
    id: 'observe',
    number: '09',
    name: 'Observe & benchmark',
    short: 'Measure',
    description: 'Tracing, metrics, evaluation, GPU telemetry, and load testing across the entire path.',
    modeNote: 'Measure time-to-first-token, throughput, cache hit rate, cost, and tail latency before changing the stack.',
    stackPosition: 'Cross-cutting every layer: instrumentation follows a request from the application through the gateway, cache, engine, and hardware.',
    guide: [
      'Connects application traces to gateway decisions, model execution, and infrastructure metrics.',
      'Measures time-to-first-token, token throughput, cache hit rate, cost, and tail latency.',
      'Compares realistic workloads before changing a serving configuration or topology.',
    ],
    readMoreUrl: 'https://opentelemetry.io/docs/',
    readMoreLabel: 'end-to-end observability',
  },
];

export const tools = [
  // 01 · input efficiency (7)
  makeTool('tiktoken', 'tiktoken', 'client library', 'input', ['gpu', 'cpu'], 'Fast BPE tokenization used to estimate and prepare model inputs.', 'You need predictable token counting for OpenAI-compatible model workflows.', ['gateway', 'response-cache'], 'https://github.com/openai/tiktoken'),
  makeTool('hf-tokenizers', 'Hugging Face Tokenizers', 'client library', 'input', ['gpu', 'cpu'], 'High-performance tokenization library with broad open-model support.', 'Your application serves several Hugging Face model families.', ['hf-optimum', 'tgi'], 'https://github.com/huggingface/tokenizers'),
  makeTool('sentencepiece', 'SentencePiece', 'tokenizer', 'input', ['gpu', 'cpu'], 'Language-independent subword tokenizer commonly used by open model families.', 'You need to reproduce the tokenizer behavior of SentencePiece-based models.', ['llama-cpp', 'mlx'], 'https://github.com/google/sentencepiece'),
  makeTool('llmlingua', 'LLMLingua', 'prompt optimizer', 'input', ['gpu', 'cpu'], 'Prompt-compression toolkit intended to reduce input-token cost and latency.', 'Long prompts are repeated or cost-sensitive and you can validate compression quality.', ['response-cache', 'semantic-cache'], 'https://github.com/microsoft/LLMLingua'),
  makeTool('tokenmonster', 'TokenMonster', 'tokenizer', 'input', ['gpu', 'cpu'], 'Tokenizer library focused on compact vocabularies and fast token processing.', 'You are evaluating tokenization efficiency for custom or multilingual workloads.', ['tiktoken'], 'https://github.com/alasdairforsythe/tokenmonster'),
  makeTool('outlines', 'Outlines', 'structured output', 'input', ['gpu', 'cpu'], 'Structured-generation library that constrains outputs to schemas and regular languages.', 'Your inference workflow must return valid JSON, typed values, or constrained text.', ['xgrammar', 'vllm'], 'https://github.com/dottxt-ai/outlines'),
  makeTool('xgrammar', 'XGrammar', 'structured output', 'input', ['gpu', 'cpu'], 'Efficient grammar-constrained generation engine for structured LLM output.', 'You need low-overhead grammar constraints in an inference server.', ['vllm', 'sglang'], 'https://github.com/mlc-ai/xgrammar'),

  // 02 · gateway and routing (8)
  makeTool('litellm', 'LiteLLM', 'gateway', 'gateway', ['gpu', 'cpu'], 'OpenAI-compatible gateway, proxy, routing, fallbacks, budgets, and provider abstraction.', 'You need one API surface across hosted providers and self-hosted engines.', ['envoy-ai-gateway', 'openrouter', 'vllm'], 'https://github.com/BerriAI/litellm'),
  makeTool('envoy-ai-gateway', 'Envoy AI Gateway', 'gateway', 'gateway', ['gpu', 'cpu'], 'Kubernetes-native, two-tier gateway for generative-AI traffic and self-hosted endpoint selection.', 'You need ingress policy plus endpoint-aware routing in a cloud-native environment.', ['gateway-inference-extension', 'kserve'], 'https://github.com/envoyproxy/ai-gateway'),
  makeTool('kong-ai-gateway', 'Kong AI Gateway', 'gateway', 'gateway', ['gpu', 'cpu'], 'AI traffic gateway for provider access, authentication, governance, and observability.', 'API governance and enterprise gateway controls are already centered on Kong.', ['litellm', 'helicone'], 'https://konghq.com/products/kong-ai-gateway'),
  makeTool('portkey', 'Portkey', 'gateway', 'gateway', ['gpu', 'cpu'], 'AI gateway and observability layer with routing, guardrails, and provider resilience.', 'You want a managed control plane for multi-provider application traffic.', ['openrouter', 'helicone'], 'https://portkey.ai/'),
  makeTool('openrouter', 'OpenRouter', 'model router', 'gateway', ['gpu', 'cpu'], 'Unified API and marketplace router across hosted model providers.', 'You want application-level access to many hosted models through one endpoint.', ['litellm', 'managed'], 'https://openrouter.ai/'),
  makeTool('cloudflare-ai-gateway', 'Cloudflare AI Gateway', 'gateway', 'gateway', ['gpu', 'cpu'], 'Edge gateway for provider routing, caching, rate limiting, and observability.', 'Your application already benefits from Cloudflare’s edge network and controls.', ['response-cache', 'managed'], 'https://developers.cloudflare.com/ai-gateway/'),
  makeTool('helicone', 'Helicone', 'gateway', 'gateway', ['gpu', 'cpu'], 'Open-source AI observability and proxy gateway for request analytics and caching.', 'You want a proxy-shaped observability layer during development or production.', ['litellm', 'langfuse'], 'https://www.helicone.ai/'),
  makeTool('routellm', 'RouteLLM', 'model router', 'gateway', ['gpu', 'cpu'], 'Open model router for balancing quality and cost across a strong and weak model pair.', 'You need learned model selection instead of only static fallback rules.', ['litellm', 'openrouter'], 'https://github.com/lm-sys/RouteLLM'),

  // 03 · response caching (3)
  makeTool('gptcache', 'GPTCache', 'semantic cache', 'response-cache', ['gpu', 'cpu'], 'Semantic cache for LLM responses that matches meaning rather than only exact inputs.', 'Repeated questions have paraphrased wording and a guarded cache hit is acceptable.', ['redis-langcache', 'llmlingua'], 'https://github.com/zilliztech/GPTCache'),
  makeTool('redis-langcache', 'Redis LangCache', 'semantic cache', 'response-cache', ['gpu', 'cpu'], 'Managed semantic cache designed for LLM response reuse.', 'You want managed semantic cache behavior backed by Redis infrastructure.', ['gptcache', 'langchain-cache'], 'https://redis.io/langcache/'),
  makeTool('langchain-cache', 'LangChain cache', 'cache interface', 'response-cache', ['gpu', 'cpu'], 'Cache interfaces and integrations for application-level LLM response reuse.', 'Your application already uses LangChain and needs interchangeable cache backends.', ['gptcache', 'redis-langcache'], 'https://python.langchain.com/docs/how_to/llm_caching/'),

  // 04 · KV cache fabric (10)
  makeTool('pagedattention', 'PagedAttention', 'cache primitive', 'kv-cache', ['gpu'], 'Block-based KV-cache management pattern introduced by vLLM for efficient GPU memory use.', 'You need to understand the memory-management idea underlying vLLM-style serving.', ['vllm', 'lmcache'], 'https://docs.vllm.ai/en/latest/design/paged_attention/'),
  makeTool('radixattention', 'RadixAttention', 'cache primitive', 'kv-cache', ['gpu'], 'Radix-tree prefix cache used by SGLang to maximize reuse of shared prompts.', 'Requests share long system prompts, documents, or conversation prefixes.', ['sglang', 'hicache'], 'https://docs.sglang.ai/'),
  makeTool('hicache', 'HiCache', 'cache tier', 'kv-cache', ['gpu'], 'Hierarchical cache mechanism for extending SGLang KV reuse beyond GPU memory.', 'Large-context workloads need a staged GPU, host-memory, or storage cache hierarchy.', ['sglang', 'mooncake'], 'https://docs.sglang.ai/advanced_features/hicache.html'),
  makeTool('trt-kv-cache', 'TensorRT-LLM KV cache', 'cache primitive', 'kv-cache', ['gpu'], 'KV-cache controls within TensorRT-LLM for paged cache behavior and reuse.', 'You are serving NVIDIA-optimized models through TensorRT-LLM or Dynamo.', ['tensorrt-llm', 'nvidia-dynamo'], 'https://nvidia.github.io/TensorRT-LLM/advanced/kv-cache-reuse.html'),
  makeTool('lmcache', 'LMCache', 'distributed cache', 'kv-cache', ['gpu'], 'Distributed KV cache extension that reuses context across serving instances and storage tiers.', 'Long-context prompts recur across a fleet of vLLM or SGLang workers.', ['vllm', 'sglang', 'mooncake'], 'https://github.com/LMCache/LMCache'),
  makeTool('mooncake', 'Mooncake', 'distributed cache', 'kv-cache', ['gpu'], 'Distributed KV-cache store and transfer engine for KV-centric disaggregated inference.', 'You need remote KV reuse and high-throughput transport across an inference cluster.', ['lmcache', 'nixl'], 'https://github.com/kvcache-ai/Mooncake'),
  makeTool('nixl', 'NIXL', 'data transfer', 'kv-cache', ['gpu'], 'NVIDIA inference transfer library for moving KV cache and tensors across memory and network domains.', 'Your disaggregated NVIDIA serving path needs a standard high-performance transfer layer.', ['nvidia-dynamo', 'trt-kv-cache'], 'https://github.com/ai-dynamo/nixl'),
  makeTool('vllm-kv-offloading', 'vLLM KV offloading', 'cache tier', 'kv-cache', ['gpu'], 'vLLM connector for offloading completed KV blocks to CPU and optional secondary tiers.', 'GPU KV capacity is constrained but the workload benefits from reuse over recomputation.', ['vllm', 'lmcache'], 'https://docs.vllm.ai/en/latest/features/kv_offloading_usage/'),
  makeTool('dynamo-kv-manager', 'NVIDIA Dynamo KV Cache Manager', 'cache manager', 'kv-cache', ['gpu'], 'KV-aware request routing and cache transfer component for distributed NVIDIA inference.', 'You are disaggregating prefill and decode behind NVIDIA Dynamo.', ['nvidia-dynamo', 'nixl'], 'https://docs.nvidia.com/dynamo/latest/'),
  makeTool('llmd-kv-cache', 'llm-d KV cache', 'cache manager', 'kv-cache', ['gpu'], 'Distributed KV locality indexing, scheduling, and offload libraries for vLLM fleets.', 'You need open, Kubernetes-oriented KV locality awareness across many pods.', ['llmd', 'lmcache'], 'https://github.com/llm-d/llm-d-kv-cache'),

  // 05 · serving engines (8)
  makeTool('vllm', 'vLLM', 'serving engine', 'serving', ['gpu'], 'High-throughput open-source serving engine known for PagedAttention, continuous batching, and an OpenAI-compatible server.', 'You need a flexible production GPU serving engine with a broad ecosystem.', ['pagedattention', 'lmcache', 'xgrammar'], 'https://github.com/vllm-project/vllm'),
  makeTool('sglang', 'SGLang', 'serving engine', 'serving', ['gpu'], 'High-performance serving runtime with RadixAttention, structured generation, and disaggregated inference features.', 'Your workload has heavy prefix reuse, structured output, or advanced serving optimization needs.', ['radixattention', 'hicache', 'xgrammar'], 'https://github.com/sgl-project/sglang'),
  makeTool('tensorrt-llm', 'TensorRT-LLM', 'serving engine', 'serving', ['gpu'], 'NVIDIA-optimized LLM inference toolkit for high-performance GPU deployment.', 'You can specialize for NVIDIA hardware and want maximum engine-level optimization.', ['trt-kv-cache', 'nvidia-dynamo', 'trt-model-optimizer'], 'https://github.com/NVIDIA/TensorRT-LLM'),
  makeTool('triton', 'NVIDIA Triton', 'inference server', 'serving', ['gpu', 'cpu'], 'Multi-framework inference server with model repository, scheduling, metrics, and backend support.', 'You serve varied model modalities or need a general production inference server.', ['tensorrt-llm', 'prometheus'], 'https://github.com/triton-inference-server/server'),
  makeTool('tgi', 'Hugging Face TGI', 'serving engine', 'serving', ['gpu'], 'Hugging Face text-generation server with batching and production operations features.', 'You are maintaining an established Hugging Face deployment and need compatibility context.', ['hf-tokenizers', 'hf-optimum'], 'https://github.com/huggingface/text-generation-inference', 'maintenance'),
  makeTool('deepspeed-fastgen', 'DeepSpeed-FastGen', 'serving engine', 'serving', ['gpu'], 'DeepSpeed inference stack for fast, low-latency transformer generation.', 'Your deployment already relies on DeepSpeed optimizations or compatible model flows.', ['triton', 'awq'], 'https://github.com/microsoft/DeepSpeed'),
  makeTool('lmdeploy', 'LMDeploy', 'serving engine', 'serving', ['gpu'], 'Inference and serving toolkit for efficient deployment of foundation models.', 'You want a serving path with strong support for model compression and deployment tools.', ['turbomind', 'awq'], 'https://github.com/InternLM/lmdeploy'),
  makeTool('aphrodite', 'Aphrodite Engine', 'serving engine', 'serving', ['gpu'], 'OpenAI-compatible inference engine derived from the vLLM ecosystem with broad model support.', 'You need an alternative vLLM-compatible serving engine for supported model families.', ['vllm', 'pagedattention'], 'https://github.com/PygmalionAI/aphrodite-engine'),

  // 06 · runtime and optimization (13; includes local runtimes and quantization)
  makeTool('llama-cpp', 'llama.cpp', 'local runtime', 'runtime', ['gpu', 'cpu'], 'C/C++ inference runtime for local GGUF models across CPUs, Apple Silicon, GPUs, and WebGPU.', 'You need portable, local, low-dependency inference with broad hardware backends.', ['gguf', 'ollama'], 'https://github.com/ggml-org/llama.cpp'),
  makeTool('ollama', 'Ollama', 'local runtime', 'runtime', ['gpu', 'cpu'], 'Developer-friendly local model runtime and API for running open models.', 'You want the simplest local developer experience for model experimentation or workstation serving.', ['llama-cpp', 'gguf'], 'https://github.com/ollama/ollama'),
  makeTool('onnxruntime-genai', 'ONNX Runtime GenAI', 'runtime', 'runtime', ['gpu', 'cpu'], 'Generative-AI extensions for ONNX Runtime across Windows, mobile, CPU, and accelerator targets.', 'You need portable optimized inference in Microsoft or ONNX-centric environments.', ['hf-optimum', 'openvino-genai'], 'https://github.com/microsoft/onnxruntime-genai'),
  makeTool('openvino-genai', 'OpenVINO GenAI', 'runtime', 'runtime', ['gpu', 'cpu'], 'Intel-optimized generative AI pipelines for CPU, GPU, and NPU inference.', 'Your target is Intel hardware, especially PCs, edge systems, or Intel-equipped servers.', ['onnxruntime-genai', 'ipex-llm'], 'https://github.com/openvinotoolkit/openvino.genai'),
  makeTool('ipex-llm', 'IPEX-LLM', 'runtime', 'runtime', ['gpu', 'cpu'], 'Intel extension for performant LLM execution on Intel CPUs and GPUs.', 'Intel hardware is a strategic deployment target and you need local or server inference.', ['openvino-genai', 'llama-cpp'], 'https://github.com/intel/ipex-llm'),
  makeTool('mlx', 'MLX', 'local runtime', 'runtime', ['cpu'], 'Apple Silicon array framework and LLM ecosystem for local Mac inference.', 'You are optimizing local inference for Apple Silicon developers or endpoints.', ['llama-cpp', 'ollama'], 'https://github.com/ml-explore/mlx'),
  makeTool('webllm', 'WebLLM', 'browser runtime', 'runtime', ['cpu'], 'WebGPU-based in-browser LLM inference engine.', 'Privacy, offline availability, or zero-install browser execution is more important than fleet throughput.', ['mlc-llm', 'xgrammar'], 'https://github.com/mlc-ai/web-llm'),
  makeTool('bitsandbytes', 'bitsandbytes', 'quantization', 'runtime', ['gpu', 'cpu'], 'Low-bit quantization and optimizer library used by many transformer workflows.', 'Memory pressure makes 8-bit or 4-bit model execution necessary.', ['awq', 'gptqmodel'], 'https://github.com/bitsandbytes-foundation/bitsandbytes'),
  makeTool('awq', 'AWQ', 'quantization', 'runtime', ['gpu'], 'Activation-aware weight quantization method for reducing LLM memory use.', 'You need low-bit GPU model weights with a calibration-aware quantization path.', ['lmdeploy', 'tensorrt-llm'], 'https://github.com/mit-han-lab/llm-awq'),
  makeTool('gptqmodel', 'GPTQModel', 'quantization', 'runtime', ['gpu', 'cpu'], 'GPTQ model quantization and inference tooling for LLMs.', 'You are evaluating GPTQ-format models or a reproducible quantization workflow.', ['bitsandbytes', 'llama-cpp'], 'https://github.com/ModelCloud/GPTQModel'),
  makeTool('gguf', 'GGUF', 'model format', 'runtime', ['gpu', 'cpu'], 'Portable quantized model format widely used by llama.cpp and local runtimes.', 'You distribute or run local quantized models across diverse hardware.', ['llama-cpp', 'ollama'], 'https://github.com/ggml-org/ggml/blob/master/docs/gguf.md'),
  makeTool('trt-model-optimizer', 'TensorRT Model Optimizer', 'compiler', 'runtime', ['gpu'], 'NVIDIA toolkit for quantizing and optimizing models for TensorRT-LLM deployment.', 'You are preparing NVIDIA-targeted models for TensorRT-LLM performance.', ['tensorrt-llm', 'trt-kv-cache'], 'https://github.com/NVIDIA/TensorRT-Model-Optimizer'),
  makeTool('hf-optimum', 'Hugging Face Optimum', 'optimization toolkit', 'runtime', ['gpu', 'cpu'], 'Hardware-acceleration integrations for Transformers across ONNX Runtime, OpenVINO, and others.', 'You need a Hugging Face-centered bridge to accelerator-specific inference paths.', ['onnxruntime-genai', 'openvino-genai'], 'https://github.com/huggingface/optimum'),

  // 07 · distributed control plane (7)
  makeTool('nvidia-dynamo', 'NVIDIA Dynamo', 'distributed runtime', 'distributed', ['gpu'], 'Distributed inference framework for dynamic GPU scheduling, KV-aware routing, and disaggregated serving.', 'You are scaling NVIDIA-backed prefill/decode fleets with advanced request placement.', ['dynamo-kv-manager', 'nixl', 'tensorrt-llm'], 'https://github.com/ai-dynamo/dynamo'),
  makeTool('llmd', 'llm-d', 'distributed runtime', 'distributed', ['gpu'], 'Kubernetes-native distributed LLM inference stack built around open serving engines and cache-aware scheduling.', 'You need an open control plane for a large vLLM fleet on Kubernetes.', ['llmd-kv-cache', 'kserve'], 'https://github.com/llm-d/llm-d'),
  makeTool('kserve', 'KServe', 'operator', 'distributed', ['gpu', 'cpu'], 'Kubernetes model-serving platform with inference graph and autoscaling capabilities.', 'You need a standardized Kubernetes serving control plane across model types.', ['gateway-inference-extension', 'kubray'], 'https://github.com/kserve/kserve'),
  makeTool('ray-serve-llm', 'Ray Serve LLM', 'distributed runtime', 'distributed', ['gpu', 'cpu'], 'Ray Serve tooling for scalable LLM deployment and workload composition.', 'Your AI platform already uses Ray for distributed execution and service composition.', ['kuberay', 'vllm'], 'https://docs.ray.io/en/latest/serve/llm/'),
  makeTool('kuberay', 'KubeRay', 'operator', 'distributed', ['gpu', 'cpu'], 'Kubernetes operator and tooling for Ray clusters.', 'Ray Serve is your scheduling and serving substrate on Kubernetes.', ['ray-serve-llm', 'kserve'], 'https://github.com/ray-project/kuberay'),
  makeTool('leaderworkerset', 'LeaderWorkerSet', 'operator', 'distributed', ['gpu'], 'Kubernetes API for leader-worker distributed AI workloads.', 'Your distributed model server needs coordinated leader and worker lifecycle management.', ['llmd', 'kserve'], 'https://github.com/kubernetes-sigs/lws'),
  makeTool('gateway-inference-extension', 'Gateway API Inference Extension', 'routing extension', 'distributed', ['gpu', 'cpu'], 'Kubernetes Gateway API extension for inference-aware request routing and endpoint selection.', 'You need portable, Kubernetes-native inference routing in front of model servers.', ['envoy-ai-gateway', 'kserve'], 'https://github.com/kubernetes-sigs/gateway-api-inference-extension'),

  // 08 · managed endpoints (6)
  makeTool('nvidia-nim', 'NVIDIA NIM', 'managed runtime', 'managed', ['gpu'], 'Packaged inference microservices for NVIDIA-accelerated models.', 'You want NVIDIA-optimized model deployment packaged as supported microservices.', ['nvidia-dynamo', 'tensorrt-llm'], 'https://www.nvidia.com/en-us/ai/'),
  makeTool('hf-inference-endpoints', 'Hugging Face Inference Endpoints', 'managed endpoint', 'managed', ['gpu', 'cpu'], 'Managed dedicated endpoints for deployed Hugging Face models.', 'You want managed deployment of an open model with Hugging Face tooling.', ['hf-tokenizers', 'tgi'], 'https://huggingface.co/inference-endpoints'),
  makeTool('aws-bedrock', 'AWS Bedrock', 'managed endpoint', 'managed', ['gpu', 'cpu'], 'Managed foundation-model service and inference API on AWS.', 'Your application and governance model are centered on AWS managed AI services.', ['litellm', 'openrouter'], 'https://aws.amazon.com/bedrock/'),
  makeTool('google-vertex-ai', 'Google Vertex AI', 'managed endpoint', 'managed', ['gpu', 'cpu'], 'Managed AI development and model-serving platform on Google Cloud.', 'Your data, governance, and model workflows are centered on Google Cloud.', ['litellm', 'openrouter'], 'https://cloud.google.com/vertex-ai'),
  makeTool('azure-ai-foundry', 'Azure AI Foundry', 'managed endpoint', 'managed', ['gpu', 'cpu'], 'Azure platform for deploying and governing models and AI applications.', 'Your enterprise model access and controls are centered on Microsoft Azure.', ['litellm', 'onnxruntime-genai'], 'https://azure.microsoft.com/products/ai-foundry'),
  makeTool('oci-generative-ai', 'OCI Generative AI', 'managed endpoint', 'managed', ['gpu', 'cpu'], 'Oracle Cloud managed service for generative-AI inference and model access.', 'Your data, cloud architecture, and governance requirements favor OCI.', ['litellm', 'openrouter'], 'https://www.oracle.com/artificial-intelligence/generative-ai/generative-ai-service/'),

  // 09 · observe and benchmark (7)
  makeTool('opentelemetry', 'OpenTelemetry', 'observability standard', 'observe', ['gpu', 'cpu'], 'Open standard for traces, metrics, and logs across the request path.', 'You need vendor-neutral telemetry correlation across application, gateway, and serving components.', ['prometheus', 'langfuse'], 'https://opentelemetry.io/'),
  makeTool('prometheus', 'Prometheus', 'metrics', 'observe', ['gpu', 'cpu'], 'Metrics collection and querying system commonly exposed by model servers and infrastructure.', 'You need operational metrics such as queue depth, token throughput, and cache hit rates.', ['grafana', 'triton'], 'https://prometheus.io/'),
  makeTool('grafana', 'Grafana', 'observability', 'observe', ['gpu', 'cpu'], 'Visualization and alerting platform for metrics, traces, and logs.', 'You need operator-facing dashboards and alerts across the inference stack.', ['prometheus', 'opentelemetry'], 'https://grafana.com/'),
  makeTool('openlit', 'OpenLIT', 'LLM observability', 'observe', ['gpu', 'cpu'], 'Open-source observability and evaluation toolkit for LLM applications.', 'You want auto-instrumented LLM traces, cost, latency, and quality signals.', ['opentelemetry', 'langfuse'], 'https://github.com/openlit/openlit'),
  makeTool('langfuse', 'Langfuse', 'LLM observability', 'observe', ['gpu', 'cpu'], 'Open-source platform for LLM tracing, prompts, evaluation, and metrics.', 'You need application-level LLM traces alongside prompt and evaluation workflows.', ['opentelemetry', 'phoenix'], 'https://github.com/langfuse/langfuse'),
  makeTool('phoenix', 'Arize Phoenix', 'LLM observability', 'observe', ['gpu', 'cpu'], 'Open-source tracing, evaluation, and observability for LLM applications.', 'You need local or open-source evaluation and trace analysis.', ['opentelemetry', 'langfuse'], 'https://github.com/Arize-ai/phoenix'),
  makeTool('weave', 'Weights & Biases Weave', 'LLM observability', 'observe', ['gpu', 'cpu'], 'LLM tracing, evaluation, and dataset tooling from Weights & Biases.', 'Experiment tracking and systematic evaluation are central to your development process.', ['langfuse', 'phoenix'], 'https://wandb.ai/site/weave'),
];

export const toolById = new Map(tools.map((tool) => [tool.id, tool]));

export function getToolsForLayer(layerId) {
  return tools.filter((tool) => tool.primaryLayer === layerId);
}

export function getTool(id) {
  return toolById.get(id) || null;
}
