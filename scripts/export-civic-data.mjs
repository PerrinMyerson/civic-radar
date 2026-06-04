import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...valueParts] = arg.split("=");
    return [key, valueParts.join("=")];
  }),
);

const url = args.get("--url") ?? "http://127.0.0.1:3000/api/civic";
const out = resolve(args.get("--out") ?? "gh-pages-dist/civic-data.json");

async function fetchWithRetry() {
  let lastError;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 1500));
    }
  }

  throw lastError;
}

const data = await fetchWithRetry();
await mkdir(dirname(out), { recursive: true });
await writeFile(out, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${out}`);
