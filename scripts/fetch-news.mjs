// Fetches the top 10 headlines from GNews and writes _site/news.json.
// The API key stays in GitHub Secrets and never reaches the browser.
import { writeFileSync, mkdirSync } from "node:fs";

const fail = (msg) => {
  // ::error:: makes the reason show up in the run's Annotations panel
  console.log(`::error title=News fetch failed::${msg}`);
  process.exit(1);
};

const key = (process.env.GNEWS_API_KEY || "").trim();
if (!key) fail("Secret GNEWS_API_KEY is empty or missing. Add it under Settings > Secrets and variables > Actions.");

const url = new URL("https://gnews.io/api/v4/top-headlines");
url.search = new URLSearchParams({ category: "general", lang: "en", max: "10", apikey: key });

let res;
try { res = await fetch(url); } catch (e) { fail("Network error: " + e.message); }

const body = await res.text();
if (!res.ok) fail(`GNews returned HTTP ${res.status}: ${body.slice(0, 300).replace(/\s+/g, " ")}`);

let data;
try { data = JSON.parse(body); } catch { fail("GNews returned invalid JSON."); }

const articles = (data.articles || []).map(a => ({
  title: a.title, url: a.url, source: a.source?.name || "News", publishedAt: a.publishedAt
}));
if (!articles.length) fail("GNews returned 0 articles.");

mkdirSync("_site", { recursive: true });
writeFileSync("_site/news.json", JSON.stringify({ updated: new Date().toISOString(), articles }, null, 2));
console.log(`Saved ${articles.length} headlines`);
