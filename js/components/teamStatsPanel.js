/**
 * 足球球队数据面板（集成控球率追踪）
 * 显示两队各项统计数据 + 控球率条形图
 */
const TeamStatsPanel = {
  match: null,
  homeTeam: null,
  awayTeam: null,
  container: null,
  callbacks: null,

  render(match) {
    this.match = match;
    this.homeTeam = Store.getTeam(match.homeTeamId);
    this.awayTeam = Store.getTeam(match.awayTeamId);
    const config = getSportConfig('football');
    const homeStats = match.teamStats[match.homeTeamId] || createFootballTeamStats();
    const awayStats = match.teamStats[match.awayTeamId] || createFootballTeamStats();

    // Filter out possession from stat fields (handled by the bar)
    const statFields = config.teamStatFields.filter(f => f.key !== 'possession');

    const rowsHTML = statFields.map(field => {
      const homeVal = homeStats[field.key] ?? 0;
      const awayVal = awayStats[field.key] ?? 0;
      return `
        <div class="team-stat-row">
          <div class="team-stat-side">
            ${match.status !== 'finished' ? `<button class="stat-mini-btn stat-dec" data-team="home" data-key="${field.key}">−</button>` : ''}
            <span class="team-stat-value" data-team="home" data-key="${field.key}">${homeVal}${field.unit || ''}</span>
            ${match.status !== 'finished' ? `<button class="stat-mini-btn stat-inc" data-team="home" data-key="${field.key}">+</button>` : ''}
          </div>
          <span class="team-stat-label">${field.label}</span>
          <div class="team-stat-side">
            ${match.status !== 'finished' ? `<button class="stat-mini-btn stat-dec" data-team="away" data-key="${field.key}">−</button>` : ''}
            <span class="team-stat-value" data-team="away" data-key="${field.key}">${awayVal}${field.unit || ''}</span>
            ${match.status !== 'finished' ? `<button class="stat-mini-btn stat-inc" data-team="away" data-key="${field.key}">+</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // --- possession bar (integrated) ---
    const homePoss = homeStats.possession || 0;
    const awayPoss = awayStats.possession || 0;
    const activeTeam = match._possessionActive || '';

    const possessionHTML = match.status !== 'finished' ? `
      <div class="poss-buttons" style="margin-top:12px;display:flex;gap:6px;justify-content:center;">
        <button class="btn btn-sm poss-btn ${activeTeam === 'home' ? 'active-poss' : ''}" id="btn-poss-home"
          style="border-color:${this.homeTeam?.color || '#2563eb'};color:${this.homeTeam?.color || '#2563eb'};flex:1;max-width:160px;">
          ⚽ ${escapeHtml(this.homeTeam?.name || '主队')} 控球
        </button>
        <button class="btn btn-sm poss-btn ${activeTeam === 'away' ? 'active-poss' : ''}" id="btn-poss-away"
          style="border-color:${this.awayTeam?.color || '#dc2626'};color:${this.awayTeam?.color || '#dc2626'};flex:1;max-width:160px;">
          ⚽ ${escapeHtml(this.awayTeam?.name || '客队')} 控球
        </button>
      </div>
    ` : '';

    return `
      <div class="team-stats-panel card">
        <h3 class="section-title">⚽ 球队数据</h3>
        <div class="team-stats-header">
          <span class="team-stats-team-name" style="color:${this.homeTeam?.color || '#2563eb'}">
            ${escapeHtml(this.homeTeam?.name || '主队')}
          </span>
          <span class="team-stats-vs">VS</span>
          <span class="team-stats-team-name" style="color:${this.awayTeam?.color || '#dc2626'}">
            ${escapeHtml(this.awayTeam?.name || '客队')}
          </span>
        </div>

        <!-- possession bar -->
        <div class="poss-bar-wrapper">
          <div class="poss-bar">
            <div class="poss-bar-fill" style="width:${Math.max(homePoss, 5)}%;background:${this.homeTeam?.color || '#2563eb'}">
              ${homePoss > 12 ? homePoss + '%' : ''}
            </div>
            <div class="poss-bar-fill" style="width:${Math.max(awayPoss, 5)}%;background:${this.awayTeam?.color || '#dc2626'}">
              ${awayPoss > 12 ? awayPoss + '%' : ''}
            </div>
          </div>
          <div class="poss-labels">
            <span style="color:${this.homeTeam?.color || '#2563eb'}">${homePoss}%</span>
            <span style="color:${this.awayTeam?.color || '#dc2626'}">${awayPoss}%</span>
          </div>
        </div>
        ${possessionHTML}
        <div class="text-center text-muted" style="font-size:0.7rem;margin:4px 0 8px 0;">
          每30秒自动计算控球率 | 其他数据点击 +/− 记录
        </div>

        <div class="team-stats-rows">
          ${rowsHTML}
        </div>
      </div>
    `;
  },

  bindEvents(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    if (this.match.status === 'finished') return;

    // Stat +/- buttons
    container.querySelectorAll('.stat-inc, .stat-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const team = btn.dataset.team;
        const key = btn.dataset.key;
        const delta = btn.classList.contains('stat-inc') ? 1 : -1;
        this._updateStat(team, key, delta);
      });
    });

    // Possession buttons
    document.getElementById('btn-poss-home')?.addEventListener('click', () => {
      this.callbacks?.onPossession('home');
    });
    document.getElementById('btn-poss-away')?.addEventListener('click', () => {
      this.callbacks?.onPossession('away');
    });
  },

  _updateStat(teamSide, key, delta) {
    const teamId = teamSide === 'home' ? this.match.homeTeamId : this.match.awayTeamId;
    const stats = this.match.teamStats[teamId];
    if (!stats) return;

    const newVal = Math.max(0, (stats[key] || 0) + delta);
    stats[key] = newVal;

    const valEl = this.container.querySelector(`.team-stat-value[data-team="${teamSide}"][data-key="${key}"]`);
    if (valEl) {
      const config = getSportConfig('football');
      const field = config.teamStatFields.find(f => f.key === key);
      valEl.textContent = newVal + (field?.unit || '');
    }

    const config = getSportConfig('football');
    const field = config.teamStatFields.find(f => f.key === key);
    const team = Store.getTeam(teamId);
    const elapsed = Timer.getElapsed ? Timer.getElapsed() : 0;
    this.match.events.push(createEvent({
      gameTime: elapsed,
      period: this.match.currentPeriod,
      type: 'custom',
      teamId: teamId,
      playerId: null,
      description: `${team?.name || ''} ${field?.label || key}: ${newVal} (${delta > 0 ? '+' + delta : delta})`,
    }));

    Store.updateMatch(this.match.id, {
      teamStats: this.match.teamStats,
      events: this.match.events,
    });

    this.callbacks?.onRefresh();
  },
};
