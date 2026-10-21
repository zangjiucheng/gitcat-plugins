# GitCat Plugins

A community index of [GitCat](https://github.com/zangjiucheng/GitCat) plugins.
GitCat reads this repo's [`index.json`](./index.json) for its in-app catalogue:
**Tools ▸ Plugins… → Browse** lists every plugin here and installs it, after
showing you what it runs.

## Two kinds of entry

- **[`official/`](./official)**: plugins published by the GitCat project. Full
  content (a `plugin.json`, a README, any assets/Lua scripts it needs) lives
  in its own folder. Most are **copies of GitCat's own
  [`examples/plugins/`](https://github.com/zangjiucheng/GitCat/tree/dev/examples/plugins)**,
  synced from a GitCat release tag by
  [`sync-official.yml`](./.github/workflows/sync-official.yml). The list is in
  [`official.sync.json`](./official.sync.json). Those folders are generated, so
  fix a synced plugin in GitCat, not here (see [Official plugins](#official-plugins)).
- **[`community/`](./community)** — a pointer to a plugin that lives in
  **someone else's** repository. This repo never hosts a community plugin's
  code, only a small JSON file recording where to find it (see
  [CONTRIBUTING.md](./CONTRIBUTING.md) to submit one).

Both kinds are aggregated into [`index.json`](./index.json) at the repo root
— one flat, machine-readable list a future "browse plugins" feature inside
GitCat itself could fetch directly, and a stable target for anyone scripting
against this index today.

## Installing a plugin from here

**In GitCat (easiest):** **Tools ▸ Plugins…** (or ⌘K / Ctrl+K → "Plugins") →
**Browse**, then **Install** on the plugin you want. GitCat fetches its files,
shows you exactly what it runs, and installs it only when you confirm. A plugin
whose `minGitcatVersion` is newer than your GitCat is refused with a clear
message. Update GitCat first.

**By hand:**

1. Find it under [`official/`](./official), or resolve a
   [`community/`](./community) entry's `repo` + `manifestPath` to its real
   `plugin.json`.
2. Download that `plugin.json` and anything alongside it that the manifest
   references (Lua scripts, Tama skin assets), keeping them in one folder.
3. In GitCat: **Tools ▸ Plugins… → Install from file…**, and pick the
   `plugin.json` **file** (not its folder).

## Official plugins

GitCat's own repository is the source of truth for the synced official
plugins. There, every example plugin is checked against the real manifest
validator on every change. This repo can't do that check: its CI only checks
that `index.json` matches the folders. So:

- **To change a synced plugin**, edit it in GitCat's `examples/plugins/<id>/`.
  It reaches this repo at the next sync. A hand edit under `official/<id>/`
  is overwritten.
- **After a GitCat release**, run **Actions → Sync official plugins from GitCat
  → Run workflow** with the release tag (e.g. `v1.4.1`). It copies the listed
  plugins, sets each `minGitcatVersion`, rewrites README links that leave the
  plugin folder (to the docs site or GitHub), regenerates `index.json`, and
  opens a PR for review.
- **`minGitcatVersion`** defaults to the release the copy was synced from,
  since that release's own tests validated it. Set a lower floor per plugin in
  `official.sync.json` only when you know an older GitCat supports
  everything the plugin uses.
- **To publish another example**, add its id to `official.sync.json` and
  re-sync. Plugins kept in GitCat purely as tutorials (`hello-tama`,
  `lua-hello`) are deliberately not listed.

Locally: `node scripts/sync-official.mjs --from <GitCat checkout> --ref vX.Y.Z`
then `node scripts/build-index.mjs`. A link in a synced README that points at
something missing in GitCat at that tag aborts the sync, and nothing is written.

## Contributing a plugin

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Manifest reference

This index doesn't reinvent the manifest format — see GitCat's own
[plugin documentation](https://zangjiucheng.github.io/GitCat/plugins) for the
full `plugin.json` field reference (commands, hooks, panels, `languages`,
Tama skins, Luau scripting).

## License

[MIT](./LICENSE) for everything in this repo (the index itself, the
`official/` plugins, tooling). A plugin linked from `community/` is licensed
however its own repository says — this index only points at it.
