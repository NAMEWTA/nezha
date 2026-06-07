#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  validate-tag.sh origin personal-<major>.<minor>.<patch>
  validate-tag.sh upstream <tag-name>

Rules:
  - origin tags for local or personal releases must be personal-x.x.x.
  - upstream tags must not start with personal-.
EOF
}

target="${1:-}"
tag_name="${2:-}"

if [[ "$target" == "-h" || "$target" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$target" != "origin" && "$target" != "upstream" ]]; then
  usage >&2
  exit 2
fi

if [[ -z "$tag_name" ]]; then
  usage >&2
  exit 2
fi

if ! git check-ref-format "refs/tags/$tag_name" >/dev/null 2>&1; then
  echo "error: invalid Git tag name: $tag_name" >&2
  exit 1
fi

if [[ "$target" == "origin" ]]; then
  if [[ ! "$tag_name" =~ ^personal-[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: origin personal release tags must match personal-x.x.x" >&2
    exit 1
  fi
else
  if [[ "$tag_name" == personal-* ]]; then
    echo "error: personal-* tags are reserved for origin personal releases" >&2
    exit 1
  fi
fi

if git show-ref --verify --quiet "refs/tags/$tag_name"; then
  echo "error: tag already exists locally: $tag_name" >&2
  exit 1
fi

if git ls-remote --tags "$target" "$tag_name" | grep -q .; then
  echo "error: tag already exists on $target: $tag_name" >&2
  exit 1
fi

echo "Tag is valid for $target: $tag_name"
