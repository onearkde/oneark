// Fetches the top 10 headlines from GNews and writes _site/news.json.
// The API key stays in GitHub Secrets and never reaches the browser.
import { writeFileSync, mkdirSync } from "node:fs";

const key = process.env.GNEWS_API_KEY;
if (!key) { console.error("Missing GNEWS_API_KEY"); process.exit(1); }

const url = new URL("https://gnews.io/api/v4/top-headlines");
url.search = new URLSearchParams({ category: "general", lang: "en", max: "10", apikey: key });

const res = await fetch(url);
if (!res.ok) { console.error("GNews error", res.status, await res.text()); process.exit(1); }

const data = await res.json();
const articles = (data.articles || []).map(a => ({
  title: a.title, url: a.url, source: a.source?.name || "News", publishedAt: a.publishedAt
}));
if (!articles.length) { console.error("No articles returned"); process.exit(1); }

mkdirSync("_site", { recursive: true });
writeFileSync("_site/news.json", JSON.stringify({ updated: new Date().toISOString(), articles }, null, 2));
console.log(`Saved ${articles.length} headlines`);
