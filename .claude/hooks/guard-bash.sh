#!/usr/bin/env bash
# Project PreToolUse:Bash guard for invoice-software.
#
# Blocks:
#   1. --no-verify / --no-gpg-sign on git commit / git push
#      (AGENTS.md: "Never bypass hooks. Fix the underlying problem.")
#   2. Destructive git: reset --hard, push --force, branch -D, clean -f
#      (AGENTS.md: "Never run destructive git operations without explicit user approval.")
#
# Exits:
#   0 = allow
#   2 = block (stderr shown to model)

set -u

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

[ -z "$CMD" ] && exit 0

# Rule 1: --no-verify / --no-gpg-sign on git commit / git push
if printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+(commit|push)([[:space:]]|$)' \
   && printf '%s' "$CMD" | grep -qE '(^|[[:space:]])(--no-verify|--no-gpg-sign)([[:space:]]|$)'; then
  cat >&2 <<'EOF'
Blocked: --no-verify / --no-gpg-sign is forbidden.
AGENTS.md: "Never bypass hooks. Fix the underlying problem."
Address the failing check (typecheck, lint, test, DCO sign-off) instead
of skipping it.
EOF
  exit 2
fi

# Rule 2a: git reset --hard
if printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+reset([[:space:]]|$)' \
   && printf '%s' "$CMD" | grep -qE '(^|[[:space:]])--hard([[:space:]]|$)'; then
  cat >&2 <<'EOF'
Blocked: `git reset --hard` is destructive.
AGENTS.md: "Never run destructive git operations without explicit user
approval." Ask the user before discarding working-tree changes.
EOF
  exit 2
fi

# Rule 2b: git push --force / -f / --force-with-lease
if printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+push([[:space:]]|$)' \
   && printf '%s' "$CMD" | grep -qE '(^|[[:space:]])(-f|--force|--force-with-lease)([[:space:]]|=|$)'; then
  cat >&2 <<'EOF'
Blocked: force-push is destructive.
AGENTS.md: "Never run destructive git operations without explicit user
approval." Confirm with the user before force-pushing.
EOF
  exit 2
fi

# Rule 2c: git branch -D (force-delete)
if printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+branch([[:space:]]|$)' \
   && printf '%s' "$CMD" | grep -qE '(^|[[:space:]])(-D|--delete[[:space:]]+--force|--force[[:space:]]+--delete)([[:space:]]|$)'; then
  cat >&2 <<'EOF'
Blocked: `git branch -D` force-deletes a branch.
AGENTS.md: "Never run destructive git operations without explicit user
approval." Confirm before force-deleting a branch.
EOF
  exit 2
fi

# Rule 2d: git clean -f (any -*f* combo)
if printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+clean([[:space:]]|$)' \
   && printf '%s' "$CMD" | grep -qE '(^|[[:space:]])(-[A-Za-z]*f[A-Za-z]*|--force)([[:space:]]|$)'; then
  cat >&2 <<'EOF'
Blocked: `git clean -f` deletes untracked files.
AGENTS.md: "Never run destructive git operations without explicit user
approval." Confirm first; untracked work may be lost.
EOF
  exit 2
fi

exit 0
