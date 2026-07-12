#!/usr/bin/env bash
# Stamp docs/js/utils/Constants.js GameConstants.META.VERSION from git tag/date.
# - Prefers `git describe --tags` with +YYYY-MM-DD suffix
# - Falls back to g<shortsha>+YYYY-MM-DD or just YYYY-MM-DD if no git

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
file="$root/docs/js/utils/Constants.js"

if [ ! -f "$file" ]; then
  echo "Constants file not found: $file" >&2
  exit 1
fi

date_str="$(date -u +%Y-%m-%d)"
tag=""
sha=""
if command -v git >/dev/null 2>&1; then
  set +e
  tag="$(git -C "$root" describe --tags --abbrev=7 --dirty --always 2>/dev/null)"
  sha="$(git -C "$root" rev-parse --short HEAD 2>/dev/null)"
  set -e
fi

if [ -n "$tag" ]; then
  ver="$tag+$date_str"
elif [ -n "$sha" ]; then
  ver="g$sha+$date_str"
else
  ver="$date_str"
fi

tmp="$file.tmp$$"
re='VERSION:[[:space:]]*\x27[^\x27]*\x27'

# Use awk to safely replace first VERSION: '...' occurrence
awk -v VER="$ver" '
  BEGIN{replaced=0}
  {
    if (!replaced) {
      if ($0 ~ /VERSION:[[:space:]]*\x27[^\x27]*\x27/) {
        sub(/VERSION:[[:space:]]*\x27[^\x27]*\x27/, "VERSION: '\''" VER "'\''");
        replaced=1;
      }
    }
    print $0;
  }
' "$file" > "$tmp"

mv "$tmp" "$file"
echo "Stamped VERSION to: $ver"

