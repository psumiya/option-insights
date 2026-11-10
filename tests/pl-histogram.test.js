/**
 * Trade P/L histogram: binning and the caption figures
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const Chart = new Function(
  `${readFileSync(join(repoRoot, 'js/visualizations/pl-histogram-chart.js'), 'utf8')}\nreturn PLHistogramChart;`
)();

const text = summary => Chart.captionParts(summary).map(part => part.text).join('');

test('niceStep rounds up to 1, 2, 2.5 or 5 times a power of ten', () => {
  assert.strictEqual(Chart.niceStep(7), 10);
  assert.strictEqual(Chart.niceStep(23), 25);
  assert.strictEqual(Chart.niceStep(41), 50);
  assert.strictEqual(Chart.niceStep(120), 200);
});

test('every trade lands in exactly one bin', () => {
  const values = [-2500, -400, -120, -30, -5, 0, 4, 15, 40, 60, 90, 130, 210, 1400];
  const summary = Chart.summarize(values, { tailPercentile: 0.1 });
  const counted = summary.bins.reduce((total, bin) => total + bin.count, 0);
  assert.strictEqual(counted, values.length);
});

test('bins align to zero, so none mixes wins and losses', () => {
  const values = Array.from({ length: 200 }, (_, i) => (i % 2 ? 1 : -1) * (i * 3.7));
  const summary = Chart.summarize(values);
  summary.bins.filter(bin => bin.kind === 'regular').forEach(bin => {
    assert.ok(bin.x1 <= 0 || bin.x0 >= 0, `bin ${bin.x0}..${bin.x1} straddles zero`);
  });
});

test('outliers past the tails go to edge bins instead of stretching the axis', () => {
  const values = [...Array.from({ length: 98 }, (_, i) => i - 49), -5000, 5000];
  const summary = Chart.summarize(values);
  const under = summary.bins.find(bin => bin.kind === 'under');
  const over = summary.bins.find(bin => bin.kind === 'over');
  assert.deepStrictEqual(under.values, [-5000]);
  assert.deepStrictEqual(over.values, [5000]);
  assert.ok(summary.high - summary.low < 200, 'regular range stays near the bulk of trades');
});

test('caption quotes median, average win and loss, and the worst trades share', () => {
  // 30 wins of +100, 10 losses of -300, 1 scratch
  const values = [...Array(30).fill(100), ...Array(10).fill(-300), 0];
  const summary = Chart.summarize(values);
  assert.strictEqual(summary.avgWin, 100);
  assert.strictEqual(summary.avgLoss, -300);
  assert.strictEqual(summary.worstTotal, -3000);
  assert.strictEqual(text(summary),
    'Median trade +$100.00. Average win +$100.00, average loss -$300.00. '
    + 'Your 10 worst trades lost $3,000.00, 100% of gross wins.');
});

test('small sets skip the worst-trades sentence and tiny ones yield nothing', () => {
  const summary = Chart.summarize([10, -20, 30, -40, 50, 60]);
  assert.strictEqual(summary.worstShareOfWins, null);
  assert.ok(!/worst/.test(text(summary)));
  assert.strictEqual(Chart.summarize([1, 2, 3]), null);
  assert.deepStrictEqual(Chart.captionParts(null), []);
});
