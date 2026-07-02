/**
 * Sanitize + validate author-supplied custom CSS before it is injected into the
 * document.
 *
 * Custom CSS travels to VIEWERS of a published document, so the raw string is
 * NOT a trusted stylesheet. We defend against:
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
 * extra top-level rules with other selectors — we keep only `scope` rules and
 * drop the rest. Dangerous declarations are stripped at every nesting level.
 * The kept rules are re-serialized by the engine, so the output is always a
 * valid, balanced stylesheet.
 *
 * The sanitizer knows exactly what it removed, so it also returns non-blocking
 * `diagnostics` — the editing UI shows these so authors aren't left wondering
 * why a rule silently vanished (CSS is forgiving; we warn, never block).
 */

export interface CssDiagnostic {
  level: 'warning' | 'error';
  message: string;
}

export interface CssValidationResult {
  /** Sanitized, scope-wrapped CSS, safe to inject. '' when nothing survives. */
  css: string;
  /** What was stripped/ignored, deduped. Empty when the CSS was fully clean. */
  diagnostics: CssDiagnostic[];
}

// Any url(...) reference — we allow none (document images come through the
// content pipeline, not CSS), so even data: URIs are dropped for simplicity.
const URL_REF = /url\(/i;
// Legacy/script-ish value vectors.
const DANGEROUS_VALUE = /expression\(|-moz-binding|behavior\s*:/i;

const MSG = {
  url: 'url() and external resources aren’t allowed — they were removed.',
  position:
    'position: fixed and position: sticky aren’t allowed — they were removed.',
  legacy: 'expression()/behavior aren’t allowed — they were removed.',
  atImport: '@import isn’t allowed — it was removed.',
  breakout:
    'CSS is scoped to the document — rules targeting the whole page were ignored.',
  unparseable: 'Couldn’t parse this CSS — check for a typo or unbalanced { }.',
};

const stripDeclarations = (
  style: CSSStyleDeclaration,
  reasons: Set<string>,
): void => {
  // Iterate a snapshot — removeProperty mutates the live collection.
  for (const prop of Array.from(style)) {
    const name = prop.toLowerCase();
    const value = style.getPropertyValue(prop);
    if (URL_REF.test(value)) {
      style.removeProperty(prop);
      reasons.add(MSG.url);
    } else if (name === 'position' && /\b(fixed|sticky)\b/i.test(value)) {
      style.removeProperty(prop);
      reasons.add(MSG.position);
    } else if (
      DANGEROUS_VALUE.test(value) ||
      name === 'behavior' ||
      name === '-moz-binding'
    ) {
      style.removeProperty(prop);
      reasons.add(MSG.legacy);
    }
  }
};

// Recursively strip dangerous declarations from a rule and everything nested
// inside it (nested style rules, @media/@supports blocks, …).
const stripRule = (rule: CSSRule, reasons: Set<string>): void => {
  const anyRule = rule as CSSRule & {
    style?: CSSStyleDeclaration;
    cssRules?: CSSRuleList;
  };
  if (anyRule.style) stripDeclarations(anyRule.style, reasons);
  if (anyRule.cssRules) {
    for (const child of Array.from(anyRule.cssRules)) stripRule(child, reasons);
  }
};

const isEmptyRule = (rule: CSSStyleRule): boolean =>
  rule.style.length === 0 && rule.cssRules.length === 0;

/**
 * Sanitize AND report. Use this from the editing UI to surface diagnostics.
 */
export const validateCustomCss = (
  raw: string | undefined | null,
  scope = '.ProseMirror',
): CssValidationResult => {
  if (!raw || !raw.trim() || typeof document === 'undefined') {
    return { css: '', diagnostics: [] };
  }

  const reasons = new Set<string>();

  let sheet: CSSStyleSheet | null = null;
  try {
    // Parse in a detached document so nothing applies to the live page.
    const doc = document.implementation.createHTMLDocument('');
    const styleEl = doc.createElement('style');
    styleEl.textContent = `${scope} { ${raw} }`;
    doc.head.appendChild(styleEl);
    sheet = styleEl.sheet;
  } catch {
    return {
      css: '',
      diagnostics: [{ level: 'error', message: MSG.unparseable }],
    };
  }
  if (!sheet) {
    return {
      css: '',
      diagnostics: [{ level: 'error', message: MSG.unparseable }],
    };
  }

  // The parser silently drops @import that sits inside a style rule, so it
  // never shows up as a rule — detect it from the raw text instead.
  if (/@import\b/i.test(raw)) reasons.add(MSG.atImport);

  const kept: CSSStyleRule[] = [];
  let ignoredTopLevel = 0;
  for (const rule of Array.from(sheet.cssRules)) {
    // Keep ONLY wrapper rules (selector === scope). A breakout produces extra
    // top-level rules with other selectors → counted and dropped.
    if (
      typeof CSSStyleRule !== 'undefined' &&
      rule instanceof CSSStyleRule &&
      rule.selectorText === scope
    ) {
      stripRule(rule, reasons);
      kept.push(rule);
    } else {
      ignoredTopLevel += 1;
    }
  }
  if (ignoredTopLevel > 0) reasons.add(MSG.breakout);

  const css = kept
    .filter((rule) => !isEmptyRule(rule))
    .map((rule) => rule.cssText)
    .join('\n');

  const diagnostics: CssDiagnostic[] = Array.from(reasons).map((message) => ({
    level: 'warning',
    message,
  }));
  // Non-empty input that produced nothing, with no other explanation → syntax.
  if (!css && reasons.size === 0) {
    diagnostics.push({ level: 'error', message: MSG.unparseable });
  }

  return { css, diagnostics };
};

/**
 * Sanitized CSS only — used at injection/export sinks that just need the safe
 * string. Diagnostics are surfaced separately via validateCustomCss.
 */
export const sanitizeCustomCss = (
  raw: string | undefined | null,
  scope = '.ProseMirror',
): string => validateCustomCss(raw, scope).css;
