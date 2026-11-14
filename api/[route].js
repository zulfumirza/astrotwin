// src/engine/delay.ts
function formatDelay(sec) {
  if (sec < 1) return `${(sec * 1e3).toFixed(1)} ms`;
  if (sec < 60) return `${sec.toFixed(2)} s`;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

// src/engine/sbar.ts
var SBAR_KEYS = [
  "situation",
  "background",
  "assessment",
  "recommendation",
  "crewMessage"
];
function isValidSbar(x) {
  if (!x || typeof x !== "object") return false;
  const o = x;
  return SBAR_KEYS.every(
    (k) => typeof o[k] === "string" && o[k].trim().length > 0 && o[k].length <= 1600
  );
}
function numbersAreGrounded(sbar, payload) {
  const norm = (s) => s.replace(",", ".").replace(/\.0+$/, "");
  const tokens = (s) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map(norm);
  const allowed = new Set(tokens(JSON.stringify(payload) + " " + formatDelay(payload.delaySec)));
  for (const n of ["1", "2", "3", "14", "100"]) allowed.add(n);
  return SBAR_KEYS.every((k) => tokens(sbar[k]).every((t) => allowed.has(t)));
}

// server/handlers.ts
var cache = /* @__PURE__ */ new Map();
async function cached(key, ttlMs, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return { value: hit.value, cachedAt: hit.at, hit: true };
  try {
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return { value, cachedAt: Date.now(), hit: false };
  } catch (err) {
    if (hit) return { value: hit.value, cachedAt: hit.at, hit: true };
    throw err;
  }
}
async function fetchWithTimeout(url, init = {}, timeoutMs = 1e4) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}
var getJson = async (url, timeoutMs) => (await fetchWithTimeout(url, {}, timeoutMs)).json();
var isoDate = (d) => d.toISOString().slice(0, 10);
var MIN = 6e4;
var HOUR = 60 * MIN;
async function donki(range) {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  const gle = range === "gle74";
  const start = gle ? "2024-05-10" : isoDate(new Date(Date.now() - 30 * 24 * HOUR));
  const end = gle ? "2024-05-12" : isoDate(/* @__PURE__ */ new Date());
  const url = (kind, extra = "") => `https://api.nasa.gov/DONKI/${kind}?startDate=${start}&endDate=${end}${extra}&api_key=${key}`;
  const { value, cachedAt, hit } = await cached(`donki:${range}:${start}:${end}`, gle ? 24 * HOUR : 30 * MIN, async () => {
    const [sep, flr, cme, notes] = await Promise.allSettled([
      getJson(url("SEP")),
      getJson(url("FLR")),
      getJson(url("CME")),
      gle ? Promise.resolve([]) : getJson(url("notifications", "&type=all"))
    ]);
    if ([sep, flr, cme].every((r) => r.status === "rejected")) throw new Error("DONKI unreachable");
    const list = (r) => r.status === "fulfilled" && Array.isArray(r.value) ? r.value : [];
    const events = [
      ...list(sep).map((e) => ({
        id: String(e.sepID),
        type: "SEP",
        time: toIso(e.eventTime),
        title: `SEP \u2014 ${(e.instruments ?? []).map((i) => i.displayName).join(", ") || "energetic particles"}`,
        link: e.link
      })),
      ...list(flr).map((e) => ({
        id: String(e.flrID),
        type: "FLR",
        time: toIso(e.peakTime ?? e.beginTime),
        title: `${e.classType ?? ""} flare${e.activeRegionNum ? ` (AR ${e.activeRegionNum})` : ""}`.trim(),
        link: e.link
      })),
      ...list(cme).map((e) => ({
        id: String(e.activityID),
        type: "CME",
        time: toIso(e.startTime),
        title: `CME${e.sourceLocation ? ` from ${e.sourceLocation}` : ""}`,
        link: e.link
      })),
      ...list(notes).slice(-15).map((e) => ({
        id: String(e.messageID),
        type: "NOTE",
        time: toIso(e.messageIssueTime),
        title: `Notification: ${e.messageType}`,
        link: e.messageURL
      }))
    ].filter((e) => e.time).sort((a, b) => b.time.localeCompare(a.time));
    const failed = [["SEP", sep], ["FLR", flr], ["CME", cme]].filter(([, r]) => r.status === "rejected").map(([k]) => k);
    return { events, partial: failed };
  });
  return { status: 200, body: { ...value, start, end, fetchedAt: cachedAt, serverCache: hit } };
}
var toIso = (t) => {
  if (!t) return "";
  const d = new Date(/Z$/.test(t) && t.length === 17 ? t.replace("Z", ":00Z") : t);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};
