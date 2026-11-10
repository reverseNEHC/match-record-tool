/**
 * 数据统计页
 */
const StatsPage = {
  container: null,

  render(params, container) {
    this.container = container;
    const matchId = params.matchId;
    const matches = matchId
      ? [Store.getMatch(matchId)].filter(Boolean)
      : Store.getMatches().filter(m => m.status === 'finished' || m.status === 'live');

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="page-header">
          <div class="page-heading"><span class="eyebrow">PERFORMANCE</span><h1>数据统计</h1><p class="page-subtitle">回顾比赛表现与关键数据。</p></div>
        </div>
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <p>暂无已结束的比赛</p>
          <p class="text-muted">完成一场比赛后，统计数据将显示在这里。</p>
        </div>
      `;
      return;
    }

    // If single match, show detailed stats
    if (matchId && matches.length === 1) {
      container.innerHTML = this._renderSingleMatch(matches[0]);
    } else {
      container.innerHTML = this._renderMatchList(matches);
    }

    this._bindEvents();
  },

  _renderSingleMatch(match) {
    const config = getSportConfig(match.sportType);
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);

    let detailHTML = '';

    if (match.sportType === 'basketball') {
      detailHTML = this._renderBasketballStats(match, homeTeam, awayTeam);
    } else if (match.sportType === 'football') {
      detailHTML = this._renderFootballStats(match, homeTeam, awayTeam);
    } else if (match.sportType === 'custom') {
      detailHTML = this._renderCustomStats(match, homeTeam, awayTeam);
    }

    return `
      <div class="page-header">
        <a href="#stats" class="btn btn-ghost btn-sm">← 返回列表</a>
        <div class="page-heading page-heading--inline"><span class="eyebrow">MATCH REPORT</span><h1>${escapeHtml(match.name)} · 统计</h1></div>
        <button class="btn btn-sm btn-outline" id="btn-export-excel">📥 导出 Excel</button>
      </div>
      <div class="stats-overview card mb-md">
        <div class="stats-overview-score">
          <span style="color:${homeTeam?.color || '#333'}">${escapeHtml(homeTeam?.name || '主队')}</span>
          <span class="stats-final-score">${match.homeScore} : ${match.awayScore}</span>
          <span style="color:${awayTeam?.color || '#333'}">${escapeHtml(awayTeam?.name || '客队')}</span>
        </div>
        <div class="text-center text-muted mt-sm">${formatDate(match.startTime)} · ${config.label} · ${match.events.length} 事件</div>
      </div>
      ${detailHTML}
    `;
  },

  _renderMatchList(matches) {
    return `
      <div class="page-header">
        <div class="page-heading"><span class="eyebrow">PERFORMANCE</span><h1>数据统计</h1><p class="page-subtitle">选择一场比赛查看详细统计。</p></div>
      </div>
      <div class="stats-match-list">
        ${matches.map(m => {
          const config = getSportConfig(m.sportType);
          const homeTeam = Store.getTeam(m.homeTeamId);
          const awayTeam = Store.getTeam(m.awayTeamId);
          const sportLabel = (m.sportType === 'custom' && m.rules?.customSportName)
            ? m.rules.customSportName : config.label;
          return `
            <a href="#stats?matchId=${m.id}" class="stats-match-item card">
              <span class="sport-badge ${m.sportType}">${config.icon} ${escapeHtml(sportLabel)}</span>
              <strong>${escapeHtml(m.name)}</strong>
              <span>${escapeHtml(homeTeam?.name || '?')} ${m.homeScore} : ${m.awayScore} ${escapeHtml(awayTeam?.name || '?')}</span>
              <span class="text-muted">${formatDate(m.startTime)}</span>
            </a>
          `;
        }).join('')}
      </div>
    `;
  },

  _renderBasketballStats(match, homeTeam, awayTeam) {
    const config = getSportConfig('basketball');
    const headers = ['队伍', '号码', '姓名', '得分', '投篮', '三分', '罚球', '篮板', '助攻', '盖帽', '抢断', '犯规', '失误'];

    const renderTeamRows = (team) => {
      if (!team) return '';
      return team.players.map(p => {
        const s = match.playerStats[p.id];
        if (!s) return ''; // 无数据的球员不显示
        const totalReb = (s.oreb || 0) + (s.dreb || 0);
        return `
          <tr>
            <td style="color:${team.color}">${escapeHtml(team.name)}</td>
            <td>#${p.number}</td>
            <td>${escapeHtml(p.name)}</td>
            <td><strong>${s.pts}</strong></td>
            <td>${s.fgm}/${s.fga}</td>
            <td>${s.threePm}/${s.threePa}</td>
            <td>${s.ftm}/${s.fta}</td>
            <td>${totalReb}</td>
            <td>${s.ast}</td>
            <td>${s.blk}</td>
            <td>${s.stl}</td>
            <td>${s.pf}</td>
            <td>${s.tov}</td>
          </tr>
        `;
      }).filter(Boolean).join('');
    };

    const homeRows = renderTeamRows(homeTeam);
    const awayRows = renderTeamRows(awayTeam);
    const hasData = homeRows || awayRows;

    if (!hasData) {
      return '<div class="empty-state"><p>暂无球员统计数据</p></div>';
    }

    return `
      <div class="card">
        <h3 class="section-title">🏀 球员数据统计表</h3>
        <div class="table-wrapper">
          <table class="stats-table">
            <thead>
              <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${homeRows}
              ${homeRows && awayRows ? '<tr class="table-separator"><td colspan="13"></td></tr>' : ''}
              ${awayRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 简单柱状图：各球员得分 -->
      <div class="card mt-md">
        <h3 class="section-title">📊 球员得分分布</h3>
        <div class="bar-chart">
          ${this._renderBarChart(match, homeTeam, awayTeam)}
        </div>
      </div>
    `;
  },

  _renderBarChart(match, homeTeam, awayTeam) {
    const maxPts = Math.max(1, ...Object.values(match.playerStats).map(s => s.pts || 0));

    const renderBars = (team, teamSide) => {
      if (!team) return '';
      return team.players.map(p => {
        const s = match.playerStats[p.id];
        if (!s || s.pts === 0) return '';
        const pct = Math.round((s.pts / maxPts) * 100);
        return `
          <div class="bar-item">
            <span class="bar-label">${escapeHtml(p.name)} #${p.number}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%; background:${team.color}"></div>
            </div>
            <span class="bar-value">${s.pts}分</span>
          </div>
        `;
      }).join('');
    };

    return `
      ${renderBars(homeTeam, 'home')}
      ${renderBars(awayTeam, 'away')}
    `;
  },

  _renderFootballStats(match, homeTeam, awayTeam) {
    const config = getSportConfig('football');
    const homeStats = match.teamStats[match.homeTeamId] || createFootballTeamStats();
    const awayStats = match.teamStats[match.awayTeamId] || createFootballTeamStats();

    return `
      <div class="card">
        <h3 class="section-title">⚽ 球队数据对比</h3>
        <table class="stats-table">
          <thead>
            <tr>
              <th>统计项</th>
              <th style="color:${homeTeam?.color || '#333'}">${escapeHtml(homeTeam?.name || '主队')}</th>
              <th style="color:${awayTeam?.color || '#333'}">${escapeHtml(awayTeam?.name || '客队')}</th>
            </tr>
          </thead>
          <tbody>
            ${config.teamStatFields.map(field => {
              const hv = homeStats[field.key] ?? 0;
              const av = awayStats[field.key] ?? 0;
              const unit = field.unit || '';
              return `
                <tr>
                  <td>${field.label}</td>
                  <td><strong>${hv}${unit}</strong></td>
                  <td><strong>${av}${unit}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _renderCustomStats(match, homeTeam, awayTeam) {
    const rules = match.rules || {};
    const fields = rules.customFields || [];
    const sportLabel = rules.customSportName || '自定义';
    const homeStats = match.teamStats[match.homeTeamId] || {};
    const awayStats = match.teamStats[match.awayTeamId] || {};

    if (fields.length === 0) {
      return '<div class="empty-state"><p>该比赛未设置自定义数据项</p></div>';
    }

    return `
      <div class="card">
        <h3 class="section-title">🏆 ${escapeHtml(sportLabel)} 数据对比</h3>
        <table class="stats-table">
          <thead>
            <tr>
              <th>统计项</th>
              <th style="color:${homeTeam?.color || '#333'}">${escapeHtml(homeTeam?.name || '主队')}</th>
              <th style="color:${awayTeam?.color || '#333'}">${escapeHtml(awayTeam?.name || '客队')}</th>
            </tr>
          </thead>
          <tbody>
            ${fields.map(field => {
              const hv = homeStats[field.key] ?? 0;
              const av = awayStats[field.key] ?? 0;
              return `
                <tr>
                  <td>${escapeHtml(field.label)}</td>
                  <td><strong>${hv}</strong></td>
                  <td><strong>${av}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- 柱状图：自定义数据项 -->
      <div class="card mt-md">
        <h3 class="section-title">📊 ${escapeHtml(sportLabel)} 数据分布</h3>
        <div class="bar-chart">
          ${this._renderCustomBarChart(fields, homeStats, awayStats, homeTeam, awayTeam)}
        </div>
      </div>
    `;
  },

  _renderCustomBarChart(fields, homeStats, awayStats, homeTeam, awayTeam) {
    const maxVal = Math.max(1, ...[...fields.map(f => homeStats[f.key] || 0), ...fields.map(f => awayStats[f.key] || 0)]);

    return fields.map(field => {
      const hv = homeStats[field.key] || 0;
      const av = awayStats[field.key] || 0;
      const homePct = Math.round((hv / maxVal) * 100);
      const awayPct = Math.round((av / maxVal) * 100);
      return `
        <div class="bar-item">
          <span class="bar-label">${escapeHtml(field.label)}</span>
          <div style="display:flex;flex:1;gap:4px;">
            <div class="bar-track" style="flex:1;justify-content:flex-end;display:flex;">
              <div class="bar-fill" style="width:${homePct}%; background:${homeTeam?.color || '#2563eb'};margin-left:auto;"></div>
            </div>
            <span style="font-size:0.7rem;min-width:20px;text-align:center;">${hv}</span>
            <div class="bar-track" style="flex:1;">
              <div class="bar-fill" style="width:${awayPct}%; background:${awayTeam?.color || '#dc2626'};"></div>
            </div>
          </div>
          <span class="bar-value" style="min-width:20px;">${av}</span>
        </div>
      `;
    }).join('');
  },

  _bindEvents() {
    document.getElementById('btn-export-excel')?.addEventListener('click', () => {
      const matchId = Router.currentParams?.matchId;
      if (matchId) Excel.exportMatch(matchId);
    });
  },
};
