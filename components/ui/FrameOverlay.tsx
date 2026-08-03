/*
 * The inset frame the whole site sits inside.
 *
 * Drawn as one fixed, non-interactive layer rather than as a padded wrapper
 * around the content. That distinction matters: a real container with padding
 * or `overflow` would become the containing block for the sticky hero panels
 * and quietly break the entire scroll engine. As an overlay it costs one
 * composited layer and touches nothing.
 *
 * The huge spread box-shadow paints `--bg-deep` across everything outside the
 * frame rectangle, which is what makes the backdrop show through around it.
 */
export function FrameOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-40 border border-line"
      style={{
        inset: "var(--frame-inset)",
        borderRadius: "var(--radius)",
        boxShadow: "0 0 0 100vmax var(--bg-deep)",
      }}
    />
  );
}
