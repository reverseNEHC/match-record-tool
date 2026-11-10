/**
 * 简易 Hash 路由器
 * 注册页面渲染函数，监听 hashchange 事件
 */
const Router = {
  routes: {},
  currentRoute: null,
  currentParams: null,
  pageContainer: null,

  /**
   * 注册路由
   * @param {string} pattern - 如 '#home', '#match/:id'
   * @param {function} renderFn - 渲染函数，接收 params 对象
   */
  on(pattern, renderFn) {
    const keys = [];
    const regexStr = pattern.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes[pattern] = { regex: new RegExp(`^${regexStr}$`), keys, renderFn };
  },

  /**
   * 导航到指定 hash
   */
  go(hash) {
    window.location.hash = hash;
  },

  /**
   * 刷新当前路由
   */
  refresh() {
    this._handleRoute();
  },

  /**
   * 初始化，绑定事件并处理当前 hash
   */
  init() {
    this.pageContainer = document.getElementById('page-container');
    window.addEventListener('hashchange', () => this._handleRoute());
    this._handleRoute();
  },

  /**
   * 匹配并渲染当前路由
   */
  _handleRoute() {
    const hash = window.location.hash || '#home';
    // Strip query string for matching
    const [path, query] = hash.split('?');

    for (const [pattern, { regex, keys, renderFn }] of Object.entries(this.routes)) {
      const match = path.match(regex);
      if (match) {
        const params = {};
        keys.forEach((key, i) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });
        // Parse query params
        if (query) {
          query.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k) params[k] = decodeURIComponent(v || '');
          });
        }
        this.currentRoute = pattern;
        this.currentParams = params;
        if (this.pageContainer) {
          try {
            renderFn(params, this.pageContainer);
          } catch (e) {
            console.error(`Route error [${pattern}]:`, e);
            this.pageContainer.innerHTML = `<div class="empty-state"><p>页面加载出错: ${e.message}</p></div>`;
          }
        }
        return;
      }
    }

    // 404
    if (this.pageContainer) {
      this.pageContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>页面未找到</p></div>';
    }
  },
};
