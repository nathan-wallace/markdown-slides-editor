function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isLocalLike(locationLike) {
  const hostname = locationLike?.hostname || "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function defaultLocalCaptionSource(locationLike) {
  if (!locationLike?.href || !isLocalLike(locationLike)) return "";
  return new URL("./whisper-demo/transcript.json", locationLike.href).toString();
}

export function getCaptionConfig(metadata = {}, locationLike = globalThis.location) {
  if (metadata.captions === false || metadata.captionsEnabled === false) {
    return {
      enabled: false,
      source: "",
      provider: "none",
      pollMs: 1500,
    };
  }

  const explicitSource = String(
    metadata.captionsSource || metadata.transcriptSource || metadata.captionsUrl || "",
  ).trim();
  const source = explicitSource || defaultLocalCaptionSource(locationLike);

  return {
    enabled: Boolean(source),
    source,
    provider: String(metadata.captionsProvider || metadata.transcriptProvider || "auto").trim() || "auto",
    pollMs: toNumber(metadata.captionsPollMs || metadata.transcriptPollMs, 1500),
  };
}

export function parseCaptionPayload(value) {
  if (value == null) {
    return {
      available: false,
      active: false,
      text: "",
      generated: "",
    };
  }

  let payload = value;
  if (typeof value === "string") {
    try {
      payload = JSON.parse(value);
    } catch {
      payload = { text: value };
    }
  }

  if (typeof payload === "string") {
    payload = { text: payload };
  }

  const text = typeof payload?.text === "string" ? payload.text.trim() : "";
  const generated = typeof payload?.generated === "string" ? payload.generated : "";
  const active = payload?.active !== false;

  return {
    available: true,
    active,
    text,
    generated,
  };
}

export async function fetchCaptionState(config, fetchImpl = globalThis.fetch) {
  if (!config?.enabled || !config.source || typeof fetchImpl !== "function") {
    return {
      enabled: false,
      available: false,
      active: false,
      text: "",
      generated: "",
      provider: config?.provider || "none",
      source: config?.source || "",
    };
  }

  try {
    const response = await fetchImpl(config.source, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = parseCaptionPayload(await response.text());
    return {
      enabled: true,
      ...payload,
      provider: config.provider,
      source: config.source,
    };
  } catch {
    return {
      enabled: true,
      available: false,
      active: false,
      text: "",
      generated: "",
      provider: config.provider,
      source: config.source,
    };
  }
}

export function createCaptionMonitor(config, onUpdate, fetchImpl = globalThis.fetch) {
  let timerId = null;
  let running = false;
  let currentConfig = config;

  async function tick() {
    const state = await fetchCaptionState(currentConfig, fetchImpl);
    onUpdate(state);
  }

  return {
    start() {
      if (running || !currentConfig?.enabled) return;
      running = true;
      tick();
      timerId = window.setInterval(tick, currentConfig.pollMs);
    },
    stop() {
      running = false;
      if (timerId) {
        window.clearInterval(timerId);
        timerId = null;
      }
    },
    update(nextConfig) {
      const changed =
        nextConfig?.source !== currentConfig?.source ||
        nextConfig?.pollMs !== currentConfig?.pollMs ||
        nextConfig?.enabled !== currentConfig?.enabled;
      currentConfig = nextConfig;
      if (!changed) return;
      this.stop();
      if (currentConfig?.enabled) {
        this.start();
      }
    },
  };
}
