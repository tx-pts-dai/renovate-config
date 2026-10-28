# Per-workflow tracking of DND-IT/github-workflows

Tests for the custom manager in
[`github-workflows-per-workflow-tags.json5`](../../../github-workflows-per-workflow-tags.json5),
which tracks each `DND-IT/github-workflows` reusable workflow against its own
per-workflow release tag instead of the repo's shared umbrella tag.

`test.js` reads the regex and templates directly from the config and asserts:

- the `uses:` matcher accepts the org in any casing (`DND-IT`, `dnd-it`, mixed)
  and captures the workflow name, file extension, digest and tag;
- both digest-pinned (`@<sha> # <tag>`) and plain tag (`@v3`) references
  are tracked, and a plain tag ref stays unpinned when rewritten;
- `autoReplaceStringTemplate` rewrites a lowercase `dnd-it/` reference to the
  canonical `DND-IT/` on update, preserving the caller's `.yml`/`.yaml` choice;
- the rule that disables the built-in `github-actions` manager matches the
  package name in either casing without catching the synthetic sub-workflow
  names owned by the custom manager;
- the one-time migration targets the floating `<workflow>-v0` tag, and the
  lineage rule uses `docker` versioning so partial tags stay valid.

Run:

```sh
node tests/custom_managers/github_workflows/test.js
```
