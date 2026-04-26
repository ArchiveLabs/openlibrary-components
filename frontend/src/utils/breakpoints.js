// Central viewport breakpoint constants — single source of truth for all JS
// matchMedia checks and the _positionPanel thresholds in ol-search-bar.
//
// CSS media queries in component stylesheets must duplicate these numbers as
// literals (Lit template literals are not preprocessed), so changes here must
// be manually mirrored in the relevant @media blocks.
export const BREAKPOINTS = {
  mobile: 600,  // full-screen overlay threshold (JS + CSS @media)
  narrow: 785,  // icon-only trigger in header   (CSS @media only)
  wide:   900,  // panel right-align vs. centered (JS _positionPanel only)
};
