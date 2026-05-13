#!/usr/bin/env bash
# Project Stop hook for invoice-software.
#
# If any .ts/.tsx files are dirty in the working tree, run `pnpm typecheck`
# before letting the model report "done". Catches type errors at the end
# of a turn instead of at push time. See AGENTS.md "Quality gates".
#
# Exits:
#   0 = allow stop
#   2 = block stop, return typecheck output to model

set -u

REPO=$(git rev-parse --show-toplevel 2>/dev/null || true)
[ -z "$REPO" ] && exit 0

cd "$REPO" || exit 0

CHANGED=$(
  {
    git diff --name-only HEAD 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | grep -E '\.(ts|tsx)$' | sort -u
)

if [ -z "$CHANGED" ]; then
  exit 0
fi

echo "Running pnpm typecheck (changed TS files detected)..." >&2

OUT=$(pnpm typecheck 2>&1)
RC=$?

if [ "$RC" -ne 0 ]; then
  {
    echo "Stop blocked: TypeScript check failed."
    echo ""
    echo "$OUT" | tail -60
    echo ""
    echo "Fix the type errors above before reporting the task complete."
  } >&2
  exit 2
fi

echo "TypeScript check passed." >&2
exit 0
