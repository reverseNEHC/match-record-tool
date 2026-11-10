/**
 * 顶部导航栏组件
 */
const Navbar = {
  render() {
    const container = document.getElementById('navbar-container');
    if (!container) return;

    container.innerHTML = `
      <nav class="navbar" aria-label="主导航">
        <a class="navbar-brand" href="#home">
          <span class="brand-icon" aria-hidden="true">🏆</span>
          <span class="brand-text">Match Record Tool</span>
        </a>
        <div class="navbar-links">
          <a href="#home" class="navbar-link" data-route="home">
            <span class="nav-icon" aria-hidden="true">▦</span><span class="nav-label">比赛</span>
          </a>
          <a href="#team" class="navbar-link" data-route="team">
            <span class="nav-icon" aria-hidden="true">♟</span><span class="nav-label">队伍</span>
          </a>
          <a href="#stats" class="navbar-link" data-route="stats">
            <span class="nav-icon" aria-hidden="true">▤</span><span class="nav-label">数据统计</span>
          </a>
        </div>
        <div class="navbar-actions">
          <button class="btn btn-outline btn-sm" id="btn-import-data" title="导入数据">
            📥 导入
          </button>
          <button class="btn btn-outline btn-sm" id="btn-export-all" title="导出全部数据">
            📤 导出
          </button>
        </div>
      </nav>
    `;

    this._bindEvents();
    this._highlightCurrent();
  },

  _bindEvents() {
    // Highlight active nav link on hash change
    window.addEventListener('hashchange', () => this._highlightCurrent());

    // Import button
    document.getElementById('btn-import-data')?.addEventListener('click', () => {
      Store.importJSON();
    });

    // Export all button
    document.getElementById('btn-export-all')?.addEventListener('click', () => {
      Store.exportAllJSON();
    });
  },

  _highlightCurrent() {
    const hash = window.location.hash || '#home';
    const baseRoute = hash.split('?')[0];
    document.querySelectorAll('.navbar-link').forEach(link => {
      const route = '#' + link.dataset.route;
      link.classList.toggle('active', baseRoute === route);
    });
  },
};
