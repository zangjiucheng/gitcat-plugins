#!/usr/bin/env node
// Builds the root index.json from official/*/plugin.json + community/*.json.
//
// Dependency-free on purpose (no ajv/zod) — this repo is small and the
// validation rules are simple enough to hand-roll, matching the "small
// hand-rolled tool over a library" philosophy the schema itself documents.
//
// Usage: node scripts/build-index.mjs [--check]
//   --check   exit 1 without writing index.json if it would change (CI use).

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// TODO: update once the GitHub repo exists — used to build raw-content URLs
// for OFFICIAL entries (whose plugin.json lives IN this repo). Community
// entries never need this: their own `repo` field is already a full URL.
const REPO = "OWNER/gitcat-plugins";
const DEFAULT_BRANCH = "main";

const CHECK_ONLY = process.argv.includes("--check");

function rawUrl(relPath) {
  return `https://raw.githubusercontent.com/${REPO}/${DEFAULT_BRANCH}/${relPath}`;
}

function fail(msg) {
  console.error(`build-index: ${msg}`);
  process.exitCode = 1;
}

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

/** One entry per official/<dir>/plugin.json — the manifest lives in THIS repo. */
function collectOfficial() {
  const dir = join(ROOT, "official");
  if (!existsSync(dir)) return [];
  const entries = [];
  for (const name of readdirSync(dir)) {
    const manifestPath = join(dir, name, "plugin.json");
    if (!existsSync(manifestPath)) continue; // a folder with no manifest isn't a plugin
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (e) {
      fail(`official/${name}/plugin.json is not valid JSON: ${e.message}`);
      continue;
    }
    if (!ID_RE.test(manifest.id ?? "")) {
      fail(`official/${name}/plugin.json has an invalid or missing "id": ${JSON.stringify(manifest.id)}`);
      continue;
    }
    if (manifest.id !== name) {
      fail(`official/${name}/plugin.json's id (${JSON.stringify(manifest.id)}) must match its folder name`);
      continue;
    }
    entries.push({
      kind: "official",
      id: manifest.id,
      name: manifest.name,
      description: manifest.description ?? "",
      author: "GitCat",
      minGitcatVersion: manifest.minGitcatVersion ?? null,
      tags: [],
      manifestUrl: rawUrl(`official/${name}/plugin.json`),
      repoPath: `official/${name}`,
    });
  }
  return entries;
}

/** One entry per community/<id>.json — a pointer into someone ELSE's repo. */
function collectCommunity() {
  const dir = join(ROOT, "community");
  if (!existsSync(dir)) return [];
  const entries = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const full = join(dir, file);
    let entry;
    try {
      entry = JSON.parse(readFileSync(full, "utf8"));
    } catch (e) {
      fail(`community/${file} is not valid JSON: ${e.message}`);
      continue;
    }
    const required = ["id", "name", "description", "author", "repo", "manifestPath"];
    const missing = required.filter((k) => typeof entry[k] !== "string" || entry[k].length === 0);
    if (missing.length) {
      fail(`community/${file} is missing required field(s): ${missing.join(", ")}`);
      continue;
    }
    if (!ID_RE.test(entry.id)) {
      fail(`community/${file} has an invalid "id": ${JSON.stringify(entry.id)}`);
      continue;
    }
    if (`${entry.id}.json` !== file) {
      fail(`community/${file}'s id (${JSON.stringify(entry.id)}) must match its filename`);
      continue;
    }
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(entry.repo)) {
      fail(`community/${file}'s "repo" must be a bare https://github.com/<owner>/<repo> URL, got ${JSON.stringify(entry.repo)}`);
      continue;
    }
    if (entry.manifestPath.startsWith("/") || entry.manifestPath.includes("..")) {
      fail(`community/${file}'s "manifestPath" must be a relative path with no leading "/" or "..": ${JSON.stringify(entry.manifestPath)}`);
      continue;
    }
    entries.push({
      kind: "community",
      id: entry.id,
      name: entry.name,
      description: entry.description,
      author: entry.author,
      minGitcatVersion: entry.minGitcatVersion ?? null,
      tags: entry.tags ?? [],
      repo: entry.repo,
      manifestPath: entry.manifestPath,
      homepage: entry.homepage ?? null,
    });
  }
  return entries;
}

const official = collectOfficial();
const community = collectCommunity();
const all = [...official, ...community].sort((a, b) => a.id.localeCompare(b.id));

const seen = new Set();
for (const e of all) {
  if (seen.has(e.id)) fail(`duplicate plugin id across the index: ${JSON.stringify(e.id)}`);
  seen.add(e.id);
}

if (process.exitCode === 1) {
  console.error(`build-index: ${all.length} entries scanned, aborting due to the error(s) above.`);
  process.exit(1);
}

const index = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  count: all.length,
  plugins: all,
};

const outPath = join(ROOT, "index.json");
const rendered = JSON.stringify(index, null, 2) + "\n";

if (CHECK_ONLY) {
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8") : null;
  // Ignore generatedAt when comparing — otherwise --check would always fail.
  const strip = (s) => (s ?? "").replace(/"generatedAt": ".*?"/, '"generatedAt": ""');
  if (strip(current) !== strip(rendered)) {
    fail("index.json is out of date — run `node scripts/build-index.mjs` and commit the result.");
    process.exit(1);
  }
  console.log(`build-index --check: index.json is up to date (${all.length} plugins).`);
} else {
  writeFileSync(outPath, rendered);
  console.log(`build-index: wrote index.json with ${all.length} plugins (${official.length} official, ${community.length} community).`);
}
