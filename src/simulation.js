const GiB = 1024 ** 3;

export function planCapacity({
  arrival = 12,
  goodput = 5,
  replicas = 2,
  startup = 60,
} = {}) {
  const minimum = Math.ceil(arrival / goodput);
  return {
    minimum,
    nPlusOne: minimum + 1,
    backlog: Math.max(0, arrival - replicas * goodput) * startup,
  };
}
export function chooseReplica(
  replicas,
  policy = "balanced",
  prefixTokens = 1000,
) {
  const eligible = replicas.filter((replica) => replica.compatible);
  const ranked = eligible
    .map((replica) => ({
      ...replica,
      estimate:
        replica.queue + Math.max(0, prefixTokens - replica.cached) * 0.5,
    }))
    .sort((a, b) =>
      policy === "cache"
        ? b.cached - a.cached || a.queue - b.queue
        : policy === "queue"
          ? a.queue - b.queue
          : a.estimate - b.estimate,
    );
  return { ranked, chosen: ranked[0] || null };
}
export function sloGoodput(traces, ttftLimit, intervalLimit, durationSeconds) {
  const passed = traces.filter(
    (trace) =>
      trace.success &&
      trace.ttft <= ttftLimit &&
      trace.interval <= intervalLimit,
  );
  return {
    passed: passed.length,
    completed: traces.filter((trace) => trace.success).length,
    goodput: passed.length / durationSeconds,
  };
}
export function desiredReplicas(active, target, minimum = 1) {
  return Math.max(minimum, Math.ceil(active / target));
}
export function eligibleModels(models, requirements) {
  return models.filter((model) =>
    Object.entries(requirements).every(
      ([key, required]) => !required || model[key],
    ),
  );
}

// A raw full-attention estimate, not a hardware performance prediction.
export function estimateMemory({
  parameters = 8,
  weightBits = 16,
  layers = 32,
  kvHeads = 8,
  headDim = 128,
  tokens = 4096,
  sequences = 1,
  kvBits = 16,
  headroom = 2,
  capacity = 24,
} = {}) {
  const weights = (parameters * 1e9 * weightBits) / 8 / GiB;
  const kv =
    (2 * layers * kvHeads * headDim * tokens * sequences * (kvBits / 8)) / GiB;
  const total = weights + kv + headroom;
  return {
    weights,
    kv,
    headroom,
    total,
    free: capacity - total,
    fits: total <= capacity,
  };
}

export function reusablePrefix(cached, incoming, blockSize = 4) {
  let matched = 0;
  while (
    matched < cached.length &&
    matched < incoming.length &&
    cached[matched] === incoming[matched]
  )
    matched++;
  return { matched, reused: Math.floor(matched / blockSize) * blockSize };
}

export function requestTiming({
  queue = 200,
  prefill = 400,
  interval = 40,
  output = 16,
  network = 50,
} = {}) {
  const ttft = queue + prefill + network;
  return {
    ttft,
    decode: Math.max(0, output - 1) * interval,
    total: ttft + Math.max(0, output - 1) * interval,
  };
}

// The batching demonstration omits prefill and memory admission constraints.
export function batchSchedule(continuous = true) {
  const requests = [
    { id: "A", length: 3 },
    { id: "B", length: 7 },
    { id: "C", length: 2 },
    { id: "D", length: 4 },
  ];
  const slots = [null, null];
  let next = 0;
  const frames = [];
  while (next < requests.length || slots.some(Boolean)) {
    const mayAdmit = continuous || slots.every((slot) => !slot);
    if (mayAdmit)
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i] && next < requests.length)
          slots[i] = { ...requests[next++], done: 0 };
      }
    frames.push(
      slots.map((slot) => (slot ? { ...slot, done: slot.done + 1 } : null)),
    );
    for (let i = 0; i < slots.length; i++) {
      if (slots[i]) slots[i].done++;
      if (slots[i]?.done >= slots[i]?.length) slots[i] = null;
    }
  }
  return frames;
}
