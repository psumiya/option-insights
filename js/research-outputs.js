/**
 * Research Outputs
 * The renderers behind each Research tab section. Every one is driven entirely
 * by what ResearchAnalytics returns: no output recomputes a number, and no
 * output states a verdict on a statistic. The question is named; the figures
 * stand on their own.
 */

const ResearchOutputs = (function () {
  // Short cell codes for the calendar, keyed on the dashboard's display labels
  const STRUCTURE_CODES = {
    'Iron Condor': 'IC',
    'Bull Put Spread': 'P',
    'Put Credit Spread': 'P',
    'Bear Call Spread': 'C',
    'Call Credit Spread': 'C',
    Mixed: 'MIX'
  };

  // Column order shared by every win/loss table
  const STAT_COLUMNS = [
    { key: 'n', label: 'Trades', format: 'int' },
    { key: 'winRate', label: 'Win rate', format: 'percent' },
    { key: 'avgWin', label: 'Avg win', format: 'currency' },
    { key: 'avgLoss', label: 'Avg loss', format: 'currency' },
    { key: 'breakevenWinRate', label: 'Breakeven win rate', format: 'percent' },
    { key: 'net', label: 'Net P/L', format: 'currency' },
    { key: 'worst', label: 'Worst', format: 'currency' },
    { key: 'expectancy', label: 'Expectancy', format: 'currency' }
  ];

  // ===== formatting =====

  function currency(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${sign}$${abs}`;
  }

  function percent(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return `${value.toFixed(1)}%`;
  }

  function integer(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return String(value);
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function signedCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return value > 0 ? `+${currency(value)}` : currency(value);
  }

  function format(value, kind) {
    if (kind === 'currency') return currency(value);
    if (kind === 'signedCurrency') return signedCurrency(value);
    if (kind === 'percent') return percent(value);
    if (kind === 'text') return value === null || value === undefined ? '—' : String(value);
    return integer(value);
  }

  function plClass(value) {
    if (value === null || value === undefined || isNaN(value) || value === 0) return '';
    return value > 0 ? 'research-positive' : 'research-negative';
  }

  function structureCode(label) {
    if (!label) return null;
    return STRUCTURE_CODES[label] || label.slice(0, 3).toUpperCase();
  }

  // ===== building blocks =====

  /**
   * A note explaining what an output leaves out or how to read it. Appended
   * beneath the panel's own caption, which cannot know per-output exclusions.
   */
  function appendNote(container, text) {
    if (!text) return;
    const note = document.createElement('p');
    note.className = 'research-output-note';
    note.textContent = text;
    container.appendChild(note);
  }

  function appendEmpty(container, text) {
    const empty = document.createElement('p');
    empty.className = 'research-empty';
    empty.textContent = text;
    container.appendChild(empty);
  }

  /**
   * Rows-by-metrics table
   * @param {HTMLElement} container - Target element
   * @param {Object} options - { rowLabel, rows, columns }
   *   rows: [{ label, stats }]
   */
  function renderStatTable(container, options) {
    const columns = options.columns || STAT_COLUMNS;

    const head = `
      <tr>
        <th scope="col">${options.rowLabel}</th>
        ${columns.map(column => `<th scope="col">${column.label}</th>`).join('')}
      </tr>
    `;

    const body = options.rows.map(row => `
      <tr>
        <th scope="row">${row.label}</th>
        ${columns.map(column => {
          const value = row.stats[column.key];
          const emphasise = column.key === 'net' || column.key === 'expectancy' || column.key === 'delta';
          return `<td class="${emphasise ? plClass(value) : ''}">${format(value, column.format)}</td>`;
        }).join('')}
      </tr>
    `).join('');

    const wrapper = document.createElement('div');
    wrapper.className = 'research-table-scroll';
    wrapper.innerHTML = `
      <table class="data-table research-table" role="table">
        <thead>${head}</thead>
        <tbody>${body}</tbody>
      </table>
    `;
    container.appendChild(wrapper);
  }

  /**
   * Labelled figure list for a single statistic
   * @param {HTMLElement} container - Target element
   * @param {Object} options - { question, rows, note }
   */
  function renderStatBlock(container, options) {
    const block = document.createElement('div');
    block.className = 'research-stat-block';

    const rows = (options.rows || []).map(row => `
      <div class="research-stat-row">
        <span class="research-stat-label">${row.label}</span>
        <span class="research-stat-value ${row.emphasise ? plClass(row.raw) : ''}">${row.value}</span>
      </div>
    `).join('');

    block.innerHTML = `
      <p class="research-stat-question">${options.question}</p>
      <div class="research-stat-rows">${rows}</div>
      ${options.note ? `<p class="research-stat-note">${options.note}</p>` : ''}
    `;
    container.appendChild(block);
  }

  /**
   * The three figures above the bar chart, from barSeries' own aggregates so
   * they cannot drift from the bars beneath them
   */
  function renderSummaryTiles(container, series) {
    const tiles = [
      { label: 'Net P/L', value: currency(series.net), raw: series.net },
      { label: 'Avg P/L per trade', value: currency(series.avgPerTrade), raw: series.avgPerTrade },
      { label: 'Trades', value: integer(series.n), raw: null }
    ];

    const row = document.createElement('div');
    row.className = 'research-tiles';
    row.innerHTML = tiles.map(tile => `
      <div class="research-tile">
        <div class="research-tile-label">${tile.label}</div>
        <div class="research-tile-value ${tile.raw === null ? '' : plClass(tile.raw)}">${tile.value}</div>
      </div>
    `).join('');
    container.appendChild(row);
  }

  // ===== section renderers =====

  function renderCalendar(container, context, state) {
    const series = ResearchAnalytics.calendarSeries(context.trades);

    if (!series.length) {
      appendEmpty(container, 'No dated closed trades in this cut.');
      return;
    }

    appendNote(container,
      'Dated by entry, so a day carries what the positions opened that day went on to return.');

    // The calendar pages one month at a time and sizes its 5×5 grid to the
    // tighter of the host's width and height
    const host = document.createElement('div');
    host.className = 'research-calendar-host';
    host.id = 'research-calendar-chart';
    container.appendChild(host);

    // Reuse the dashboard's calendar rather than adding a second one
    state.calendar = new HeatmapCalendarChart('research-calendar-chart');
    state.calendar.update(series.map(row => ({
      date: row.date,
      pl: row.net,
      tradeCount: row.n,
      label: structureCode(row.category)
    })));
  }

  function renderBar(container, context, state) {
    const series = ResearchAnalytics.barSeries(context.trades);

    renderSummaryTiles(container, series);

    const host = document.createElement('div');
    host.className = 'research-bar-host';
    host.id = 'research-bar-chart';
    container.appendChild(host);

    state.bar = new ResearchBarChart('research-bar-chart', series);

    if (series.n > 150) {
      appendNote(container,
        'Only the best and worst trade are labelled at this many bars; hover any bar for its figures.');
    }
  }

  function renderDteBuckets(container, context) {
    const buckets = ResearchAnalytics.dteBucketStats(context.trades);
    const ids = Object.keys(buckets);

    if (!ids.length) {
      appendEmpty(container, 'No trades in this cut carry a days-to-expiration value.');
      return;
    }

    renderStatTable(container, {
      rowLabel: 'Days to expiration',
      rows: ids.map(id => ({ label: id, stats: buckets[id] }))
    });
  }

  function renderStructureSplit(container, context) {
    const split = ResearchAnalytics.condorVsSingleSide(context.trades);

    renderStatTable(container, {
      rowLabel: 'Structure',
      rows: Object.keys(split).map(structure => ({
        label: ResearchAnalytics.structureLabel(structure),
        stats: split[structure]
      }))
    });

    appendNote(container,
      'A structure with no trades is listed with a zero count rather than hidden.');
  }

  const SIDE_LABELS = {
    bullish: 'Bullish',
    bearish: 'Bearish',
    neutral: 'Neutral',
    credit: 'Credit (sold premium)',
    debit: 'Debit (bought premium)',
    'bullish-credit': 'Bullish, credit',
    'bullish-debit': 'Bullish, debit',
    'bearish-credit': 'Bearish, credit',
    'bearish-debit': 'Bearish, debit'
  };

  function sideRows(groups) {
    return Object.keys(groups).map(key => ({ label: SIDE_LABELS[key] || key, stats: groups[key] }));
  }

  function unclassifiedText(entries, what) {
    if (!entries.length) return null;
    const total = entries.reduce((count, entry) => count + entry.n, 0);
    const labels = entries.map(entry => `${entry.label} ${entry.n}`).join(', ');
    return `${total} trade${total === 1 ? '' : 's'} left out of ${what}, `
      + `since the strategy alone does not say: ${labels}.`;
  }

  function appendSubheading(container, text) {
    const heading = document.createElement('p');
    heading.className = 'research-output-lead';
    heading.textContent = text;
    container.appendChild(heading);
  }

  function renderDirectionSplit(container, context) {
    if (!context.trades.length) {
      appendEmpty(container, 'No closed trades in this cut.');
      return;
    }

    const split = ResearchAnalytics.directionSplit(context.trades);

    appendSubheading(container, 'By market view');
    renderStatTable(container, { rowLabel: 'Direction', rows: sideRows(split.byDirection) });

    appendSubheading(container, 'By premium');
    renderStatTable(container, { rowLabel: 'Premium', rows: sideRows(split.byPremium) });

    appendSubheading(container, 'Directional trades by premium');
    renderStatTable(container, { rowLabel: 'Direction and premium', rows: sideRows(split.byDirectionAndPremium) });

    appendNote(container,
      'Direction and premium come from the strategy name. A group with no trades is listed '
      + 'with a zero count rather than hidden.');
    appendNote(container, unclassifiedText(split.unclassifiedDirection, 'the direction table'));
    appendNote(container, unclassifiedText(split.unclassifiedPremium, 'the premium tables'));
  }

  function renderTimeOfDay(container, context) {
    const entry = ResearchAnalytics.entryTimeStats(context.trades);
    const hold = ResearchAnalytics.holdTimeStats(context.trades);

    if (entry.excludedNoTime === context.trades.length) {
      appendEmpty(container, context.trades.length
        ? 'This export records trade dates without times of day, so there is nothing to split by time. '
          + 'TastyTrade exports carry times.'
        : 'No closed trades in this cut.');
      return;
    }

    appendSubheading(container, 'By time opened (New York time)');
    renderStatTable(container, {
      rowLabel: 'Opened',
      rows: entry.windows.map(window => ({ label: window.label, stats: entry.byWindow[window.id] }))
    });

    appendSubheading(container, 'Time opened, credit against debit');
    const premiumRows = [];
    entry.windows.forEach(window => {
      ['credit', 'debit'].forEach(premium => {
        const stats = entry.byWindowAndPremium[`${window.id}-${premium}`];
        if (stats.n) premiumRows.push({ label: `${window.label}, ${premium}`, stats });
      });
    });
    if (premiumRows.length) {
      renderStatTable(container, { rowLabel: 'Opened and premium', rows: premiumRows });
    } else {
      appendNote(container, 'No trade in this cut has a strategy that says credit or debit.');
    }

    appendSubheading(container, 'By time held');
    renderStatTable(container, {
      rowLabel: 'Held',
      rows: hold.buckets.map(bucket => ({ label: bucket.label, stats: hold.byBucket[bucket.id] }))
    });

    appendNote(container,
      'Windows and the same-day boundary use New York time, wherever you are. A window or holding '
      + 'period with no trades is listed with a zero count; the credit and debit table lists only '
      + 'pairs that occur, and leaves out strategies whose name does not say which side they are.');
    if (entry.excludedNoTime) {
      appendNote(container,
        `${entry.excludedNoTime} trade${entry.excludedNoTime === 1 ? '' : 's'} left out of the time-opened tables (no time of day recorded).`);
    }
    if (hold.excludedNoTime) {
      appendNote(container,
        `${hold.excludedNoTime} trade${hold.excludedNoTime === 1 ? '' : 's'} left out of the time-held table (no time of day at entry or exit).`);
    }
  }

  // A width is a count of the underlying's strike points, so $5 wide on a $40
  // stock and on SPX are different trades and cannot be pooled
  function requireOneUnderlying(container, context) {
    if (context.filter.underlying) return true;
    appendEmpty(container, 'Spread width is measured in each underlying’s own strike points, '
      + 'so widths only compare within one underlying. Pick an underlying above.');
    return false;
  }

  function renderWidthBreakdown(container, context) {
    if (!requireOneUnderlying(container, context)) return;
    const widths = context.params.widthBuckets
      || ResearchAnalytics.commonWidths(context.trades, 3);
    const result = ResearchAnalytics.widthBreakdown(context.trades, widths);
    const buckets = Object.keys(result.byBucket);

    if (!buckets.some(bucket => result.byBucket[bucket].n)) {
      appendEmpty(container, 'No trades in this cut have a spread width.');
      return;
    }

    renderStatTable(container, {
      rowLabel: 'Spread width',
      rows: buckets.map(bucket => ({ label: bucket, stats: result.byBucket[bucket] })),
      columns: STAT_COLUMNS.concat([
        { key: 'avgCreditCollected', label: 'Avg credit at open', format: 'currency' }
      ])
    });

    appendNote(container,
      'A bucket with no trades is listed with a zero count rather than hidden. '
      + `Any width other than ${widths.join(', ')} falls into Other.`);

    if (result.excludedNoWidth) {
      appendNote(container,
        `${result.excludedNoWidth} trade${result.excludedNoWidth === 1 ? '' : 's'} excluded (no spread width).`);
    }
  }

  function renderWidthCounterfactual(container, context) {
    if (!requireOneUnderlying(container, context)) return;
    const widths = context.params.counterfactualWidths
      || ResearchAnalytics.commonWidths(context.trades, 4);
    const result = ResearchAnalytics.widthCounterfactual(context.trades, widths);

    if (!result.actualN) {
      appendEmpty(container, 'No trades in this cut have a spread width to rescale.');
      return;
    }

    // Every scenario rescales the same trades, so the count is stated once
    // here rather than repeated on each row
    const tradesText = `${result.actualN} trade${result.actualN === 1 ? '' : 's'}`;
    const lead = document.createElement('p');
    lead.className = 'research-output-lead';
    lead.textContent = `What the same ${tradesText} would have netted had each been opened `
      + 'at a single spread width, compared with what they actually netted.';
    container.appendChild(lead);

    const rows = [{
      label: `Actual (avg width ${result.actualAvgWidth})`,
      stats: { net: result.actualNet, delta: null }
    }].concat(widths.map(width => ({
      label: `All at width ${width}`,
      stats: { net: result.byWidth[width], delta: round2(result.byWidth[width] - result.actualNet) }
    })));

    renderStatTable(container, {
      rowLabel: 'Scenario',
      rows: rows,
      columns: [
        { key: 'net', label: 'Net P/L', format: 'currency' },
        { key: 'delta', label: 'vs actual', format: 'signedCurrency' }
      ]
    });

    appendNote(container,
      'A linear approximation: each trade’s P/L is scaled by target width over actual width, '
      + 'which holds for max-loss outcomes and overstates partial ones. Win or loss and date are held fixed.');

    if (result.excludedNoWidth) {
      appendNote(container,
        `${result.excludedNoWidth} trade${result.excludedNoWidth === 1 ? '' : 's'} excluded (no spread width).`);
    }
  }

  function renderRunsTest(container, context) {
    const result = ResearchAnalytics.runsTest(context.trades);

    const rows = [
      { label: 'Trades', value: integer(result.n) },
      { label: 'Wins', value: integer(result.wins) },
      { label: 'Losses', value: integer(result.losses) },
      { label: 'Observed runs', value: integer(result.runs) },
      { label: 'Expected runs', value: result.expectedRuns === null ? '—' : result.expectedRuns.toFixed(1) },
      { label: 'z', value: result.z === null ? '—' : result.z.toFixed(2) },
      { label: 'p (two-sided)', value: result.p === null ? '—' : result.p.toFixed(3) }
    ];

    renderStatBlock(container, {
      question: 'Do wins and losses cluster into streaks more than chance would produce?',
      rows: rows,
      note: result.note
    });
  }

  function renderLossConcentration(container, context) {
    const counts = context.params.concentrationTopN;
    const result = ResearchAnalytics.lossConcentration(context.trades, counts);

    const rows = [
      { label: 'Losing trades', value: integer(result.nLosses) },
      { label: 'Total losses', value: currency(result.totalLoss), raw: result.totalLoss, emphasise: true }
    ].concat(counts.map(n => ({
      label: `Share carried by the largest ${n}`,
      value: result.shares[n] === undefined ? '—' : percent(result.shares[n])
    })));

    renderStatBlock(container, {
      question: 'Are the losses spread across the book or carried by a few trades?',
      rows: rows,
      note: result.note
    });
  }

  const EDGE_VERDICTS = {
    positive: 'Edge',
    negative: 'Losing',
    unclear: 'Can’t tell yet'
  };

  function edgeStats(row) {
    return {
      n: row.n,
      expectancy: row.expectancy,
      t: row.t === null ? null : row.t.toFixed(2),
      range: row.ciLow === null ? null : `${currency(row.ciLow)} to ${currency(row.ciHigh)}`,
      verdict: row.verdict ? EDGE_VERDICTS[row.verdict] : 'Too few trades'
    };
  }

  function renderEdgeCheck(container, context) {
    const result = ResearchAnalytics.edgeCheck(context.trades);

    if (!result.overall.n) {
      appendEmpty(container, 'No closed trades in this cut.');
      return;
    }

    const lead = document.createElement('p');
    lead.className = 'research-output-lead';
    lead.textContent = 'Is the average P/L per trade above zero by more than chance would '
      + 'produce, or could this many trades have landed here by luck?';
    container.appendChild(lead);

    // Strategy labels can come straight from a generic CSV, and the table is built as HTML
    const escape = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
    const rows = [{ label: result.overall.label, stats: edgeStats(result.overall) }];
    if (result.byStrategy.length > 1) {
      result.byStrategy.forEach(row => rows.push({ label: escape(row.label), stats: edgeStats(row) }));
    }

    renderStatTable(container, {
      rowLabel: 'Group',
      rows: rows,
      columns: [
        { key: 'n', label: 'Trades', format: 'int' },
        { key: 'expectancy', label: 'Avg P/L per trade', format: 'currency' },
        { key: 'range', label: 'Likely range of the average', format: 'text' },
        { key: 't', label: 't', format: 'text' },
        { key: 'verdict', label: 'Verdict', format: 'text' }
      ]
    });

    appendNote(container,
      'The likely range resamples these trades 2,000 times and keeps the middle 95% of the averages. '
      + 'Entirely above zero reads as an edge, entirely below as a losing pattern, and a range that '
      + 'straddles zero means this sample cannot separate skill from luck. t is the average over its '
      + 'standard error, where about 2 or more is the usual bar. '
      + `Groups under ${result.minTrades} closed trades get no verdict.`);

    appendNote(container,
      'Both assume each trade is independent of the others. Same-day trades on one underlying '
      + 'share a market move, so treat a narrow edge on clustered trades with caution.');
  }

  /**
   * Attach every renderer to a panel
   * @param {ResearchPanel} panel - The panel to register against
   */
  function register(panel) {
    // Chart instances outlive a single render pass and must be torn down when
    // their section re-renders, or each filter change leaks an observer
    const state = {};

    const teardown = key => {
      if (state[key] && state[key].destroy) state[key].destroy();
      state[key] = null;
    };

    panel.registerRenderer('calendar', (container, context) => {
      teardown('calendar');
      renderCalendar(container, context, state);
    });

    panel.registerRenderer('bar', (container, context) => {
      teardown('bar');
      renderBar(container, context, state);
    });

    panel.registerRenderer('dte-buckets', renderDteBuckets);
    panel.registerRenderer('structure-split', renderStructureSplit);
    panel.registerRenderer('direction-split', renderDirectionSplit);
    panel.registerRenderer('time-of-day', renderTimeOfDay);
    panel.registerRenderer('width-breakdown', renderWidthBreakdown);
    panel.registerRenderer('width-counterfactual', renderWidthCounterfactual);
    panel.registerRenderer('edge-check', renderEdgeCheck);
    panel.registerRenderer('runs-test', renderRunsTest);
    panel.registerRenderer('loss-concentration', renderLossConcentration);
  }

  return {
    register,
    renderStatTable,
    renderStatBlock,
    renderSummaryTiles,
    structureCode,
    STAT_COLUMNS
  };
})();

if (typeof window !== 'undefined') {
  window.ResearchOutputs = ResearchOutputs;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResearchOutputs;
}
