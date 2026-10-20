// Tiny JSON syntax highlighter using Primer semantic tokens only.
// DESIGN.md Appendix A: keys --fgColor-accent, strings --fgColor-success,
// numbers/booleans --fgColor-attention, punctuation --fgColor-muted.
import React from 'react';

const TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false)\b|\b(null)\b|([{}[\],])/g;

export function JsonView({ json, wrap = false, beam = false }: { json: string; wrap?: boolean; beam?: boolean }) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(json)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{json.slice(lastIndex, match.index)}</span>);
    }
    const [full, str, colon, num, bool, nul, punct] = match;
    if (str !== undefined) {
      nodes.push(
        <span key={key++} className="json-key">
          {str}
        </span>,
      );
      if (colon) {
        nodes.push(
          <span key={key++} className="json-punct">
            {colon}
          </span>,
        );
      }
    } else if (num !== undefined) {
      nodes.push(
        <span key={key++} className="json-number">
          {num}
        </span>,
      );
    } else if (bool !== undefined) {
      nodes.push(
        <span key={key++} className="json-bool">
          {bool}
        </span>,
      );
    } else if (nul !== undefined) {
      nodes.push(
        <span key={key++} className="json-null">
          {nul}
        </span>,
      );
    } else if (punct !== undefined) {
      nodes.push(
        <span key={key++} className="json-punct">
          {punct}
        </span>,
      );
    } else {
      nodes.push(<span key={key++}>{full}</span>);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < json.length) {
    nodes.push(<span key={key++}>{json.slice(lastIndex)}</span>);
  }
  return (
    <pre className={beam ? "code-panel du-beam-console" : "code-panel"} style={wrap ? { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } : undefined}>
      <code>{nodes}</code>
    </pre>
  );
}

/** Pretty-print a raw JSON string for display (falls back to the raw text). */
export function pretty(json: string, indent = 2): string {
  try {
    return JSON.stringify(JSON.parse(json), null, indent);
  } catch {
    return json;
  }
}
