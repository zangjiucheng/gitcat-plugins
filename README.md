# GitCat Plugins

A community index of [GitCat](https://github.com/zangjiucheng/GitCat) plugins.
GitCat plugins are local-file installs — there's no in-app marketplace yet —
so this repo is the catalog: browse it, grab a manifest, install it from
**Settings → Plugins → Install plugin…**.

## Two kinds of entry

- **[`official/`](./official)** — plugins maintained here, in this repo. Full
  content (a `plugin.json`, a README, any assets/Lua scripts it needs) lives
  in its own folder.
- **[`community/`](./community)** — a pointer to a plugin that lives in
  **someone else's** repository. This repo never hosts a community plugin's
  code, only a small JSON file recording where to find it (see
  [CONTRIBUTING.md](./CONTRIBUTING.md) to submit one).

Both kinds are aggregated into [`index.json`](./index.json) at the repo root
— one flat, machine-readable list a future "browse plugins" feature inside
GitCat itself could fetch directly, and a stable target for anyone scripting
against this index today.

## Installing a plugin from here

1. Find it under [`official/`](./official) (browse the folder) or resolve a
   [`community/`](./community) entry's `repo` + `manifestPath` to its real
   `plugin.json`.
2. Download that `plugin.json` (and anything alongside it the manifest
   references — Lua scripts, Tama skin assets).
3. In GitCat: **Settings → Plugins → Install plugin…**, pick the file (or its
   folder).

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
