#!/usr/bin/env bash
# anti-slop-check.sh — grep-enforceable subset of the Anti-Slop Checklist.
# Usage: ./anti-slop-check.sh <dir>
# Exit 0 = all automated checks pass. Exit 1 = one or more SLOP rules violated.
# Rule IDs map to research/anti-slop.md (sources: 14goku15/claude-design-skills
# ai-slop-detector.md [MIT], impeccable.style/slop catalog).
set -u
TARGET="${1:-.}"
FAIL=0
# Demo working tree only: node_modules and build output carry thousands of
# third-party matches and are never shipped.
EXCLUDES=(--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git)
CODE_INCS=("${EXCLUDES[@]}" --include=*.css --include=*.scss --include=*.tsx --include=*.jsx --include=*.html)
COPY_INCS=("${EXCLUDES[@]}" --include=*.tsx --include=*.jsx --include=*.html --include=*.md --include=*.mdx)

hits() { # $1 = ere-pattern, $2.. = --include flags
  local pat="$1"; shift
  grep -rEn "$pat" "$TARGET" "$@" 2>/dev/null
}

report() { # $1=rule $2=desc $3=output
  if [ -n "$3" ]; then echo "FAIL [$1] $2"; echo "$3" | head -8 | sed 's/^/    /'; FAIL=1;
  else echo "PASS [$1] $2"; fi
}

echo "== Anti-slop gate: $TARGET =="

# SLOP-CC01: purple/violet/blue AI gradient palette
report "SLOP-CC01" "no purple/violet/indigo/cyan linear gradients" \
  "$(hits 'linear-gradient[^;{]*\((purple|violet|indigo|cyan)|#(7c3aed|8b5cf6|a855f7|6366f1|4f46e5|2563eb|06b6d4)' "${CODE_INCS[@]}")"
# SLOP-CC03: gradient text
report "SLOP-CC03" "no gradient-clipped text" \
  "$(hits 'bg-clip-text|-webkit-background-clip:[[:space:]]*text' "${CODE_INCS[@]}")"
# SLOP-VD01: side-tab accent borders on cards
report "SLOP-VD01" "no side-tab accent borders" \
  "$(hits 'border-[lr]-[1-9]|border-(left|right):[[:space:]]*[2-9]' "${CODE_INCS[@]}" | grep -v 'border-[lr]-0')"
# SLOP-VD03: glassmorphism count (>2 instances = decoration)
GC=$(hits 'backdrop-blur|backdrop-filter' "${CODE_INCS[@]}" | grep -o 'backdrop-blur\|backdrop-filter' | wc -l)
if [ "$GC" -gt 2 ]; then echo "FAIL [SLOP-VD03] glassmorphism used $GC times (max 2, layering only)"; FAIL=1;
else echo "PASS [SLOP-VD03] glassmorphism instances: $GC (<=2)"; fi
# SLOP-VD04: extreme border radius
report "SLOP-VD04" "no 24px+ card radii / rounded-3xl on cards" \
  "$(hits 'rounded-3xl|border-radius:[[:space:]]*(2[4-9]|[3-9][0-9])px' "${CODE_INCS[@]}")"
# SLOP-GQ03: justified text
report "SLOP-GQ03" "no justified body text" \
  "$(hits 'text-justify|text-align:[[:space:]]*justify' "${CODE_INCS[@]}")"
# SLOP-MO02: layout-property animation
report "SLOP-MO02" "no width/height/padding/margin transitions" \
  "$(hits 'transition(-property)?:[[:space:]]*(width|height|padding|margin)' "${CODE_INCS[@]}")"
# SLOP-IM01: placeholder / lorem ipsum (zero tolerance)
report "SLOP-IM01" "zero lorem ipsum / placeholder assets" \
  "$(hits 'lorem ipsum|via\.placeholder|placehold\.co|picsum\.photos' "${COPY_INCS[@]}")"
# SLOP-CO01: em-dash overuse (>2 per file in copy-bearing files)
EMD=$(for f in $(grep -rl '—' "$TARGET" "${COPY_INCS[@]}" 2>/dev/null); do
  c=$(grep -o '—' "$f" | wc -l); [ "$c" -gt 2 ] && echo "$f:$c em-dashes";
done)
if [ -n "$EMD" ]; then echo "FAIL [SLOP-CO01] em-dash overuse (>2/file):"; echo "$EMD" | sed 's/^/    /'; FAIL=1;
else echo "PASS [SLOP-CO01] em-dash count ok (<=2 per file)"; fi
# SLOP-CO02: marketing buzzwords (zero tolerance in UI copy; .md excluded so docs can discuss them)
report "SLOP-CO02" "no buzzwords (streamline/empower/supercharge/seamless/revolutionary/...)" \
  "$(hits '[Ss]treamline|[Ee]mpower|[Ss]upercharge|[Ww]orld-class|[Ee]nterprise-grade|[Ss]eamless|[Rr]evolutionary|[Uu]nlock the power|[Dd]elve into|[Gg]ame-?changer|[Cc]utting-edge|[Nn]ext-generation' --include=*.tsx --include=*.jsx --include=*.html)"
# SLOP-CO05: dead generic CTAs
report "SLOP-CO05" 'no dead CTAs ("Get started for free", "Learn more" alone, "Click here", ">Submit<")' \
  "$(hits '[Gg]et started for free|[Cc]lick here|>Submit<|>[Ll]earn more<' --include=*.tsx --include=*.jsx --include=*.html)"
# SLOP-COPY01: emoji in UI copy (bullets/icons)
EMOJI=$(LC_ALL=C.UTF-8 grep -rPn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}]' "$TARGET" --include=*.tsx --include=*.jsx --include=*.html 2>/dev/null | head -8)
report "SLOP-COPY01" "no emoji in UI copy" "$EMOJI"
# SLOP-TYPE01: max 2 typefaces (+1 mono for code)
FONTS=$(grep -rhoE "font-family:[[:space:]]*['\"]?[A-Za-z0-9 +-]+" "$TARGET" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --include=*.css 2>/dev/null | sed -E "s/font-family:[[:space:]]*['\"]?//" | sort -fu | wc -l)
if [ "$FONTS" -gt 3 ]; then echo "FAIL [SLOP-TYPE01] $FONTS distinct typefaces (max 3 incl. code mono)"; FAIL=1;
else echo "PASS [SLOP-TYPE01] typefaces: $FONTS (<=3)"; fi

echo ""
echo "MANUAL (human/LLM visual review, not grep-able):"
echo "  [SLOP-LS01] no identical icon-card grids — vary sizes or break the grid"
echo "  [SLOP-TY02] no icon-tile-above-heading feature cards"
echo "  [SLOP-TY04] no default eyebrow-pill-above-hero-headline"
echo "  [SLOP-HERO] hero headline is not '[Verb] your [noun] with [product]'"
echo "  [SLOP-BRAND] first viewport passes the brand test (could this be any brand?)"
echo ""
[ "$FAIL" -eq 0 ] && echo "RESULT: PASS — no automated slop detected" || echo "RESULT: FAIL — fix flagged patterns"
exit "$FAIL"
