export const MODES = new Set(["gpu", "cpu"]);

export function readState(search = window.location.search) {
  const params = new URLSearchParams(search);
  const mode = MODES.has(params.get("mode")) ? params.get("mode") : "gpu";
  return {
    mode,
    toolId: params.get("tool") || null,
    layerId: params.get("layer") || null,
    memoryId: params.get("memory") || null,
  };
}

export function writeState(state, base = window.location.href) {
  const url = new URL(base);
  url.searchParams.set("mode", state.mode);
  if (state.toolId) url.searchParams.set("tool", state.toolId);
  else url.searchParams.delete("tool");
  if (state.layerId) url.searchParams.set("layer", state.layerId);
  else url.searchParams.delete("layer");
  if (state.memoryId) url.searchParams.set("memory", state.memoryId);
  else url.searchParams.delete("memory");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function isCompatible(tool, mode) {
  return tool.supportedHardware.includes(mode);
}

export function visibleToolState(tool, mode) {
  return isCompatible(tool, mode) ? "active" : "muted";
}

// In-page anchor history should preserve the current lab and open chapters.
// Ignore inactive-view fields that are not part of the displayed page.
export function sameContentPage(a, b) {
  if (a.view !== b.view) return false;
  const keys =
    a.view === "learn"
      ? ["lessonId"]
      : a.view === "articles"
        ? ["articleId", "articleLevel"]
        : ["mode", "layerId", "toolId", "memoryId"];
  return keys.every((key) => a[key] === b[key]);
}
