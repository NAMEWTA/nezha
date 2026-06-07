---
name: nezha-branch-workflow
description: Manage the Nezha fork workflow for upstream syncs, personal extension work, contribution branches, and tag naming. Use when Codex needs to sync upstream/main, merge updates into personal/extensions, choose whether work targets origin or upstream issues/PRs, create the correct branch, or create/validate tags for Nezha development.
---

# Nezha Branch Workflow

## Core Model

Treat the remotes and long-lived branches as separate lanes:

- `upstream`: canonical project repository, expected to provide `upstream/main`.
- `origin`: the user's fork, used for pushing work branches and personal extension branches.
- `main`: local mirror of `upstream/main`; keep it clean for upstream contribution work.
- `personal/extensions`: user's long-lived private enhancement branch; keep it based on the latest `main`, but do not use it for upstream PR code.

Before starting any issue, PR, feature, or fix, sync `main` from `upstream/main` and merge `main` into `personal/extensions`.

Only branches named `personal/<type>/<slug>` are created from `personal/extensions`. All other new work branches are created from `main`, even when they are pushed to `origin`.

## Quick Command

Prefer the bundled script from the repository root:

```bash
.agents/skills/nezha-branch-workflow/scripts/prepare-branch.sh
```

To sync and create a branch for personal/fork-only work:

```bash
.agents/skills/nezha-branch-workflow/scripts/prepare-branch.sh origin personal/<type>/<slug>
```

To sync and create a branch for upstream contribution work:

```bash
.agents/skills/nezha-branch-workflow/scripts/prepare-branch.sh upstream fix/<slug>
```

The script requires a clean worktree. If it fails due to local changes, stop and preserve the user's work instead of stashing or resetting automatically.

## Target Decision

Use `origin` when the user says the work is for local extensions, private enhancements, fork-only behavior, `origin` issues/PRs, or `personal/extensions`.

- Inspect issues/PRs from the origin repository when `gh` is available.
- Create the work branch from `personal/extensions`.
- Require the branch name to be `personal/<type>/<slug>`, for example `personal/feat/git-tree-view` or `personal/fix/local-shell-resize`.
- Push the branch to `origin`.
- Open PRs against the fork, normally with base `personal/extensions`.
- Never merge origin-only changes into `main`.

Use `upstream` when the user says the work is for upstream contribution, upstream issues/PRs, or a change intended for the original project.

- Inspect issues/PRs from the upstream repository when `gh` is available.
- Create the work branch from `main`.
- Reject branch names that start with `personal/`; those names are reserved for branches based on `personal/extensions`.
- Push the branch to `origin`.
- Open PRs against upstream with base `main`.
- Never include commits that only exist on `personal/extensions`.

## Branch Naming

Personal extension branches must use:

```text
personal/<type>/<slug>
```

Use lowercase letters, digits, and hyphens for `<type>` and `<slug>`. Do not use extra path segments. Use a descriptive hyphenated slug such as `git-tree-view`, `issue-226-mention-delete`, or `local-shell-theme`.

Any branch that does not start with `personal/` must be treated as a `main`-based branch.

If the target is ambiguous, infer from the wording: extension/private/fork-only implies `origin`; contribution/upstream/official project implies `upstream`. Ask one short clarification only when that inference would be risky.

## Tag Naming

For local extension releases, fork-only releases, or any tag pushed only to `origin`, the tag must use:

```text
personal-x.x.x
```

Use a numeric three-part version after `personal-`, for example `personal-0.4.1`, `personal-1.0.0`, or `personal-2.3.4`. Do not use upstream-style tags such as `v0.4.1` for origin-only/personal releases.

Before creating an origin-only tag, validate it:

```bash
.agents/skills/nezha-branch-workflow/scripts/validate-tag.sh origin personal-<major>.<minor>.<patch>
```

Then tag and push to `origin`:

```bash
git tag personal-<major>.<minor>.<patch>
git push origin personal-<major>.<minor>.<patch>
```

For upstream contribution work, do not create release tags unless the user explicitly asks for upstream release/tag work. If an upstream tag is required, use the upstream project's tag convention and never use `personal-*`.

## Issue And PR Lookup

When an issue or PR number is provided, query the repository that matches the target:

```bash
# origin target
gh issue view <number> --repo "$(git remote get-url origin | sed -E 's#.*github.com[:/]([^/]+/[^/.]+)(\\.git)?#\\1#')"
gh pr view <number> --repo "$(git remote get-url origin | sed -E 's#.*github.com[:/]([^/]+/[^/.]+)(\\.git)?#\\1#')"

# upstream target
gh issue view <number> --repo "$(git remote get-url upstream | sed -E 's#.*github.com[:/]([^/]+/[^/.]+)(\\.git)?#\\1#')"
gh pr view <number> --repo "$(git remote get-url upstream | sed -E 's#.*github.com[:/]([^/]+/[^/.]+)(\\.git)?#\\1#')"
```

If `gh` is unavailable, use the local branch context and ask the user for the issue/PR details or URL.

## Manual Fallback

If the script cannot be used, run the workflow manually:

```bash
git fetch --all --prune

git switch main
git merge --ff-only upstream/main
git push origin main

git switch personal/extensions
git merge main
git push -u origin personal/extensions
```

Then create the task branch:

```bash
# origin-only work
git switch personal/extensions
git switch -c personal/<type>/<slug>
git push -u origin personal/<type>/<slug>

# upstream contribution work
git switch main
git switch -c fix/<slug>
git push -u origin fix/<slug>
```
