/**
 * 比赛记录页
 * 组装计分板、计时器、球员/球队面板、事件时间线
 */
const MatchPage = {
  match: null,
  container: null,
  _headerBound: false,
  // Possession tracking (football)
  _possession: null,

  render(params, container) {
    this.container = container;
    this._headerBound = false;
    const matchId = params.id;
    const match = Store.getMatch(matchId);

    if (!match) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>比赛不存在</p><a href="#home">返回首页</a></div>';
      return;
    }

    this.match = match;
    const config = getSportConfig(match.sportType);
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);
    const rules = match.rules || {};
    const periodName = rules.periods > 2 ? '节' : config.periodName;
    const sportLabel = match.sportType === 'custom' && rules.customSportName
      ? rules.customSportName : config.label;

    container.innerHTML = `
      <div class="page-header match-page-header">
        <a href="#home" class="btn btn-ghost btn-sm">← 返回</a>
        <div class="match-title-block">
          <span class="eyebrow">LIVE MATCH · ${config.icon} ${escapeHtml(sportLabel)}</span>
          <h1>${escapeHtml(match.name) || '未命名比赛'}</h1>
        </div>
        <div class="match-toolbar-actions">
          <button class="btn btn-sm btn-outline" id="btn-match-stats">📊 统计</button>
          <button class="btn btn-sm btn-outline" id="btn-export-json">📤 JSON</button>
          <button class="btn btn-sm btn-outline" id="btn-export-excel">📥 Excel</button>
          ${match.status !== 'finished' && !this._isFirstToWinner(match) ? `
          <button class="btn btn-sm btn-success" id="btn-period-next">下一${periodName} ▶</button>
          ${rules.hasOvertime && !match.isOvertime ? `<button class="btn btn-sm btn-outline" id="btn-overtime">⏱️ 加时赛</button>` : ''}
          <button class="btn btn-sm btn-danger" id="btn-finish-match">🏁 结束比赛</button>
          ` : ''}
        </div>
      </div>

      <div class="match-layout match-page-layout">
        <div class="match-left">
          <div id="scoreboard-container">${ScoreBoard.render(match)}</div>
          <div id="timer-container">${Timer.render(match)}</div>

          ${match.sportType === 'football'
            ? `<div id="team-stats-container">${TeamStatsPanel.render(match)}</div>`
            : match.sportType === 'custom'
              ? `<div id="custom-stats-container">${this._renderCustomStatsPanel(match)}</div>`
              : ''
          }

          <!-- 快速事件按钮 -->
          <div id="quick-events-container" class="quick-events card">
            <h3 class="section-title">⚡ 快速记录</h3>
            ${this._renderQuickEvents(match)}
          </div>
        </div>

        <div class="match-right">
          ${match.sportType === 'basketball'
            ? `<div id="player-panel-container">${PlayerPanel.render(match)}</div>`
            : match.sportType === 'football'
              ? `<div id="football-player-panel-container">${FootballPlayerPanel.render(match)}</div>`
              : ''
          }
          <div id="event-log-container" class="mt-md">${EventLog.render(match)}</div>
        </div>
      </div>
    `;

    // Init possession tracking for football
    if (match.sportType === 'football' && match.status !== 'finished') {
      this._initPossession(match);
      // Auto-initialize active players if empty (first entry)
      this._initFootballActivePlayers(match);
    }

    this._bindAllEvents(match);
  },

  _initFootballActivePlayers(match) {
    // If no active players set yet, populate with all team players (up to 11)
    ['home', 'away'].forEach(side => {
      const key = side === 'home' ? 'homeActivePlayers' : 'awayActivePlayers';
      const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId;
      const team = Store.getTeam(teamId);
      const list = match[key];

      if (!list || list.length === 0) {
        if (team && team.players.length > 0) {
          // Take first 11 or all players
          const starters = team.players.slice(0, 11).map(p => p.id);
          match[key] = starters;
          Store.updateMatch(match.id, {
            [side === 'home' ? 'homeActivePlayers' : 'awayActivePlayers']: starters,
          });
        }
      }
    });
  },

  _renderCustomStatsPanel(match) {
    const rules = match.rules || {};
    const fields = rules.customFields || [];
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);
    const homeColor = homeTeam?.color || '#2563eb';
    const awayColor = awayTeam?.color || '#dc2626';
    const sportLabel = rules.customSportName || '自定义';

    if (fields.length === 0) {
      return `<div class="card"><h3 class="section-title">🏆 ${escapeHtml(sportLabel)} 数据</h3><p class="text-muted">未设置自定义数据项，可在编辑比赛时添加。</p></div>`;
    }

    const homeStats = match.teamStats[match.homeTeamId] || {};
    const awayStats = match.teamStats[match.awayTeamId] || {};

    const rowsHTML = fields.map(field => {
      const homeVal = homeStats[field.key] ?? 0;
      const awayVal = awayStats[field.key] ?? 0;
      return `
        <div class="team-stat-row">
          <div class="team-stat-side">
            ${match.status !== 'finished' ? `<button class="stat-mini-btn custom-stat-dec" data-team="home" data-key="${field.key}">−</button>` : ''}
            <span class="team-stat-value" data-team="home" data-key="${field.key}">${homeVal}</span>
            ${match.status !== 'finished' ? `<button class="stat-mini-btn custom-stat-inc" data-team="home" data-key="${field.key}">+</button>` : ''}
          </div>
          <span class="team-stat-label">${escapeHtml(field.label)}</span>
          <div class="team-stat-side">
            ${match.status !== 'finished' ? `<button class="stat-mini-btn custom-stat-dec" data-team="away" data-key="${field.key}">−</button>` : ''}
            <span class="team-stat-value" data-team="away" data-key="${field.key}">${awayVal}</span>
            ${match.status !== 'finished' ? `<button class="stat-mini-btn custom-stat-inc" data-team="away" data-key="${field.key}">+</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="team-stats-panel card">
        <h3 class="section-title">🏆 ${escapeHtml(sportLabel)} 数据</h3>
        <div class="team-stats-header">
          <span class="team-stats-team-name" style="color:${homeColor}">${escapeHtml(homeTeam?.name || '主队')}</span>
          <span class="team-stats-vs">VS</span>
          <span class="team-stats-team-name" style="color:${awayColor}">${escapeHtml(awayTeam?.name || '客队')}</span>
        </div>
        <div class="team-stats-rows">${rowsHTML}</div>
      </div>
    `;
  },

  _renderQuickEvents(match) {
    const config = getSportConfig(match.sportType);
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);

    /**
     * Football: streamlined — only player-specific actions (goal, cards).
     * Fouls, corners, offsides are handled in the team stats panel.
     */
    if (match.sportType === 'football') {
      return `
        <div class="quick-event-group">
          <button class="btn btn-sm btn-outline quick-event-btn" data-type="score" data-team="home" data-need-player="true">
            ⚽ ${escapeHtml(homeTeam?.name || '主队')} 进球
          </button>
          <span class="quick-event-label">⚽ 进球</span>
          <button class="btn btn-sm btn-outline quick-event-btn" data-type="score" data-team="away" data-need-player="true">
            ⚽ ${escapeHtml(awayTeam?.name || '客队')} 进球
          </button>
        </div>
        <div class="quick-event-group">
          <button class="btn btn-sm btn-outline quick-event-btn" data-type="card_yellow" data-team="home">
            🟨 ${escapeHtml(homeTeam?.name || '主队')} 黄牌
          </button>
          <span class="quick-event-label">🟨 黄牌</span>
          <button class="btn btn-sm btn-outline quick-event-btn" data-type="card_yellow" data-team="away">
            🟨 ${escapeHtml(awayTeam?.name || '客队')} 黄牌
          </button>
        </div>
        <div class="quick-event-group">
          <button class="btn btn-sm btn-outline quick-event-btn" data-type="card_red" data-team="home">
            🟥 ${escapeHtml(homeTeam?.name || '主队')} 红牌
          </button>
          <span class="quick-event-label">🟥 红牌</span>
          <button class="btn btn-sm btn-outline quick-event-btn" data-type="card_red" data-team="away">
            🟥 ${escapeHtml(awayTeam?.name || '客队')} 红牌
          </button>
        </div>
        <p class="text-muted" style="font-size:0.72rem;margin-top:8px;">
          📋 犯规 / 角球 / 越位 → 在球队数据面板中记录
        </p>
      `;
    }

    if (match.sportType === 'custom') {
      const fields = match.rules?.customFields || [];
      if (fields.length > 0) {
        return fields.map(f => `
          <div class="quick-event-group">
            <button class="btn btn-sm btn-outline quick-event-btn" data-type="custom" data-team="home" data-desc="${escapeHtml(f.label)}">
              📌 ${escapeHtml(homeTeam?.name || '主队')} ${escapeHtml(f.label)}
            </button>
            <span class="quick-event-label">📌 ${escapeHtml(f.label)}</span>
            <button class="btn btn-sm btn-outline quick-event-btn" data-type="custom" data-team="away" data-desc="${escapeHtml(f.label)}">
              📌 ${escapeHtml(awayTeam?.name || '客队')} ${escapeHtml(f.label)}
            </button>
          </div>
        `).join('');
      }
      return '<p class="text-muted">自定义运动类型暂无预设快速事件</p>';
    }

    if (config.quickEvents.length === 0) {
      return '<p class="text-muted">该运动类型暂无预设快速事件</p>';
    }

    return config.quickEvents.map(ev => {
      const info = config.eventTypes[ev.type] || { label: ev.type, icon: ev.icon };
      return `
        <div class="quick-event-group">
          <button class="btn btn-sm btn-outline quick-event-btn" data-type="${ev.type}" data-team="home">
            ${info.icon} ${escapeHtml(homeTeam?.name || '主队')} ${ev.label}
          </button>
          <span class="quick-event-label">${info.icon} ${ev.label}</span>
          <button class="btn btn-sm btn-outline quick-event-btn" data-type="${ev.type}" data-team="away">
            ${info.icon} ${escapeHtml(awayTeam?.name || '客队')} ${ev.label}
          </button>
        </div>
      `;
    }).join('');
  },

  /**
   * Bind all events. Header action buttons are only bound once.
   * Dynamic content (scoreboard, timer, panels, quick-events, event-log)
   * are re-bound every time since their DOM is replaced.
   */
  _bindAllEvents(match) {
    const container = this.container;

    // ScoreBoard events
    ScoreBoard.bindEvents(container, {
      onScore: (team, value) => this._handleScore(team, value),
      onUndo: () => this._handleUndo(),
    });

    // Timer events
    Timer.bindEvents(container, {
      onPeriodEnd: () => this._handlePeriodEnd(),
    });

    // Player Panel events (basketball) — right side, active players
    if (match.sportType === 'basketball') {
      PlayerPanel.bindEvents(container, {
        onRefresh: () => this._refresh(),
        onFirstToWin: () => this._handleFirstToWin(),
      });
    }

    // Team Stats Panel events (football — includes possession tracking)
    if (match.sportType === 'football') {
      TeamStatsPanel.bindEvents(container, {
        onRefresh: () => this._refresh(),
        onPossession: (teamSide) => this._handlePossessionClick(teamSide),
      });
      // Football player panel
      FootballPlayerPanel.bindEvents(container, {
        onRefresh: () => this._refresh(),
      });
    }

    // Custom Stats Panel events
    if (match.sportType === 'custom') {
      this._bindCustomStatsEvents(container);
    }

    // Event log (with filter + delete)
    EventLog.bindEvents(container, {
      onRefresh: () => this._refresh(),
    });

    // Quick event buttons (DOM is replaced each refresh, safe to addEventListener)
    container.querySelectorAll('.quick-event-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const team = btn.dataset.team;
        const desc = btn.dataset.desc || null;
        this._handleQuickEvent(type, team, desc);
      });
    });

    // Header action buttons — bind only once (these DOM elements persist)
    if (!this._headerBound) {
      this._headerBound = true;

      document.getElementById('btn-period-next')?.addEventListener('click', () => this._nextPeriod());
      document.getElementById('btn-overtime')?.addEventListener('click', () => this._startOvertime());
      document.getElementById('btn-finish-match')?.addEventListener('click', () => this._finishMatch());
      document.getElementById('btn-export-json')?.addEventListener('click', () => {
        Store.exportMatchJSON(match.id);
      });
      document.getElementById('btn-export-excel')?.addEventListener('click', () => {
        Excel.exportMatch(match.id);
      });
      document.getElementById('btn-match-stats')?.addEventListener('click', () => {
        Router.go(`#stats?matchId=${match.id}`);
      });
    }
  },

  // ==================== actions ====================

  _handleScore(teamSide, value) {
    const match = this.match;
    const elapsed = Timer.getElapsed();

    if (teamSide === 'home') {
      match.homeScore += value;
    } else {
      match.awayScore += value;
    }

    // Record event
    const team = Store.getTeam(teamSide === 'home' ? match.homeTeamId : match.awayTeamId);
    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: 'score',
      teamId: teamSide === 'home' ? match.homeTeamId : match.awayTeamId,
      value,
      description: `${team?.name || ''} +${value}分`,
    }));

    Store.updateMatch(match.id, {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      events: match.events,
    });

    // Check first-to-N win condition
    const rules = match.rules || {};
    if (rules.winCondition === 'firstTo' && rules.firstToScore > 0) {
      if (match.homeScore >= rules.firstToScore || match.awayScore >= rules.firstToScore) {
        this._handleFirstToWin();
        return;
      }
    }

    this._refresh();
  },

  _handleFirstToWin() {
    const match = this.match;
    const elapsed = Timer.getElapsed();
    Timer.pause();
    match.status = 'finished';
    match.endTime = new Date().toISOString();
    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: 'custom',
      teamId: '',
      playerId: null,
      description: `比赛结束！${match.homeScore >= (match.rules.firstToScore || 999) ? '主队' : '客队'}率先得到${match.rules.firstToScore}分获胜 🏆`,
    }));
    Store.updateMatch(match.id, {
      status: match.status,
      endTime: match.endTime,
      events: match.events,
    });

    Modal.alert({
      title: '🏆 比赛结束',
      message: `${match.homeScore >= (match.rules.firstToScore || 999) ? '主队' : '客队'}率先达到${match.rules.firstToScore}分，获得胜利！`,
    });

    this.render(Router.currentParams, this.container);
  },

  _handleUndo() {
    const match = this.match;
    const lastScoreEvent = [...match.events].reverse().find(e => e.type === 'score');
    if (!lastScoreEvent) {
      Modal.alert({ title: '提示', message: '没有可撤销的得分事件' });
      return;
    }

    match.events = match.events.filter(e => e.id !== lastScoreEvent.id);
    if (lastScoreEvent.teamId === match.homeTeamId) {
      match.homeScore = Math.max(0, match.homeScore - (lastScoreEvent.value || 0));
    } else {
      match.awayScore = Math.max(0, match.awayScore - (lastScoreEvent.value || 0));
    }

    Store.updateMatch(match.id, {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      events: match.events,
    });

    this._refresh();
  },

  _handleQuickEvent(type, teamSide, customDesc) {
    const match = this.match;

    // Football goal: show scorer + assist selector
    if (type === 'score' && match.sportType === 'football') {
      this._showGoalScorerSelector(teamSide);
      return;
    }

    // For football cards: show player selector first
    if ((type === 'card_yellow' || type === 'card_red') && match.sportType === 'football') {
      this._showCardPlayerSelector(type, teamSide);
      return;
    }

    this._doQuickEvent(type, teamSide, customDesc, null);
  },

  _doQuickEvent(type, teamSide, customDesc, playerId) {
    const match = this.match;
    const elapsed = Timer.getElapsed();
    const team = Store.getTeam(teamSide === 'home' ? match.homeTeamId : match.awayTeamId);
    const config = getSportConfig(match.sportType);
    const info = config.eventTypes[type] || { label: type };
    const descLabel = customDesc || info.label;

    // Get player name if applicable
    let playerName = '';
    if (playerId && team) {
      const p = team.players.find(pl => pl.id === playerId);
      if (p) playerName = `#${p.number} ${p.name}`;
    }

    if (type === 'card_yellow' || type === 'card_red') {
      const teamId = teamSide === 'home' ? match.homeTeamId : match.awayTeamId;
      const stats = match.teamStats[teamId];
      if (stats) {
        if (type === 'card_yellow') stats.yellowCards = (stats.yellowCards || 0) + 1;
        if (type === 'card_red') stats.redCards = (stats.redCards || 0) + 1;
      }
    }

    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type,
      teamId: teamSide === 'home' ? match.homeTeamId : match.awayTeamId,
      playerId,
      description: `${team?.name || ''}${playerName ? ' ' + playerName : ''} — ${descLabel}`,
    }));

    // For custom sports: auto-increment the corresponding team stat
    if (match.sportType === 'custom' && customDesc && match.rules?.customFields) {
      const field = match.rules.customFields.find(f => f.label === customDesc);
      if (field) {
        const teamId = teamSide === 'home' ? match.homeTeamId : match.awayTeamId;
        const stats = match.teamStats[teamId];
        if (stats) stats[field.key] = (stats[field.key] || 0) + 1;
      }
    }

    Store.updateMatch(match.id, {
      events: match.events,
      teamStats: match.teamStats,
    });

    this._refresh();
  },

  _bindCustomStatsEvents(container) {
    if (this.match.status === 'finished') return;

    container.querySelectorAll('.custom-stat-inc, .custom-stat-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const team = btn.dataset.team;
        const key = btn.dataset.key;
        const delta = btn.classList.contains('custom-stat-inc') ? 1 : -1;
        this._updateCustomStat(team, key, delta);
      });
    });
  },

  _updateCustomStat(teamSide, key, delta) {
    const match = this.match;
    const teamId = teamSide === 'home' ? match.homeTeamId : match.awayTeamId;
    const stats = match.teamStats[teamId];
    if (!stats) return;

    const newVal = Math.max(0, (stats[key] || 0) + delta);
    stats[key] = newVal;

    // Update display
    const valEl = document.querySelector(`.team-stat-value[data-team="${teamSide}"][data-key="${key}"]`);
    if (valEl) valEl.textContent = newVal;

    // Find field label for event description
    const fields = match.rules?.customFields || [];
    const field = fields.find(f => f.key === key);
    const team = Store.getTeam(teamId);
    const elapsed = Timer.getElapsed();

    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: 'custom',
      teamId,
      playerId: null,
      description: `${team?.name || ''} ${field?.label || key}: ${newVal} (${delta > 0 ? '+' + delta : delta})`,
    }));

    Store.updateMatch(match.id, {
      teamStats: match.teamStats,
      events: match.events,
    });

    this._refresh();
  },

  _showGoalScorerSelector(teamSide) {
    const match = this.match;
    const team = Store.getTeam(teamSide === 'home' ? match.homeTeamId : match.awayTeamId);
    if (!team || team.players.length === 0) {
      // No players — just record as team goal
      this._doGoal(teamSide, null, null);
      return;
    }

    const playersHTML = team.players.map(p => `
      <button class="card-player-btn" data-player-id="${p.id}">
        <span>#${p.number} ${escapeHtml(p.name)}</span>
        <span>⚽ 选择</span>
      </button>
    `).join('');

    Modal.show({
      title: '⚽ 选择进球球员',
      content: `
        <p class="text-muted mb-sm" style="font-size:0.85rem">${escapeHtml(team.name)} — 选择进球球员</p>
        <div class="card-player-list">${playersHTML}</div>
        <p class="text-muted mt-sm" style="font-size:0.75rem">选择球员后，将提示选择助攻球员（可选）</p>
      `,
      showCancel: true,
      confirmText: '跳过（团队进球）',
      onConfirm: () => {
        this._doGoal(teamSide, null, null);
      },
    });

    setTimeout(() => {
      document.querySelectorAll('.card-player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const scorerId = btn.dataset.playerId;
          Modal.close();
          this._showAssistSelector(teamSide, scorerId);
        });
      });
    }, 50);
  },

  _showAssistSelector(teamSide, scorerId) {
    const match = this.match;
    const team = Store.getTeam(teamSide === 'home' ? match.homeTeamId : match.awayTeamId);
    if (!team) { this._doGoal(teamSide, scorerId, null); return; }

    const playersHTML = team.players
      .filter(p => p.id !== scorerId)
      .map(p => `
        <button class="card-player-btn" data-player-id="${p.id}">
          <span>#${p.number} ${escapeHtml(p.name)}</span>
          <span>🤝 助攻</span>
        </button>
      `).join('');

    Modal.show({
      title: '🤝 助攻球员（可选）',
      content: `
        <p class="text-muted mb-sm" style="font-size:0.85rem">谁助攻了这粒进球？</p>
        <div class="card-player-list">${playersHTML}</div>
      `,
      showCancel: true,
      confirmText: '跳过（无助攻）',
      onConfirm: () => {
        this._doGoal(teamSide, scorerId, null);
      },
    });

    setTimeout(() => {
      document.querySelectorAll('.card-player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const assistId = btn.dataset.playerId;
          Modal.close();
          this._doGoal(teamSide, scorerId, assistId);
        });
      });
    }, 50);
  },

  _doGoal(teamSide, scorerId, assistId) {
    const match = this.match;
    const elapsed = Timer.getElapsed();
    const team = Store.getTeam(teamSide === 'home' ? match.homeTeamId : match.awayTeamId);
    const scorer = scorerId ? team?.players.find(p => p.id === scorerId) : null;
    const assist = assistId ? team?.players.find(p => p.id === assistId) : null;

    // Update score
    if (teamSide === 'home') match.homeScore++;
    else match.awayScore++;

    // Update team shots/shotsOnTarget
    const teamId = teamSide === 'home' ? match.homeTeamId : match.awayTeamId;
    const stats = match.teamStats[teamId];
    if (stats) {
      stats.shots = (stats.shots || 0) + 1;
      stats.shotsOnTarget = (stats.shotsOnTarget || 0) + 1;
    }

    let desc = `${team?.name || ''}`;
    if (scorer) desc += ` — #${scorer.number} ${scorer.name} 进球 ⚽`;
    else desc += ` — 进球 ⚽`;
    if (assist) desc += ` (助攻: #${assist.number} ${assist.name})`;

    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: 'score',
      teamId,
      playerId: scorerId,
      value: 1,
      description: desc,
    }));

    Store.updateMatch(match.id, {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      teamStats: match.teamStats,
      events: match.events,
    });

    this._refresh();
  },

  _showCardPlayerSelector(cardType, teamSide) {
    const match = this.match;
    const team = Store.getTeam(teamSide === 'home' ? match.homeTeamId : match.awayTeamId);
    if (!team || team.players.length === 0) {
      Modal.alert({ title: '提示', message: '该队伍没有球员，请先在队伍管理中添加球员。' });
      return;
    }

    // Init player cards tracking if needed
    if (!match.playerCards) match.playerCards = {};

    const label = cardType === 'card_yellow' ? '黄牌 🟨' : '红牌 🟥';
    const playersHTML = team.players.map(p => {
      const cards = match.playerCards[p.id] || { yellow: 0, red: 0, redSecond: 0 };
      let badges = '';
      if (cards.yellow > 0) badges += ` 🟨×${cards.yellow}`;
      if (cards.red > 0) badges += ` 🟥×${cards.red}`;
      if (cards.redSecond > 0) badges += ` 🟥²×${cards.redSecond}`;
      return `
        <button class="card-player-btn" data-player-id="${p.id}">
          <span>#${p.number} ${escapeHtml(p.name)}</span>
          <span style="font-size:0.75rem">${badges}</span>
        </button>
      `;
    }).join('');

    Modal.show({
      title: `选择球员 — ${label}`,
      content: `
        <p class="text-muted mb-sm" style="font-size:0.85rem">${escapeHtml(team.name)} — 选择获得${cardType === 'card_yellow' ? '黄牌' : '红牌'}的球员</p>
        <div class="card-player-list">${playersHTML}</div>
      `,
      showCancel: true,
      confirmText: '取消',
      onConfirm: () => {}, // no-op, handled by player buttons
    });

    // Bind player selection
    setTimeout(() => {
      document.querySelectorAll('.card-player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const playerId = btn.dataset.playerId;
          Modal.close();
          this._recordCard(cardType, teamSide, playerId);
        });
      });
    }, 50);
  },

  _recordCard(cardType, teamSide, playerId) {
    const match = this.match;
    const team = Store.getTeam(teamSide === 'home' ? match.homeTeamId : match.awayTeamId);
    const player = team?.players.find(p => p.id === playerId);
    if (!player || !match.playerCards) return;

    // Init player card record
    if (!match.playerCards[playerId]) {
      match.playerCards[playerId] = { yellow: 0, red: 0, redSecond: 0 };
    }
    const pc = match.playerCards[playerId];

    if (cardType === 'card_yellow') {
      pc.yellow++;
      // Check if this is the second yellow → auto red
      if (pc.yellow >= 2) {
        pc.yellow -= 2; // remove the two yellows
        pc.redSecond++;  // record as second-yellow red
        // Record the yellow event first, then the red event
        this._doQuickEvent('card_yellow', teamSide, `黄牌 → #${player.number} ${player.name}`, playerId);
        // Use card_red_second to distinguish from straight red
        const isSecondYellow = true;
        this._doQuickEvent('card_red_second', teamSide, `两黄变一红 → #${player.number} ${player.name}`, playerId);
        // Correct team stats: the yellow was already +1'd by _doQuickEvent.
        // Now convert 2 yellows → 1 red: net = -1 yellow, +1 red
        const teamId = teamSide === 'home' ? match.homeTeamId : match.awayTeamId;
        const stats = match.teamStats[teamId];
        if (stats) {
          stats.yellowCards = Math.max(0, (stats.yellowCards || 0) - 2);
          stats.redCards = (stats.redCards || 0) + 1;
        }
        Store.updateMatch(match.id, {
          playerCards: match.playerCards,
          events: match.events,
          teamStats: match.teamStats,
        });

        // Auto-remove red-carded player from field
        FootballPlayerPanel.handleRedCard(playerId, teamSide, teamId);

        Modal.alert({
          title: '🟥 两黄变一红',
          message: `<strong>#${player.number} ${escapeHtml(player.name)}</strong> 已累计两张黄牌，自动变为红牌罚下！`,
        });
        this._refresh();
        return;
      }
    } else if (cardType === 'card_red') {
      pc.red++;
      // Auto-remove red-carded player from field
      FootballPlayerPanel.handleRedCard(playerId, teamSide, teamId);
    }

    this._doQuickEvent(cardType, teamSide, null, playerId);

    Store.updateMatch(match.id, {
      playerCards: match.playerCards,
      events: match.events,
      teamStats: match.teamStats,
    });

    this._refresh();
  },

  _nextPeriod() {
    const match = this.match;
    const rules = match.rules || {};
    const config = getSportConfig(match.sportType);
    const periodName = rules.periods > 2 ? '节' : config.periodName;

    match.currentPeriod++;

    match.events.push(createEvent({
      gameTime: Timer.getElapsed(),
      period: match.currentPeriod,
      type: 'period_start',
      teamId: '',
      playerId: null,
      description: `第 ${match.currentPeriod} ${periodName}开始`,
    }));

    Timer.reset();

    // If beyond total periods and not overtime, finish
    if (match.currentPeriod > rules.periods && !match.isOvertime) {
      this._finishMatchAuto();
      return;
    }

    Store.updateMatch(match.id, {
      currentPeriod: match.currentPeriod,
      events: match.events,
    });

    this._refresh();
  },

  _handlePeriodEnd() {
    const match = this.match;
    const rules = match.rules || {};
    const config = getSportConfig(match.sportType);
    const periodName = rules.periods > 2 ? '节' : config.periodName;

    match.events.push(createEvent({
      gameTime: Timer.getElapsed(),
      period: match.currentPeriod,
      type: 'period_end',
      teamId: '',
      playerId: null,
      description: `第 ${match.currentPeriod} ${periodName}结束`,
    }));

    Store.updateMatch(match.id, { events: match.events });

    // If last period of regulation and score tied with overtime enabled
    if (match.currentPeriod >= rules.periods && match.homeScore === match.awayScore && rules.hasOvertime && !match.isOvertime) {
      Modal.show({
        title: '平局',
        content: `<p>常规时间结束，比分 ${match.homeScore} : ${match.awayScore} 平局。</p><p>是否进入加时赛？</p>`,
        confirmText: '进入加时赛 ⏱️',
        onConfirm: () => this._startOvertime(),
      });
    } else if (match.currentPeriod >= rules.periods) {
      Modal.alert({
        title: `${periodName}结束`,
        message: `第 ${match.currentPeriod} ${periodName}已结束。点击"下一${periodName}"继续或结束比赛。`,
      });
    } else {
      Modal.alert({
        title: `${periodName}结束`,
        message: `第 ${match.currentPeriod} ${periodName}已结束。点击"下一${periodName}"继续。`,
      });
    }

    this._refresh();
  },

  _startOvertime() {
    const match = this.match;
    const rules = match.rules || {};
    const config = getSportConfig(match.sportType);
    match.isOvertime = true;
    match.currentPeriod++;
    match.events.push(createEvent({
      gameTime: Timer.getElapsed(),
      period: match.currentPeriod,
      type: 'overtime_start',
      teamId: '',
      playerId: null,
      description: `加时赛开始 (${Math.round((rules.overtimeDuration || 300) / 60)}分钟)`,
    }));

    // Set timer for overtime
    Timer.setPeriodDuration(rules.overtimeDuration || 300);
    Timer.reset();

    Store.updateMatch(match.id, {
      isOvertime: true,
      currentPeriod: match.currentPeriod,
      events: match.events,
    });

    this._refresh();
  },

  _finishMatchAuto() {
    const match = this.match;
    Timer.pause();
    this._stopPossession();
    this._updatePossessionStats();
    match.status = 'finished';
    match.endTime = new Date().toISOString();
    match.events.push(createEvent({
      gameTime: Timer.getElapsed(),
      period: match.currentPeriod,
      type: 'period_end',
      teamId: '',
      playerId: null,
      description: '比赛结束',
    }));
    Store.updateMatch(match.id, {
      status: match.status,
      endTime: match.endTime,
      events: match.events,
    });
    this.render(Router.currentParams, this.container);
  },

  // ==================== possession tracking (football) ====================

  _renderPossessionPanel(match) {
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);
    const homeStats = match.teamStats[match.homeTeamId] || {};
    const awayStats = match.teamStats[match.awayTeamId] || {};
    const homePoss = homeStats.possession || 0;
    const awayPoss = awayStats.possession || 0;

    const activeTeam = this._possession?.currentTeam || '';
    const homeActive = activeTeam === 'home' ? 'active-poss' : '';
    const awayActive = activeTeam === 'away' ? 'active-poss' : '';

    return `
      <div class="possession-panel card">
        <h3 class="section-title">⚽ 控球率追踪</h3>
        <div class="poss-bar-wrapper">
          <div class="poss-bar">
            <div class="poss-bar-fill poss-bar-home" style="width:${homePoss}%;background:${homeTeam?.color || '#2563eb'}">
              ${homePoss > 10 ? homePoss + '%' : ''}
            </div>
            <div class="poss-bar-fill poss-bar-away" style="width:${awayPoss}%;background:${awayTeam?.color || '#dc2626'}">
              ${awayPoss > 10 ? awayPoss + '%' : ''}
            </div>
          </div>
          <div class="poss-labels">
            <span style="color:${homeTeam?.color || '#2563eb'}">${escapeHtml(homeTeam?.name || '主队')} ${homePoss}%</span>
            <span style="color:${awayTeam?.color || '#dc2626'}">${escapeHtml(awayTeam?.name || '客队')} ${awayPoss}%</span>
          </div>
        </div>
        ${match.status !== 'finished' ? `
        <div class="poss-buttons mt-sm">
          <button class="btn btn-sm poss-btn ${homeActive}" id="btn-poss-home" style="border-color:${homeTeam?.color || '#2563eb'};color:${homeTeam?.color || '#2563eb'}">
            ⚽ ${escapeHtml(homeTeam?.name || '主队')} 控球
          </button>
          <button class="btn btn-sm poss-btn ${awayActive}" id="btn-poss-away" style="border-color:${awayTeam?.color || '#dc2626'};color:${awayTeam?.color || '#dc2626'}">
            ⚽ ${escapeHtml(awayTeam?.name || '客队')} 控球
          </button>
        </div>
        ` : ''}
        <div class="text-center text-muted mt-sm" style="font-size:0.72rem">
          每30秒自动更新控球率
        </div>
      </div>
    `;
  },

  _initPossession(match) {
    // Clean up existing interval
    this._stopPossession();

    if (!match._possData) {
      match._possData = { homeSeconds: 0, awaySeconds: 0, currentTeam: null, lastSwitch: null };
    }

    this._possession = {
      currentTeam: null,
      intervalId: null,
    };

    // 30-second update interval
    this._possession.intervalId = setInterval(() => {
      this._updatePossessionStats();
    }, 30000);
  },

  _stopPossession() {
    if (this._possession?.intervalId) {
      clearInterval(this._possession.intervalId);
      this._possession.intervalId = null;
    }
  },

  _updatePossessionStats() {
    const match = this.match;
    if (!match || match.status === 'finished') {
      this._stopPossession();
      return;
    }

    const data = match._possData;
    if (!data) return;

    const total = data.homeSeconds + data.awaySeconds;
    if (total === 0) return;

    const homePoss = Math.round((data.homeSeconds / total) * 100);
    const awayPoss = Math.round((data.awaySeconds / total) * 100);

    const homeStats = match.teamStats[match.homeTeamId] || {};
    const awayStats = match.teamStats[match.awayTeamId] || {};
    homeStats.possession = homePoss;
    awayStats.possession = awayPoss;

    Store.updateMatch(match.id, { teamStats: match.teamStats });

    // Re-render team stats panel (possession is integrated)
    const teamStatsEl = document.getElementById('team-stats-container');
    if (teamStatsEl) {
      teamStatsEl.innerHTML = TeamStatsPanel.render(match);
      TeamStatsPanel.bindEvents(teamStatsEl, {
        onRefresh: () => this._refresh(),
        onPossession: (ts) => this._handlePossessionClick(ts),
      });
    }
  },

  _handlePossessionClick(teamSide) {
    const match = this.match;
    const data = match._possData;
    if (!data) return;

    const now = Date.now();

    if (data.currentTeam && data.lastSwitch) {
      const elapsed = Math.round((now - data.lastSwitch) / 1000);
      if (data.currentTeam === 'home') {
        data.homeSeconds += elapsed;
      } else {
        data.awaySeconds += elapsed;
      }
    }

    data.currentTeam = teamSide;
    data.lastSwitch = now;

    // Mark active team for display
    match._possessionActive = teamSide;
    this._possession.currentTeam = teamSide;

    Store.updateMatch(match.id, { _possData: data, _possessionActive: teamSide });

    // Refresh team stats panel to show active button
    const teamStatsEl = document.getElementById('team-stats-container');
    if (teamStatsEl) {
      teamStatsEl.innerHTML = TeamStatsPanel.render(match);
      TeamStatsPanel.bindEvents(teamStatsEl, {
        onRefresh: () => this._refresh(),
        onPossession: (ts) => this._handlePossessionClick(ts),
      });
    }
  },

  _finishMatch() {
    Modal.show({
      title: '结束比赛',
      content: `<p>确定结束比赛 "<strong>${escapeHtml(this.match.name)}</strong>" 吗？</p><p class="text-muted">结束后将无法再修改数据。</p>`,
      confirmText: '结束比赛',
      danger: true,
      onConfirm: () => {
        Timer.pause();
        this._stopPossession();
        // Flush final possession stats
        this._updatePossessionStats();
        Store.updateMatch(this.match.id, {
          status: 'finished',
          endTime: new Date().toISOString(),
        });
        this.render(Router.currentParams, this.container);
      },
    });
  },

  _isFirstToWinner(match) {
    const rules = match.rules || {};
    if (rules.winCondition !== 'firstTo') return false;
    return match.homeScore >= rules.firstToScore || match.awayScore >= rules.firstToScore;
  },

  // ==================== refresh (no full re-render) ====================

  _refresh() {
    const match = Store.getMatch(this.match.id);
    if (!match) return;
    this.match = match;

    const scoreboardEl = document.getElementById('scoreboard-container');
    if (scoreboardEl) scoreboardEl.innerHTML = ScoreBoard.render(match);

    const eventLogEl = document.getElementById('event-log-container');
    if (eventLogEl) eventLogEl.innerHTML = EventLog.render(match);

    const playerPanelEl = document.getElementById('player-panel-container');
    if (playerPanelEl && match.sportType === 'basketball') {
      playerPanelEl.innerHTML = PlayerPanel.render(match);
      // PlayerPanel bindEvents is handled in _bindAllEvents below
    }

    const teamStatsEl = document.getElementById('team-stats-container');
    if (teamStatsEl && match.sportType === 'football') {
      teamStatsEl.innerHTML = TeamStatsPanel.render(match);
    }

    const customStatsEl = document.getElementById('custom-stats-container');
    if (customStatsEl && match.sportType === 'custom') {
      customStatsEl.innerHTML = this._renderCustomStatsPanel(match);
    }

    // Re-render football player panel
    if (match.sportType === 'football') {
      const fpEl = document.getElementById('football-player-panel-container');
      if (fpEl) fpEl.innerHTML = FootballPlayerPanel.render(match);
    }

    // Re-render quick events (fix: was missing — caused duplicate listeners)
    const quickEventsEl = document.getElementById('quick-events-container');
    if (quickEventsEl) {
      quickEventsEl.innerHTML = `
        <h3 class="section-title">⚡ 快速记录</h3>
        ${this._renderQuickEvents(match)}
      `;
    }

    // Re-bind events for all dynamic content
    this._bindAllEvents(match);

    // Update header buttons visibility
    const finishBtn = document.getElementById('btn-finish-match');
    const periodBtn = document.getElementById('btn-period-next');
    const overtimeBtn = document.getElementById('btn-overtime');
    if (match.status === 'finished' || this._isFirstToWinner(match)) {
      if (finishBtn) finishBtn.style.display = 'none';
      if (periodBtn) periodBtn.style.display = 'none';
      if (overtimeBtn) overtimeBtn.style.display = 'none';
    }
  },
};
