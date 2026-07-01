/**
 * Chrome wrapping: visual marking applied to renderers based on
 * evidence.grade and output_register declared in the plugin manifest.
 *
 * Per v3 §3.5 and §7.4:
 *   - research-grade content always wears research-grade chrome
 *   - inferential outputs always wear "interpretive — reviewer's read primary" chrome
 *   - self-comparative outputs wear "comparative" chrome
 *   - descriptive + clinical grade renders plain
 *
 * Two surfaces:
 *
 *   - `wrapWithChrome(Component, chrome)` — HOC that wraps a renderer with
 *     full-width banner stripes. Use when the chrome should dominate the
 *     surface (e.g. an entire pane that's purely inferential and the
 *     clinician needs an unmissable warning).
 *
 *   - `<ChromeBadge evidenceGrade="…" outputRegister="…" />` — small inline
 *     tags the plugin can place anywhere in its own header (next to a
 *     title, at the right end of a toolbar, etc.). Use when the plugin
 *     wants to match the visual layout of a built-in pane and the
 *     full-banner chrome would break that parity.
 *
 * Both read the same evidence/register declared in the manifest, so the
 * clinical signaling is identical — only the visual treatment differs.
 */

import type { ComponentType, CSSProperties } from 'react';
import type { EvidenceGrade, OutputRegister } from './registry';

export interface ChromeProps {
  evidenceGrade: EvidenceGrade;
  outputRegister: OutputRegister;
}

/* Plugin chrome must propagate the parent pane's height so wrapped
 * renderers can use ``h-full`` / ``flex-1`` to reach uPlot canvases
 * and other height-sensitive children. ``PaneShell`` mounts the
 * wrapped component into a ``flex-1 min-h-0 overflow-hidden`` block,
 * but that block isn't a flex container itself — block children
 * default to content-driven height, which collapses ``flex-1`` inside
 * the renderer. The chrome wrapper applies a flex column that fills
 * the pane cell and lets its single child stretch through the chain.
 *
 * #542 introduced the same fix for research-grade chrome (banner
 * case); ``CHROME_BASE_CLASSES`` extends it to the no-banner /
 * clinical case so HRV TimeResolvedHrv (the first clinical-grade
 * plugin) can flex-fill its uPlot canvases. Both class sets share
 * the same height behavior — they only differ in visual chrome. */
const CHROME_BASE_CLASSES = 'flex h-full w-full flex-col overflow-hidden';
const RESEARCH_GRADE_CLASSES = `${CHROME_BASE_CLASSES} rounded-md border border-border-subtle bg-surface-overlay`;

const BANNER_BASE =
  'flex items-center gap-2 border-b border-border-subtle px-3 py-1.5 font-medium uppercase tracking-wider';
const BANNER_INLINE_STYLE: CSSProperties = { fontSize: 'var(--workstation-font-meta)' };

export function wrapWithChrome<P extends object>(
  Component: ComponentType<P>,
  chrome: ChromeProps,
): ComponentType<P> {
  const isResearch = chrome.evidenceGrade === 'research';
  const isInferential = chrome.outputRegister === 'inferential';
  const isComparative = chrome.outputRegister === 'self-comparative';
  const showBanner = isResearch || isInferential || isComparative;

  return function ChromeWrapped(props: P) {
    return (
      <div
        className={showBanner ? RESEARCH_GRADE_CLASSES : CHROME_BASE_CLASSES}
        data-evidence={chrome.evidenceGrade}
        data-register={chrome.outputRegister}
      >
        {isResearch && (
          <div
            className={`${BANNER_BASE} bg-surface-inset text-text-secondary`}
            style={BANNER_INLINE_STYLE}
            data-banner="research-grade"
          >
            {/* TODO(ds-extraction): rounded-full → rounded-round once @coherence/design-system is extracted and the recorder consumes it (see README "Design system"). */}
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-text-secondary/60" />
            <span>research-grade</span>
          </div>
        )}
        {isInferential && (
          <div
            className={`${BANNER_BASE} bg-surface-inset text-text-secondary`}
            style={BANNER_INLINE_STYLE}
            data-banner="inferential"
          >
            <span>interpretive — reviewer&apos;s read primary</span>
          </div>
        )}
        {isComparative && (
          <div
            className={`${BANNER_BASE} bg-surface-inset text-text-secondary`}
            style={BANNER_INLINE_STYLE}
            data-banner="comparative"
          >
            <span>comparative — reference invoked</span>
          </div>
        )}
        {/* Inner wrapper also flex-fills so the wrapped component's
         *  h-full reaches the bottom of the cell. ``flex flex-col``
         *  on top of ``flex-1 min-h-0`` is what lets the wrapped
         *  renderer's own flex column children stretch — without it,
         *  the inner wrapper is a flex *item* but not a flex
         *  *container* for its own children. p-3 padding only applies
         *  when the banner is present so research/comparative banners
         *  visually inset their surface. */}
        <div
          className={
            showBanner
              ? 'flex flex-col flex-1 min-h-0 p-3'
              : 'flex flex-col flex-1 min-h-0'
          }
        >
          <Component {...props} />
        </div>
      </div>
    );
  };
}

/* ------------------------------------------------------------------ */
/*  Inline ChromeBadge — for plugins that build their own header       */
/* ------------------------------------------------------------------ */

export interface ChromeBadgeProps {
  evidenceGrade: EvidenceGrade;
  outputRegister: OutputRegister;
  /** Optional extra classes on the wrapping span. */
  className?: string;
}

interface BadgeSpec {
  label: string;
  title: string;
}

function specsFor(
  evidenceGrade: EvidenceGrade,
  outputRegister: OutputRegister,
): BadgeSpec[] {
  const out: BadgeSpec[] = [];
  if (evidenceGrade === 'research') {
    out.push({
      label: 'research',
      title: 'Research-grade — not for sole clinical decision',
    });
  } else if (evidenceGrade === 'clinical-pending') {
    out.push({
      label: 'pending',
      title: 'Clinical-pending — under editorial review',
    });
  }
  if (outputRegister === 'inferential') {
    out.push({
      label: 'interpretive',
      title:
        "Interpretive — reviewer's read primary; this view goes beyond the recording",
    });
  } else if (outputRegister === 'self-comparative') {
    out.push({
      label: 'comparative',
      title: 'Comparative — reference invoked',
    });
  }
  return out;
}

/**
 * Compact inline badges for evidence-grade / output-register signaling.
 * Renders nothing for descriptive + clinical (the SDK convention for
 * "no chrome needed").
 *
 * Color comes from the host's `--accent-primary` design token so it
 * picks up the user's theme automatically. The tooltip on hover carries
 * the long-form clinical caveat.
 */
export function ChromeBadge({
  evidenceGrade,
  outputRegister,
  className,
}: ChromeBadgeProps) {
  const specs = specsFor(evidenceGrade, outputRegister);
  if (specs.length === 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 ${className ?? ''}`.trim()}
      data-evidence={evidenceGrade}
      data-register={outputRegister}
    >
      {specs.map((s) => (
        <span
          key={s.label}
          title={s.title}
          className="inline-flex items-center rounded px-1.5 py-px font-medium uppercase tracking-wider"
          style={{
            fontSize: 'var(--workstation-font-meta)',
            color: 'var(--accent-primary, #d97706)',
            border: '1px solid var(--accent-primary, #d97706)',
            background: 'transparent',
          }}
        >
          {s.label}
        </span>
      ))}
    </span>
  );
}
