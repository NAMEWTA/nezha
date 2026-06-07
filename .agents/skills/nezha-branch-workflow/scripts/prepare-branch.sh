#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  prepare-branch.sh
  prepare-branch.sh origin personal/<type>/<slug>
  prepare-branch.sh upstream <branch-name>

Behavior:
  1. Require a clean worktree.
  2. Fetch origin and upstream.
  3. Fast-forward local main to upstream/main.
  4. Push local main to origin.
  5. Merge main into personal/extensions.
  6. Optionally create a work branch:
     - origin:   personal/<type>/<slug> branch from personal/extensions
     - upstream: non-personal branch from main
EOF
}

valid_slug_part() {
  [[ "$1" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]
}

validate_branch_name() {
  local target="$1"
  local branch_name="$2"

  if ! git check-ref-format --branch "$branch_name" >/dev/null 2>&1; then
    echo "error: invalid Git branch name: $branch_name" >&2
    exit 1
  fi

  if [[ "$target" == "origin" ]]; then
    local prefix branch_type slug extra
    IFS=/ read -r prefix branch_type slug extra <<< "$branch_name"

    if [[ "$prefix" != "personal" || -z "${branch_type:-}" || -z "${slug:-}" || -n "${extra:-}" ]]; then
      echo "error: origin work branches must be named personal/<type>/<slug>" >&2
      exit 1
    fi

    if ! valid_slug_part "$branch_type" || ! valid_slug_part "$slug"; then
      echo "error: personal branch type and slug must use lowercase letters, digits, and hyphens" >&2
      exit 1
    fi
  elif [[ "$branch_name" == personal/* ]]; then
    echo "error: personal/* branches are reserved for origin work based on personal/extensions" >&2
    exit 1
  fi
}

target="${1:-}"
branch_name="${2:-}"

if [[ "$target" == "-h" || "$target" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -n "$target" && "$target" != "origin" && "$target" != "upstream" ]]; then
  usage >&2
  exit 2
fi

if [[ -z "$target" && -n "$branch_name" ]]; then
  usage >&2
  exit 2
fi

if [[ -n "$target" && -z "$branch_name" ]]; then
  usage >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "error: not inside a Git repository" >&2
  exit 1
fi

cd "$repo_root"

if [[ -n "$branch_name" ]]; then
  validate_branch_name "$target" "$branch_name"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "error: missing origin remote" >&2
  exit 1
fi

if ! git remote get-url upstream >/dev/null 2>&1; then
  echo "error: missing upstream remote" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "error: worktree has uncommitted changes; commit or otherwise preserve them first" >&2
  exit 1
fi

git fetch --all --prune

git switch main
git merge --ff-only upstream/main
git push origin main

if git show-ref --verify --quiet refs/heads/personal/extensions; then
  git switch personal/extensions
elif git show-ref --verify --quiet refs/remotes/origin/personal/extensions; then
  git switch --track origin/personal/extensions
else
  git switch -c personal/extensions main
fi

git merge main
git push -u origin personal/extensions

if [[ -n "$branch_name" ]]; then
  if git show-ref --verify --quiet "refs/heads/$branch_name"; then
    echo "error: local branch already exists: $branch_name" >&2
    exit 1
  fi

  if git show-ref --verify --quiet "refs/remotes/origin/$branch_name"; then
    echo "error: origin branch already exists: $branch_name" >&2
    exit 1
  fi

  if [[ "$target" == "origin" ]]; then
    git switch personal/extensions
  else
    git switch main
  fi

  git switch -c "$branch_name"
  git push -u origin "$branch_name"
fi

echo
echo "Ready."
git status --short --branch
