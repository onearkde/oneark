// Fetches top headlines per topic from GNews and writes _site/news.json.
// The API key stays in GitHub Secrets and never reaches the browser.
import { writeFileSync, mkdirSync } from "node:fs";

const fail = (msg) => {
  console.log(`::error title=News fetch failed::${msg}`);
  process.exit(1);
};
const warn = (msg) => console.log(`::warning title=News topic skipped::${msg}`);

const key = (process.env.GNEWS_API_KEY || "").trim();
if (!key) fail("Secret GNEWS_API_KEY is empty or missing. Add it under Settings > Secrets and variables > Actions.");

// GNews has no "politics" or "economy" category: politics uses keyword search,
// economy maps to the "business" category.
const topics = {
  top:        { path: "top-headlines", params: { category: "general" } },
  politics:   { path: "search",        params: { q: "politics OR election OR government", in: "title" } },
  economy:    { path: "top-headlines", params: { category: "business" } },
  technology: { path: "top-headlines", params: { category: "technology" } },
  science:    { path: "top-headlines", params: { category: "science" } },
  health:     { path: "top-headlines", params: { category: "health" } },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const categories = {};
let ok = 0;

for (const [name, t] of Object.entries(topics)) {
  const url = new URL(`https://gnews.io/api/v4/${t.path}`);
  url.search = new URLSearchParams({ lang: "en", max: "10", ...t.params, apikey: key });
  try {
    const res = await fetch(url);
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 200).replace(/\s+/g, " ")}`);
    const data = JSON.parse(body);
    categories[name] = (data.articles || []).map((a) => ({
      title: a.title, url: a.url, source: a.source?.name || "News", publishedAt: a.publishedAt,
    }));
    if (categories[name].length) ok++;
    console.log(`${name}: ${categories[name].length} headlines`);
  } catch (e) {
    categories[name] = [];
    warn(`${name}: ${e.message}`);
  }
  await sleep(1200); // stay under GNews' per-second rate limit
}

if (!ok) fail("No topic returned any articles.");

mkdirSync("_site", { recursive: true });
writeFileSync("_site/news.json", JSON.stringify({ updated: new Date().toISOString(), categories }, null, 2));
