/**
 * Ask Claude view
 * Suggested questions and a free-text box. Copy for Claude puts a summary of
 * the trades in the current filters, plus the question, on the clipboard and
 * opens claude.ai in a new tab. The site makes no request of its own: the
 * text only leaves the browser when the person pastes it.
 */
class AskClaudePanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }
    this.trades = [];
    this.scope = '';
    this.summary = null;
    this._build();
  }

  /**
   * Point the panel at the trades in the current view
   * The summary is rebuilt lazily, on copy or when the preview is open.
   * @param {Array} trades - Enriched trades after the report filters
   * @param {string} scope - Plain description of those filters
   */
  update(trades, scope) {
    if (!this.container) return;
    this.trades = trades || [];
    this.scope = scope || '';
    this.summary = null;

    const closed = this.trades.filter(trade => trade.Result !== 'Open').length;
    const open = this.trades.length - closed;
    const ready = this.trades.length > 0;

    this.countLine.textContent = ready
      ? `The summary covers ${closed} closed trade${closed === 1 ? '' : 's'}`
        + `${open ? ` and ${open} open position${open === 1 ? '' : 's'}` : ''}: ${this.scope}.`
      : 'Load trades, or change the filters above, to have something to ask about.';
    this.buttons.forEach(button => { button.disabled = !ready; });
    this._setStatus('');
    if (!ready) {
      this.preview.open = false;
      this.previewText.textContent = '';
      this.preview.querySelector('summary').textContent = 'See exactly what will be copied';
    } else if (this.preview.open) {
      this._renderPreview();
    }
  }

  _text() {
    if (this.summary === null) {
      this.summary = AiContext.build(this.trades, { scope: this.scope });
    }
    return AiContext.compose(this.question.value, this.summary);
  }

  _build() {
    const card = document.createElement('section');
    card.className = 'report-card ask-card';
    card.setAttribute('aria-labelledby', 'ask-title');
    card.innerHTML = `
      <div class="card-head">
        <h2 id="ask-title" class="card-title">Ask Claude</h2>
        <p class="card-sub">Pick a question or write your own. Copy for Claude puts a summary of the
          trades in the current filters, plus your question, on your clipboard and opens claude.ai in a
          new tab, ready to paste.</p>
      </div>
      <p class="ask-notice">Nothing leaves your browser until you paste it. What you paste goes to
        Anthropic under your own Claude account. The summary holds totals, breakdowns and your largest
        trades, never the CSV itself.</p>
      <div class="ask-questions" role="group" aria-label="Suggested questions"></div>
      <label class="ask-label" for="ask-question">Your question</label>
      <textarea id="ask-question" class="ask-question" rows="3"
        placeholder="For example: why did August go badly?"></textarea>
      <div class="ask-actions">
        <button type="button" class="btn-primary" data-ask="open">Copy for Claude</button>
        <button type="button" class="btn-secondary" data-ask="copy">Copy only</button>
        <span class="ask-status" role="status" aria-live="polite"></span>
      </div>
      <p class="ask-count"></p>
      <details class="ask-preview">
        <summary>See exactly what will be copied</summary>
        <pre class="ask-preview-text" tabindex="0"></pre>
      </details>
    `;
    this.container.replaceChildren(card);

    this.question = card.querySelector('.ask-question');
    this.status = card.querySelector('.ask-status');
    this.countLine = card.querySelector('.ask-count');
    this.preview = card.querySelector('.ask-preview');
    this.previewText = card.querySelector('.ask-preview-text');
    this.buttons = [...card.querySelectorAll('[data-ask]')];

    const chips = card.querySelector('.ask-questions');
    AiContext.QUESTIONS.forEach(item => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ask-chip';
      chip.textContent = item.label;
      chip.title = item.text;
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', () => {
        this.question.value = item.text;
        this._markChip(chip);
        this._setStatus('');
        if (this.preview.open) this._renderPreview();
      });
      chips.appendChild(chip);
    });
    this.chips = [...chips.children];

    this.question.addEventListener('input', () => {
      this._markChip(null);
      if (this.preview.open) this._renderPreview();
    });
    this.preview.addEventListener('toggle', () => {
      if (this.preview.open) this._renderPreview();
    });
    this.buttons.forEach(button => {
      button.addEventListener('click', () => this._copy(button.dataset.ask === 'open'));
    });

    this.update([], '');
  }

  _markChip(active) {
    this.chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip === active)));
  }

  _renderPreview() {
    if (!this.trades.length) {
      this.previewText.textContent = '';
      return;
    }
    const text = this._text();
    this.previewText.textContent = text;
    this.preview.querySelector('summary').textContent =
      `See exactly what will be copied (${text.length.toLocaleString()} characters)`;
  }

  _setStatus(message, tone = '') {
    this.status.textContent = message;
    this.status.className = `ask-status${tone ? ` ask-status-${tone}` : ''}`;
  }

  /**
   * Copy the full text, and optionally open claude.ai
   * The clipboard write starts while the click still counts as a user
   * gesture and before the new tab takes focus; the tab opens in the same
   * gesture so popup blockers allow it.
   */
  _copy(openClaude) {
    if (!this.trades.length) return;
    if (!this.question.value.trim()) {
      this._setStatus('Pick a question or write your own first.', 'warn');
      this.question.focus();
      return;
    }

    const text = this._text();
    const write = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(text)
      : Promise.reject(new Error('Clipboard unavailable'));
    if (openClaude) window.open('https://claude.ai/new', '_blank', 'noopener');

    write.then(
      () => this._setStatus(openClaude
        ? 'Copied. Paste it into the new Claude tab.'
        : 'Copied. Paste it into Claude.', 'ok'),
      () => this._copyByHand()
    );
  }

  /** The browser refused the clipboard: show the text selected, ready for Cmd+C. */
  _copyByHand() {
    this.preview.open = true;
    this._renderPreview();
    const range = document.createRange();
    range.selectNodeContents(this.previewText);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    this.previewText.focus();
    this._setStatus('Your browser blocked the clipboard. The text is selected below: press Cmd+C or Ctrl+C.', 'warn');
  }
}

if (typeof window !== 'undefined') {
  window.AskClaudePanel = AskClaudePanel;
}
