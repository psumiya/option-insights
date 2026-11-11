/**
 * Tab Manager
 * Switches between the Report, Research, Trades and Ask Claude views and mirrors the
 * active view in the URL hash so it survives reloads and can be linked.
 */

const VIEWS = ['report', 'research', 'trades', 'ask'];

// Older links used #data for what is now the Trades view
const VIEW_ALIASES = { data: 'trades' };

/**
 * Reads and writes the URL hash, shaped as #view/chapter?key=value.
 * replaceState keeps filter clicks and scrolling out of browser history.
 */
const HashState = {
    read() {
        const raw = window.location.hash.replace(/^#/, '');
        const [path, query = ''] = raw.split('?');
        const [rawView, chapter] = path.split('/');
        const view = VIEW_ALIASES[rawView] || rawView;
        return {
            view: VIEWS.includes(view) ? view : null,
            chapter: chapter || null,
            params: new URLSearchParams(query)
        };
    },

    update({ view, chapter, params } = {}) {
        const current = this.read();
        const nextView = view !== undefined ? view : (current.view || 'report');
        const nextChapter = chapter !== undefined ? chapter : current.chapter;
        const nextParams = params !== undefined ? params : current.params;

        const query = nextParams.toString();
        let path = nextView === 'report' ? '' : nextView;
        if (nextView === 'report' && nextChapter) path = `report/${nextChapter}`;
        if (!path && query) path = 'report';

        const hash = path ? `#${path}${query ? `?${query}` : ''}` : '';
        const url = `${window.location.pathname}${window.location.search}${hash}`;
        if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
            history.replaceState(null, '', url);
        }
    }
};

class TabManager {
    constructor() {
        this.currentTab = 'report';
        this.scrollPositions = {};
        this.init();
    }

    init() {
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.id.replace('tab-', ''));
            });
        });

        window.addEventListener('hashchange', () => {
            const { view } = HashState.read();
            if (view && view !== this.currentTab) this.switchTab(view, { updateHash: false });
        });

        this.switchTab(HashState.read().view || 'report', { updateHash: false });
    }

    switchTab(tabId, { updateHash = true } = {}) {
        if (!VIEWS.includes(tabId)) tabId = 'report';
        const previousTab = this.currentTab;
        const changed = previousTab !== tabId;
        if (changed) this.scrollPositions[previousTab] = window.scrollY;
        this.currentTab = tabId;

        document.querySelectorAll('.tab-btn').forEach(button => {
            const active = button.id === `tab-${tabId}`;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });

        const toolbar = document.getElementById('dashboard-toolbar');
        if (toolbar) toolbar.dataset.view = tabId;

        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== `tab-panel-${tabId}`);
        });

        if (changed) this._scrollTo(this.scrollPositions[tabId] || 0);
        if (updateHash) HashState.update({ view: tabId, chapter: null });
    }

    reset() {
        this.switchTab('report');
        this.scrollPositions = {};
        this._scrollTo(0);
    }

    _scrollTo(top) {
        window.scrollTo({ top, behavior: 'instant' });
    }
}

if (typeof window !== 'undefined') {
    window.TabManager = TabManager;
    window.HashState = HashState;
}
