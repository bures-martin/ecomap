/**
 * On a phone, a place's details slide up from the bottom and cover part of
 * the map instead of all of it, so the place itself stays in view above them.
 * The panel and the map both use this, so the map knows how much is covered.
 */
export const DETAILS_SHEET_SHARE = 0.6;

export function detailsSheetHeight(viewportHeight: number): number {
  return Math.round(viewportHeight * DETAILS_SHEET_SHARE);
}
