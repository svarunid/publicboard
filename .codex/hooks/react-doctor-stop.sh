#!/bin/sh
set -u

git_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$git_root" ]; then
  printf '%s\n' "react-doctor: not in a git repository; skipping."
  exit 0
fi

cd "$git_root" || exit 0

changed_files=$(
  {
    git diff --name-only --diff-filter=ACMR
    git diff --name-only --diff-filter=ACMR --cached
    git ls-files --others --exclude-standard
  } | sort -u
)

if [ -z "$changed_files" ]; then
  printf '%s\n' "react-doctor: no changed files; skipping."
  exit 0
fi

relevant_files=$(printf '%s\n' "$changed_files" | grep -E '\.(jsx?|tsx?)$' || true)
if [ -z "$relevant_files" ]; then
  printf '%s\n' "react-doctor: no changed React/TypeScript files; skipping."
  exit 0
fi

if [ ! -x ./node_modules/.bin/react-doctor ]; then
  printf '%s\n' "react-doctor: ./node_modules/.bin/react-doctor not found; skipping. Run bun install first."
  exit 0
fi

printf '%s\n' "react-doctor: scanning changed files."
help_output=$(./node_modules/.bin/react-doctor --help 2>/dev/null || true)
if printf '%s\n' "$help_output" | grep -q -- '--scope'; then
  ./node_modules/.bin/react-doctor --verbose --scope changed --blocking warning --no-score
elif printf '%s\n' "$help_output" | grep -q -- '--diff'; then
  ./node_modules/.bin/react-doctor --verbose --diff --blocking warning --no-score
else
  printf '%s\n' "react-doctor: changed-file scanning is not supported by this installed version; skipping."
  exit 0
fi
