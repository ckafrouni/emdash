/**
 * Shared layout constants. Single source of truth for sizes that need to be
 * referenced from both CSS (via the `--header-row-height` custom property
 * exposed below) and JS (e.g. react-resizable-panels' `collapsedSize`, which
 * parses pixel strings and does not accept `var(...)`).
 *
 * On import, this module overwrites the CSS variable so the default declared
 * in `index.css` (kept as a first-paint fallback) is kept in sync with the
 * value here.
 */
export const HEADER_ROW_HEIGHT_PX = 36;
export const HEADER_ROW_HEIGHT_CSS = `${HEADER_ROW_HEIGHT_PX}px`;

if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.style.setProperty('--header-row-height', HEADER_ROW_HEIGHT_CSS);
}
