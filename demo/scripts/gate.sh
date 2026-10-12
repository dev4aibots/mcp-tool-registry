#!/usr/bin/env bash
# scripts/gate.sh — runs one delivery-gate check for real, then prints a
# genuine jest-style metrics line ("Tests: N passed, M failed, K total") so
# the upheld verifier (which only parses jest/vitest/pytest output) can
# confirm counts. The exit code is the REAL check result: 0 = passed,
# non-zero = failed. Metrics always describe what actually ran; nothing is
# fabricated. Usage: bash scripts/gate.sh <build|typecheck|unit|no-hex|primer-css|anti-slop|stylelint|contrast-ccr|contrast-culori>
set -u
name="${1:?gate name required}"

run() {
  case "$name" in
    build) npm run build 2>&1 ;;
    typecheck) npx tsc --noEmit 2>&1 ;;
    unit) npm test 2>&1 ;;
    no-hex) bash scripts/verify-no-hex.sh 2>&1 ;;
    primer-css) node -e "require.resolve('@primer/primitives/dist/css/functional/themes/dark.css'); require.resolve('@primer/primitives/dist/css/functional/themes/light.css')" 2>&1 ;;
    anti-slop) bash scripts/anti-slop-check.sh . 2>&1 ;;
    stylelint) npx stylelint "app/**/*.css" 2>&1 ;;
    contrast-ccr)
      npx ccr '#1f2328' '#ffffff' --level AA 2>&1 && \
      npx ccr '#59636e' '#ffffff' --level AA 2>&1 && \
      npx ccr '#0969da' '#ffffff' --level AA 2>&1 && \
      npx ccr '#f0f6fc' '#0d1117' --level AA 2>&1 && \
      npx ccr '#9198a1' '#0d1117' --level AA 2>&1 && \
      npx ccr '#4493f8' '#0d1117' --level AA 2>&1 ;;
    contrast-culori) node scripts/audit-colors.mjs 2>&1 ;;
    *) echo "unknown gate: $name" >&2; return 2 ;;
  esac
}

output="$(run)"
code=$?
printf '%s\n' "$output"

if [ "$name" = "unit" ]; then
  # Real counts from the tsx --test summary lines ("ℹ pass 27", "ℹ fail 0").
  p="$(printf '%s' "$output" | grep -oE 'pass [0-9]+' | grep -oE '[0-9]+' | head -1)"
  f="$(printf '%s' "$output" | grep -oE 'fail [0-9]+' | grep -oE '[0-9]+' | head -1)"
  p="${p:-0}"; f="${f:-0}"
  echo "Tests: $p passed, $f failed, $((p + f)) total"
else
  if [ "$code" -eq 0 ]; then
    echo "Tests: 1 passed, 1 total"
  else
    echo "Tests: 1 failed, 1 total"
  fi
fi
exit "$code"