async function swpc() {
  const { value, cachedAt, hit } = await cached("swpc", 5 * MIN, async () => {
    const rows = await getJson("https://services.swpc.noaa.gov/json/goes/primary/integral-protons-6-hour.json");
    if (!Array.isArray(rows)) throw new Error("Unexpected SWPC format");
    const byTime = /* @__PURE__ */ new Map();
    for (const r of rows) {
      if (typeof r?.time_tag !== "string" || typeof r?.flux !== "number") continue;
      const p = byTime.get(r.time_tag) ?? { time: r.time_tag, p10: 0, p100: 0 };
      if (r.energy === ">=10 MeV") p.p10 = r.flux;
      else if (r.energy === ">=100 MeV") p.p100 = r.flux;
      else continue;
      byTime.set(r.time_tag, p);
    }
    const points = [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
    if (points.length === 0) throw new Error("No proton data");
    return { points, satellite: rows[0]?.satellite ?? null };
  });
  return { status: 200, body: { ...value, fetchedAt: cachedAt, serverCache: hit } };
}
async function horizons() {
  const today = isoDate(/* @__PURE__ */ new Date());
  const tomorrow = isoDate(new Date(Date.now() + 24 * HOUR));
  const { value, cachedAt, hit } = await cached(`horizons:${today}`, 24 * HOUR, async () => {
    const q = new URLSearchParams({
      format: "json",
      COMMAND: "'499'",
      // Mars
      OBJ_DATA: "'NO'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'500@399'",
      // geocenter
      START_TIME: `'${today}'`,
      STOP_TIME: `'${tomorrow}'`,
      STEP_SIZE: "'1 d'",
      QUANTITIES: "'20'",
      // observer range & range-rate
      CSV_FORMAT: "'YES'"
    });
    const data = await getJson(`https://ssd.jpl.nasa.gov/api/horizons.api?${q}`, 15e3);
    const text = data?.result ?? "";
    const block = text.split("$$SOE")[1]?.split("$$EOE")[0];
    const au = Number(block?.trim().split("\n")[0]?.split(",")[3]);
    if (!Number.isFinite(au) || au <= 0) throw new Error("Could not parse Horizons range");
    return { au, date: today };
  });
  return { status: 200, body: { ...value, fetchedAt: cachedAt, serverCache: hit } };
}
var SYSTEM_INSTRUCTION = `You are the narrator for AstroTwin, an onboard astronaut health monitor.
You receive a JSON object with findings that were ALREADY computed by a deterministic rule engine.
Rules you must follow:
- Rely ONLY on the findings and values in the input. Do not invent diagnoses, causes, findings or data.
- Never change, round, add or estimate numbers. Reuse numbers exactly as given. Do not change the tier, levels or scores.
- Frame every piece of medical advice as an "onboard protocol recommendation", not as a diagnosis or prescription.
- Write in the language given by "lang" ("en" = English, "tr" = Turkish).
- Be brief: each field at most 3 short sentences.
- situation/background/assessment/recommendation form an SBAR report for Mission Control.
- crewMessage speaks directly and calmly to the astronaut: what happened, why it matters, what to do.
- If "withheld" is greater than 0, state that behavioural details were withheld by crew privacy choice; do not guess them.
Return only JSON with the keys situation, background, assessment, recommendation, crewMessage.`;
function looksLikePayload(p) {
  return p && typeof p === "object" && (p.lang === "en" || p.lang === "tr") && typeof p.crew === "string" && typeof p.tier === "string" && Array.isArray(p.findings) && Array.isArray(p.hazards) && JSON.stringify(p).length < 2e4;
}
var modelCooldown = /* @__PURE__ */ new Map();
async function narrate(body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return { status: 503, body: { error: "narrator-not-configured" } };
  const payload = body?.payload;
  if (!looksLikePayload(payload)) return { status: 400, body: { error: "invalid-payload" } };
  const models = [
    .../* @__PURE__ */ new Set([
      process.env.GEMINI_MODEL || "gemini-flash-latest",
      process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest"
    ])
  ];
  const str = { type: "STRING" };
  const callModel = async (model) => {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: { situation: str, background: str, assessment: str, recommendation: str, crewMessage: str },
              required: ["situation", "background", "assessment", "recommendation", "crewMessage"]
            }
          }
        })
      },
      8e3
    );
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    let sbar;
    try {
      sbar = JSON.parse(text);
    } catch {
      throw new Error("narrator-invalid-json");
    }
    if (!isValidSbar(sbar)) throw new Error("narrator-schema-rejected");
    if (!numbersAreGrounded(sbar, payload)) throw new Error("narrator-numbers-rejected");
    return { sbar, model };
  };
  const { value, cachedAt, hit } = await cached(`narrate:${models.join(",")}:${JSON.stringify(payload)}`, 10 * MIN, async () => {
    let lastError = new Error("narrator-unavailable");
    for (const model of models) {
      if ((modelCooldown.get(model) ?? 0) > Date.now() && model !== models[models.length - 1]) continue;
      try {
        return await callModel(model);
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : "";
        if (!msg.startsWith("narrator-")) modelCooldown.set(model, Date.now() + 2 * MIN);
      }
    }
    throw lastError;
  });
  return { status: 200, body: { ...value, fetchedAt: cachedAt, serverCache: hit } };
}
async function handleApi(route, query, body) {
  try {
    switch (route) {
      case "donki":
        return await donki(query.range === "gle74" ? "gle74" : "recent");
      case "swpc":
        return await swpc();
      case "horizons":
        return await horizons();
      case "narrate":
        return await narrate(body);
      case "health":
        return { status: 200, body: { ok: true, narrator: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") } };
      default:
        return { status: 404, body: { error: "unknown-route" } };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message.replace(/api_key=[^&\s]+/g, "api_key=***") : "error";
    return { status: 502, body: { error: "upstream-failed", message } };
  }
}

// server/vercel.ts
async function handler(req, res) {
  const route = String(req.query?.route ?? "");
  const query = {};
  for (const [k, v] of Object.entries(req.query ?? {})) {
    if (k !== "route" && typeof v === "string") query[k] = v;
  }
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = void 0;
    }
  }
  const result = await handleApi(route, query, body);
  res.setHeader("cache-control", "no-store");
  res.status(result.status).json(result.body);
}
export {
  handler as default
};
