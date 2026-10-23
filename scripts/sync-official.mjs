#!/usr/bin/env node
// Copies the plugins listed in official.sync.json from a GitCat checkout's
// examples/plugins/<id>/ into official/<id>/.
//
// GitCat's own repo is the source of truth for these plugins. There they ship
// in the same commit as the validator that checks them (its
// shipped-examples smoke test runs every example through the real manifest
// validator), which this repo cannot do. So official/<id>/ for a synced plugin
// is generated output: change it in GitCat, then re-sync.
//
// What a sync does to each listed plugin:
//   * replaces official/<id>/ with an exact copy of examples/plugins/<id>/;
//   * sets plugin.json's "minGitcatVersion" to the per-plugin override, or by
//     default to the GitCat release the copy came from, since that release's
//     own smoke test validated it. The edit touches that one line, nothing else;
//   * rewrites README links that escape the plugin folder, which break once
//     the folder lives here:
//       ../../docs/<page>.md#a  ->  <docsSite>/<page>#a   (the published docs)
//       anything else outside  ->  https://github.com/<repo>/blob/<ref>/<path>
//     Links that stay inside the plugin folder are left relative.
//   * records the ref in official.sync.json's "lastSyncedRef".
//
// Usage: node scripts/sync-official.mjs --from <gitcat-checkout> --ref <tag>
//   --ref must be a release tag (vX.Y.Z): the default floor is derived from it.
// Then run `node scripts/build-index.mjs` to regenerate index.json.

import { readFileSync, writeFileSync, existsSync, rmSync, cpSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, posix, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = join(ROOT, "official.sync.json");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}
function die(msg) {
  console.error(`sync-official: ${msg}`);
  process.exit(1);
}

const from = arg("--from");
const ref = arg("--ref");
if (!from || !ref) die("usage: node scripts/sync-official.mjs --from <gitcat-checkout> --ref <vX.Y.Z>");
const tag = /^v(\d+\.\d+\.\d+)$/.exec(ref);
if (!tag) die(`--ref must be a release tag like v1.4.1 (the default minGitcatVersion comes from it), got ${JSON.stringify(ref)}`);
const releaseVersion = tag[1];

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const { repo, path: srcPath, docsSite } = config.source;
const fromRoot = resolve(from);
const srcRoot = resolve(fromRoot, srcPath);
if (!existsSync(srcRoot)) die(`${srcRoot} does not exist. Is --from a GitCat checkout?`);

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const VERSION_RE = /^\d+\.\d+\.\d+$/;

/** Set (or add) "minGitcatVersion" by editing one line, keeping the file's own formatting. */
function setFloor(manifestPath, floor) {
  const text = readFileSync(manifestPath, "utf8");
  const json = JSON.parse(text);
  let out;
  if ("minGitcatVersion" in json) {
    out = text.replace(/("minGitcatVersion"\s*:\s*)"[^"]*"/, `$1"${floor}"`);
  } else {
    // Insert right after the top-level `"version": "…",` line, at its
    // indentation. "version" is never a manifest's last key, so it always
    // carries a trailing comma.
    const m = /^([ \t]*)"version"\s*:\s*"[^"]*",[ \t]*$/m.exec(text);
    if (!m) die(`${manifestPath}: no top-level \`"version": "…",\` line to anchor minGitcatVersion after`);
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    out = text.replace(m[0], `${m[0]}${eol}${m[1]}"minGitcatVersion": "${floor}",`);
  }
  if (JSON.parse(out).minGitcatVersion !== floor) die(`${manifestPath}: failed to set minGitcatVersion`);
  writeFileSync(manifestPath, out);
}

/**
 * Rewrite markdown links that leave the plugin folder (see header).
 * `pluginDirInSrc` is the folder's repo-relative path in GitCat
 * (`examples/plugins/<id>`); `mdDirInPlugin` is the markdown file's directory
 * relative to the plugin folder (`.` for its top-level README).
 */
function fixLinks(mdPath, pluginDirInSrc, mdDirInPlugin) {
  const text = readFileSync(mdPath, "utf8");
  const out = text.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target.startsWith("/")) return whole;
    const [p, hash = ""] = target.split("#");
    const resolved = posix.normalize(posix.join(pluginDirInSrc, mdDirInPlugin, p));
    if (resolved === pluginDirInSrc || resolved.startsWith(pluginDirInSrc + "/")) return whole; // stays inside the plugin
    // An outward link is rewritten to an absolute URL, so it must point at
    // something real at this ref. Publishing a link that's already broken in
    // GitCat would just move the breakage here.
    if (resolved.startsWith("..") || !existsSync(join(fromRoot, resolved))) {
      die(`${mdPath}: link ${JSON.stringify(target)} resolves to ${resolved}, which doesn't exist in ${repo}@${ref}. Fix the link in GitCat first.`);
    }
    const anchor = hash ? `#${hash}` : "";
    const docs = /^docs\/(.+?)(?:index)?\.md$/.exec(resolved);
    if (docs) return `](${docsSite}/${docs[1].replace(/\/$/, "")}${anchor})`;
    return `](https://github.com/${repo}/blob/${ref}/${resolved}${anchor})`;
  });
  if (out !== text) writeFileSync(mdPath, out);
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const f = join(dir, n);
    return statSync(f).isDirectory() ? walk(f) : [f];
  });
}

// All or nothing: every plugin is built in a staging dir first and only swapped
// into official/ once all of them succeed, so a failure (a broken link, a
// missing plugin) never leaves official/ half-synced.
const STAGE = join(ROOT, ".sync-staging");
rmSync(STAGE, { recursive: true, force: true });
process.on("exit", () => rmSync(STAGE, { recursive: true, force: true }));

const synced = [];
for (const [id, opts] of Object.entries(config.plugins)) {
  if (!ID_RE.test(id)) die(`official.sync.json: invalid plugin id ${JSON.stringify(id)}`);
  const src = join(srcRoot, id);
  if (!existsSync(join(src, "plugin.json"))) die(`${id}: ${srcPath}/${id}/plugin.json does not exist at ${ref}`);
  const manifest = JSON.parse(readFileSync(join(src, "plugin.json"), "utf8"));
  if (manifest.id !== id) die(`${id}: its plugin.json id is ${JSON.stringify(manifest.id)}`);
  const floor = opts.minGitcatVersion ?? releaseVersion;
  if (!VERSION_RE.test(floor)) die(`${id}: minGitcatVersion override ${JSON.stringify(floor)} is not X.Y.Z`);

  const staged = join(STAGE, id);
  cpSync(src, staged, { recursive: true });
  setFloor(join(staged, "plugin.json"), floor);
  for (const f of walk(staged).filter((f) => f.endsWith(".md"))) {
    const mdDir = relative(staged, dirname(f)).split(sep).join("/") || ".";
    fixLinks(f, `${srcPath}/${id}`, mdDir);
  }
  synced.push([id, floor]);
}

for (const [id] of synced) {
  const dest = join(ROOT, "official", id);
  rmSync(dest, { recursive: true, force: true });
  cpSync(join(STAGE, id), dest, { recursive: true });
}

config.lastSyncedRef = ref;
writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
console.log(`sync-official: synced ${synced.length} plugin(s) from ${repo}@${ref}:\n  ${synced.map(([id, f]) => `${id} (minGitcatVersion ${f})`).join("\n  ")}`);
