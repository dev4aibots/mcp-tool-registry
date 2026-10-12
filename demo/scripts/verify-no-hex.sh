#!/usr/bin/env bash
# Delivery-gate check: no hardcoded 6-digit hex literals in source.
# Primer tokens live in @primer/primitives CSS (exempt); app code must use var(--*).
set -u
matches=$(grep -rEn '#[0-9a-fA-F]{6}\b' app components lib --include='*.tsx' --include='*.ts' || true)
if [ -n "$matches" ]; then
  printf 'hardcoded hex found:\n%s\n' "$matches"
  exit 1
fi
echo "OK: no hardcoded hex literals in app/components/lib"
