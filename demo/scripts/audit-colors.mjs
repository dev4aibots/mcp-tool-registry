// scripts/audit-colors.mjs — WCAG contrast audit for the demo's key text pairs.
// Uses culori (MIT) wcagContrast(). Every pair must meet AA (4.5:1 body,
// 3:1 large/UI). Primer's functional tokens are the values under test; the
// script asserts the token VALUES the app actually renders, in both modes.
// Exit 0 = all pass.
import { wcagContrast } from 'culori';

// Token values verified from @primer/primitives@11.10.0 shipped CSS
// (dist/css/functional/themes/{light,dark}.css) on 2026-10-12.
const PAIRS = [
  // [name, fg, bg, minRatio]
  ['light: body text', '#1f2328', '#ffffff', 4.5], // --fgColor-default on --bgColor-default
  ['light: muted meta', '#59636e', '#ffffff', 4.5], // --fgColor-muted on --bgColor-default
  ['light: accent link', '#0969da', '#ffffff', 4.5], // --fgColor-accent on --bgColor-default
  ['light: success string', '#1a7f37', '#f6f8fa', 4.5], // --fgColor-success on --bgColor-inset
  ['light: danger label', '#d1242f', '#ffffff', 4.5], // --fgColor-danger on --bgColor-default
  ['dark: body text', '#f0f6fc', '#0d1117', 4.5], // --fgColor-default on --bgColor-default
  ['dark: muted meta', '#9198a1', '#0d1117', 4.5], // --fgColor-muted on --bgColor-default
  ['dark: accent link', '#4493f8', '#0d1117', 4.5], // --fgColor-accent on --bgColor-default
  ['dark: success string', '#3fb950', '#010409', 4.5], // --fgColor-success on --bgColor-inset
  ['dark: danger label', '#f85149', '#0d1117', 4.5], // --fgColor-danger on --bgColor-default
];

let fail = 0;
for (const [name, fg, bg, min] of PAIRS) {
  const ratio = wcagContrast(fg, bg);
  const ok = ratio >= min;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1 (min ${min}:1)`);
  if (!ok) fail++;
}
process.exit(fail === 0 ? 0 : 1);
