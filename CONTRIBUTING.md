# Contributing a plugin

## Adding a community plugin (most contributors want this)

Your plugin lives in **your own repository** — this index only records where
to find it.

1. Write and test your plugin against a real GitCat install (see
   [the plugin docs](https://zangjiucheng.github.io/GitCat/plugins)), in its
   own repo.
2. Add one file here: `community/<your-plugin-id>.json`, matching
   [`schema/community-entry.schema.json`](./schema/community-entry.schema.json):

   ```jsonc
   {
     "id": "your-plugin-id",              // must match your plugin.json's own "id"
     "name": "Your Plugin",
     "description": "One line, under ~200 chars.",
     "author": "your-github-handle",
     "repo": "https://github.com/you/your-plugin-repo",
     "manifestPath": "plugin.json",       // path to plugin.json WITHIN that repo
     "tags": ["optional", "category-words"],
     "minGitcatVersion": "1.3.0"          // optional, mirrors your manifest's own field
   }
   ```

3. Run `node scripts/build-index.mjs` locally and commit the regenerated
   `index.json` alongside your new file — CI checks that they match
   (`node scripts/build-index.mjs --check`), so a PR that forgets this fails.
4. Open a PR. Review checks: valid JSON, a valid `id` (same charset GitCat
   itself requires: `^[a-z0-9][a-z0-9-]*$`), the `id` is unique across the
   whole index, `repo` is a real GitHub repo, and `manifestPath` resolves to
   an actual `plugin.json` there.

Keeping your entry current (bumped `minGitcatVersion`, a renamed repo, …) is
on you — this index doesn't watch your repo for changes. A PR updating your
own existing entry is exactly as welcome as a new one.

## Proposing an "official" plugin

`official/` is for plugins maintained **in this repo** — small, broadly
useful references (the kind that ship as examples). If that's what you're
proposing rather than linking your own repo, open an issue first and say
what it does; official entries are curated, not a first-come queue.

## What gets rejected

- A `repo` this index can't fetch (private, deleted, typo'd).
- A `manifestPath` that isn't valid JSON or doesn't parse as a GitCat plugin
  manifest.
- Anything a real `plugin.json` install would itself refuse — this index
  doesn't re-validate the full manifest schema, but an entry pointing at a
  broken manifest helps no one.
- Malware, or a plugin whose `run`/Lua `handler` does something its
  description doesn't disclose. GitCat's own trust model already treats a
  plugin's `run` string as a user-authored external command with no
  sandboxing — this index is a discovery layer on top of that, not a
  replacement for reading what you install.
