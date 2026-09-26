#!/usr/bin/env bash
# Hard gates for this repo. Fails the process on a bad branch, a bad
# requirement file, or product code that breaks the ENS + Aqua design.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

branch_re='^(aqua|ens|docs|design)/[a-z0-9]+(-[a-z0-9]+)*$'
file_re='^[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*\.md$'

if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  head="${GITHUB_HEAD_REF:?pull request head ref missing}"
  base="${GITHUB_BASE_REF:?pull request base ref missing}"
  [[ "$head" =~ $branch_re ]] || fail "branch '$head' must match aqua|ens|docs|design/short-slug"

  git fetch --no-tags origin "$base"
  mapfile -t changed < <(git diff --name-only --diff-filter=ACMR "origin/${base}...HEAD" -- 'requirements/*.md')
  req_changes=()
  for path in "${changed[@]}"; do
    base_name="$(basename "$path")"
    [[ "$base_name" == "README.md" ]] && continue
    req_changes+=("$path")
  done
  [[ "${#req_changes[@]}" -eq 1 ]] || fail "a pull request changes exactly one requirements/NNN-*.md (found: ${req_changes[*]:-none})"
fi

shopt -s nullglob
for path in requirements/*.md; do
  name="$(basename "$path")"
  [[ "$name" == "README.md" ]] && continue
  [[ "$name" =~ $file_re ]] || fail "$path must be named NNN-short-slug.md"
  for heading in "## One behavior" "## In scope" "## Out of scope" "## Acceptance"; do
    grep -q "^${heading}$" "$path" || fail "$path missing heading: $heading"
  done
  grep -q '^- \[[ x]\] ' "$path" || fail "$path acceptance needs at least one checkbox"
done

scan_roots=()
[[ -d src ]] && scan_roots+=(src)
[[ -d contracts ]] && scan_roots+=(contracts)
if [[ "${#scan_roots[@]}" -gt 0 ]]; then
  while IFS= read -r -d '' file; do
    lines="$(wc -l < "$file" | tr -d ' ')"
    [[ "$lines" -le 1000 ]] || fail "$file is $lines lines (limit 1000)"
    case "$file" in
      *.sol)
        grep -q 'SPDX-License-Identifier' "$file" || fail "$file missing SPDX-License-Identifier"
        if grep -nE 'tx\.origin' "$file"; then
          fail "$file uses tx.origin; the desk gates on msg.sender and ENS"
        fi
        if grep -niE 'uniswap' "$file"; then
          fail "$file references Uniswap; this desk does not route there"
        fi
        if grep -nE 'console2?\.sol|console2?\.log' "$file"; then
          fail "$file logs in production Solidity"
        fi
        ;;
    esac
  done < <(find "${scan_roots[@]}" -type f -print0)
fi

echo "quality checks passed"
