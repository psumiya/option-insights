/**
 * Report navigation: sticky offsets, the chapter rail with scrollspy, and
 * lazy chart rendering.
 */

/**
 * Defers a chart render until its container is on screen with a real size.
 * Charts measure their container when they draw, so drawing one inside a
 * hidden view or far below the fold gives it a zero or stale width.
 */
class LazyRenderer {
  constructor(rootMargin = '400px') {
    this.jobs = new Map();
    this.visible = new Set();
    this.observed = new WeakSet();
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.visible.add(entry.target);
          this._run(entry.target);
        } else {
          this.visible.delete(entry.target);
        }
      });
    }, { rootMargin: `${rootMargin} 0px` });
  }

  schedule(element, render) {
    if (!element) return;
    if (!this.observed.has(element)) {
      this.observer.observe(element);
      this.observed.add(element);
    }
    this.jobs.set(element, render);
    if (this.visible.has(element)) this._run(element);
  }

  _run(element) {
    const render = this.jobs.get(element);
    if (!render || element.offsetWidth === 0) return;
    this.jobs.delete(element);
    try {
      render();
    } catch (error) {
      console.error(`Render failed for #${element.id}:`, error);
    }
  }
}

class ReportNav {
  constructor() {
    this.header = document.getElementById('main-header');
    this.toolbar = document.getElementById('dashboard-toolbar');
    this.rail = document.getElementById('report-rail');
    this.chapters = Array.from(document.querySelectorAll('.report-chapter'));
    this.links = Array.from(document.querySelectorAll('.rail-link'));
    this.active = null;
    this.ticking = false;
    this.pendingChapter = HashState.read().chapter;
  }

  /** Jump to the chapter named in the URL once the report has content. */
  restoreChapter() {
    const chapter = this.pendingChapter;
    if (!chapter) return;
    const target = document.getElementById(`ch-${chapter}`);
    this.pendingChapter = null;
    if (!target || target.offsetParent === null) return;
    this._scrollToChapter(target, 'auto');
    this._setActive(chapter);
  }

  initialize() {
    this.links.forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        this._scrollToChapter(target);
        this._setActive(link.dataset.chapter);
      });
    });

    const onScroll = () => {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        this._syncOffsets();
        this._spy();
        this.ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (this.header) new ResizeObserver(onScroll).observe(this.header);

    onScroll();
  }

  /**
   * The header collapses into its sticky compact form once the page scrolls,
   * which changes the offset mid-flight, so re-aim once the scroll settles.
   */
  _scrollToChapter(target, behavior = 'smooth') {
    const gap = 16;
    const aim = behavior => {
      this._syncOffsets();
      const top = target.getBoundingClientRect().top + window.scrollY - this.offset - gap;
      window.scrollTo({ top, behavior });
    };
    aim(behavior);

    // scrollend never fires when nothing moved, so a timeout bounds the wait
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('scrollend', settle);
      // The header animates into compact mode over 300ms; measure after it lands
      setTimeout(() => {
        this._syncOffsets();
        const drift = target.getBoundingClientRect().top - this.offset - gap;
        if (Math.abs(drift) > 4) aim('auto');
      }, 350);
    };
    window.addEventListener('scrollend', settle);
    setTimeout(settle, 1200);
  }

  /** Put a short figure next to a chapter's rail label. */
  setMeta(chapter, text, tone) {
    const link = this.links.find(l => l.dataset.chapter === chapter);
    const meta = link && link.querySelector('.rail-meta');
    if (!meta) return;
    meta.textContent = text || '';
    meta.classList.toggle('text-profit', tone === 'profit');
    meta.classList.toggle('text-loss', tone === 'loss');
  }

  _isPinned(element) {
    if (!element) return false;
    const position = getComputedStyle(element).position;
    return position === 'sticky' || position === 'fixed';
  }

  /** Keep the sticky stack and anchor scroll margins in step with the header. */
  _syncOffsets() {
    const root = document.documentElement.style;
    const headerBottom = this._isPinned(this.header)
      ? Math.max(0, this.header.getBoundingClientRect().bottom)
      : 0;
    root.setProperty('--header-h', `${headerBottom}px`);

    let offset = headerBottom;
    if (this._isPinned(this.toolbar)) offset += this.toolbar.offsetHeight;
    root.setProperty('--rail-top', `${offset}px`);
    const railIsStrip = this.rail && getComputedStyle(this.rail).flexDirection === 'row';
    if (railIsStrip && this._isPinned(this.rail)) offset += this.rail.offsetHeight;
    root.setProperty('--sticky-offset', `${offset}px`);
    this.offset = offset;
  }

  _spy() {
    if (this.pendingChapter) return;
    if (!this.chapters.length || this.chapters[0].offsetParent === null) return;
    const line = (this.offset || 0) + 80;
    let current = this.chapters[0].dataset.chapter;
    for (const chapter of this.chapters) {
      if (chapter.getBoundingClientRect().top <= line) current = chapter.dataset.chapter;
    }
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom) current = this.chapters[this.chapters.length - 1].dataset.chapter;
    this._setActive(current);
  }

  _setActive(chapter) {
    if (chapter === this.active) return;
    this.active = chapter;
    HashState.update({ chapter: chapter === 'snapshot' ? null : chapter });
    this.links.forEach(link => {
      const on = link.dataset.chapter === chapter;
      link.classList.toggle('active', on);
      if (on) {
        link.setAttribute('aria-current', 'true');
        if (this.rail && getComputedStyle(this.rail).flexDirection === 'row') {
          this.rail.scrollTo({ left: link.offsetLeft - 16, behavior: 'smooth' });
        }
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LazyRenderer, ReportNav };
}
