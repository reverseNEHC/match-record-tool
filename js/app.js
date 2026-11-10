/**
 * 应用入口
 * 初始化数据仓库、注册路由、渲染导航栏
 */
(function () {
  // 1. 初始化数据
  Store.init();

  // 2. 渲染导航栏
  Navbar.render();

  // 3. 注册路由
  Router.on('#home', (params, container) => HomePage.render(params, container));
  Router.on('#team', (params, container) => TeamPage.render(params, container));
  Router.on('#match/:id', (params, container) => MatchPage.render(params, container));
  Router.on('#stats', (params, container) => StatsPage.render(params, container));

  // 4. 启动路由
  Router.init();

  console.log('🏀⚽ Match Record Tool 已就绪！');
})();
