/**
 * Sanitize author-supplied custom CSS before it is injected into the document.
 *
 * Custom CSS travels to VIEWERS of a published document, so a malicious author
 * could otherwise attack readers. The raw string is NOT a trusted stylesheet.
 * We defend against:
 *  - scope breakout: a `}` in the CSS escaping the `scope { … }` wrapper to
 *    style the whole app (toolbar, other content, security UI, overlays);
 *  - external resource loads / exfiltration: `url(…)` and `@import` (tracking
 *    beacons, plus CSS attribute-selector data exfiltration);
 *  - clickjacking / UI redressing: `position: fixed | sticky` overlays that
 *    escape the document box and cover the viewport;
 *  - legacy script vectors: `expression()`, `-moz-binding`, `behavior:`.
 *
 * Strategy: wrap the raw CSS in `scope { … }` and parse it with the browser's
 * own CSS engine (no dependency, no regex parsing). A well-formed input yields
 * exactly ONE top-level rule whose selector is `scope`; a breakout produces
 * extra top-level rules with other selectors — we keep only the `scope` rule
 * and drop the rest. Dangerous declarations are stripped at every nesting
 * level. The kept rule is re-serialized by the engine, so the output is always
 * a valid, balanced stylesheet.
 *
 * Returns '' when nothing safe remains, on a parse error, or when called
 * without a DOM (SSR) — the client re-runs it after hydration.
 */

// Any url(...) reference — we allow none (document images come through the
// content pipeline, not CSS), so even data: URIs are dropped for simplicity.
const URL_REF = /url\(/i;
// Legacy/script-ish value vectors.
const DANGEROUS_VALUE = /expression\(|-moz-binding|behavior\s*:/i;

const stripDeclarations = (style: CSSStyleDeclaration): void => {
  // Iterate a snapshot — removeProperty mutates the live collection.
  for (const prop of Array.from(style)) {
    const name = prop.toLowerCase();
    const value = style.getPropertyValue(prop);
    if (
      URL_REF.test(value) ||
      DANGEROUS_VALUE.test(value) ||
      name === 'behavior' ||
      name === '-moz-binding' ||
      (name === 'position' && /\b(fixed|sticky)\b/i.test(value))
    ) {
      style.removeProperty(prop);
    }
  }
};

// Recursively strip dangerous declarations from a rule and everything nested
// inside it (nested style rules, @media/@supports blocks, …).
const stripRule = (rule: CSSRule): void => {
  const anyRule = rule as CSSRule & {
    style?: CSSStyleDeclaration;
    cssRules?: CSSRuleList;
  };
  if (anyRule.style) stripDeclarations(anyRule.style);
  if (anyRule.cssRules) {
    for (const child of Array.from(anyRule.cssRules)) stripRule(child);
  }
};

export const sanitizeCustomCss = (
  raw: string | undefined | null,
  scope = '.ProseMirror',
): string => {
  if (!raw || !raw.trim() || typeof document === 'undefined') return '';

  let sheet: CSSStyleSheet | null = null;
  try {
    // Parse in a detached document so nothing applies to the live page.
    const doc = document.implementation.createHTMLDocument('');
    const styleEl = doc.createElement('style');
    styleEl.textContent = `${scope} { ${raw} }`;
    doc.head.appendChild(styleEl);
    sheet = styleEl.sheet;
  } catch {
    return '';
  }
  if (!sheet) return '';

  const kept: string[] = [];
  for (const rule of Array.from(sheet.cssRules)) {
    // Keep ONLY the single wrapper rule. Any other top-level rule is a breakout
    // (or an at-rule like @import) and is dropped.
    if (
      typeof CSSStyleRule !== 'undefined' &&
      rule instanceof CSSStyleRule &&
      rule.selectorText === scope
    ) {
      stripRule(rule);
      kept.push(rule.cssText);
    }
  }
  return kept.join('\n');
};
