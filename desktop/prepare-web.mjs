// Copies the existing web app (unchanged) into desktop/web-dist for the Windows build.
// Only the files the page loads are copied: no tests, docs, workflows or .git.
import {copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = join(root, "desktop", "web-dist");

// Every module the page loads, found by following imports from index.html.
export function webFiles(dir = root) {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const queue = [...html.matchAll(/<script[^>]+src="\.\/([^"]+)"/g)].map(m => m[1]);
  const seen = new Set(["index.html"]);
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(join(dir, file), "utf8");
    for (const m of src.matchAll(/from\s+["']\.\/([^"']+)["']/g)) queue.push(m[1]);
  }
  return [...seen].sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  rmSync(OUT, {recursive: true, force: true});
  mkdirSync(OUT, {recursive: true});
  const files = webFiles();
  for (const f of files) copyFileSync(join(root, f), join(OUT, f));
  console.log("web-dist: " + files.join(", "));
  if (readdirSync(OUT).length !== files.length) throw Error("web-dist copy incomplete");
}
