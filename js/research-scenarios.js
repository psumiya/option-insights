/**
 * Research Scenarios
 * The fixed cuts worth reviewing every time, as data. Adding one is an edit to
 * this array; nothing in the rendering path needs to change.
 *
 * Presets either span the whole account (underlying null) or target the
 * underlying with the most closed trades (RESEARCH_TOP_UNDERLYING), which the
 * panel resolves against the loaded dataset. "{underlying}" in a title is
 * replaced with that symbol.
 *
 * Each entry carries:
 *   id        stable identifier, also the localStorage value for the active chip
 *   title     chip label
 *   filter    { underlying, dteCut, structures } applied on click
 *   focus     id of the output section scrolled into view
 *   params    optional per-output parameters, merged over the panel defaults
 */

const RESEARCH_TOP_UNDERLYING = '*top';

// A null width list means: use the widths actually traded in the cut
const RESEARCH_SCENARIO_DEFAULTS = {
  widthBuckets: null,
  counterfactualWidths: null,
  concentrationTopN: [3, 5]
};

const RESEARCH_CREDIT_STRUCTURES = ['iron_condor', 'put_credit_spread', 'call_credit_spread'];

const RESEARCH_PRESETS = [
  {
    id: 'account_dte_buckets',
    title: 'Whole account by days to expiration',
    filter: { underlying: null, dteCut: 'all', structures: null },
    focus: 'dte-buckets'
  },
  {
    id: 'account_edge_check',
    title: 'Whole account edge check',
    filter: { underlying: null, dteCut: 'all', structures: null },
    focus: 'edge-check'
  },
  {
    id: 'account_direction_split',
    title: 'Whole account by direction and credit vs debit',
    filter: { underlying: null, dteCut: 'all', structures: null },
    focus: 'direction-split'
  },
  {
    id: 'top_0dte_time_of_day',
    title: '{underlying} 0DTE by time opened',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'zero', structures: null },
    focus: 'time-of-day'
  },
  {
    id: 'account_loss_concentration',
    title: 'Whole account loss concentration',
    filter: { underlying: null, dteCut: 'all', structures: null },
    focus: 'loss-concentration'
  },
  {
    id: 'top_0dte_all_structures',
    title: '{underlying} 0DTE — condors vs single-sided',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'zero', structures: RESEARCH_CREDIT_STRUCTURES },
    focus: 'calendar'
  },
  {
    id: 'top_0dte_condor_only',
    title: '{underlying} 0DTE iron condors only',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'zero', structures: ['iron_condor'] },
    focus: 'bar'
  },
  {
    id: 'top_condor_nonzero_dte',
    title: '{underlying} iron condors, excluding 0DTE',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'nonzero', structures: ['iron_condor'] },
    focus: 'bar'
  },
  {
    id: 'top_dte_buckets',
    title: '{underlying} by days to expiration',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'all', structures: null },
    focus: 'dte-buckets'
  },
  {
    id: 'top_condor_vs_single_side',
    title: '{underlying} condor vs single-sided, all DTE',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'all', structures: RESEARCH_CREDIT_STRUCTURES },
    focus: 'structure-split'
  },
  {
    id: 'top_put_spread_width_breakdown',
    title: '{underlying} put credit spread by width',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'all', structures: ['put_credit_spread'] },
    focus: 'width-breakdown'
  },
  {
    id: 'top_put_spread_width_counterfactual',
    title: '{underlying} put credit spread — uniform width',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'all', structures: ['put_credit_spread'] },
    focus: 'width-counterfactual'
  },
  {
    id: 'top_runs_test',
    title: '{underlying} streak check',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'all', structures: null },
    focus: 'runs-test'
  },
  {
    id: 'top_loss_concentration',
    title: '{underlying} loss concentration',
    filter: { underlying: RESEARCH_TOP_UNDERLYING, dteCut: 'all', structures: null },
    focus: 'loss-concentration'
  }
];

/**
 * The output sections, in render order. The trade-by-trade and calendar views
 * carry the headline picture and open by default; the tables and statistics are
 * opt-in so the tab does not land as a wall of numbers.
 */
const RESEARCH_SECTIONS = [
  { id: 'bar', title: 'Trade by trade', defaultExpanded: true },
  { id: 'calendar', title: 'Calendar by entry date', defaultExpanded: true },
  { id: 'dte-buckets', title: 'By days to expiration', defaultExpanded: false },
  { id: 'structure-split', title: 'Condor vs single-sided', defaultExpanded: false },
  { id: 'direction-split', title: 'Direction and credit vs debit', defaultExpanded: false },
  { id: 'time-of-day', title: 'By time opened and time held', defaultExpanded: false },
  { id: 'width-breakdown', title: 'By spread width', defaultExpanded: false },
  { id: 'width-counterfactual', title: 'Uniform-width counterfactual', defaultExpanded: false },
  { id: 'edge-check', title: 'Edge check', defaultExpanded: false },
  { id: 'runs-test', title: 'Streak check', defaultExpanded: false },
  { id: 'loss-concentration', title: 'Loss concentration', defaultExpanded: false }
];

if (typeof window !== 'undefined') {
  window.RESEARCH_PRESETS = RESEARCH_PRESETS;
  window.RESEARCH_SECTIONS = RESEARCH_SECTIONS;
  window.RESEARCH_SCENARIO_DEFAULTS = RESEARCH_SCENARIO_DEFAULTS;
  window.RESEARCH_TOP_UNDERLYING = RESEARCH_TOP_UNDERLYING;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RESEARCH_PRESETS,
    RESEARCH_SECTIONS,
    RESEARCH_SCENARIO_DEFAULTS,
    RESEARCH_TOP_UNDERLYING
  };
}
