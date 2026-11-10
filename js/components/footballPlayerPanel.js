/**
 * 足球球员面板（右侧）
 * 显示首发阵容（11人）和替补球员
 * 点击球员可换下，点击替补可换上（一换一）
 * 红牌球员自动离场
 */
const FootballPlayerPanel = {
  match: null,
  homeTeam: null,
  awayTeam: null,
  container: null,
  callbacks: null,
  MAX_ON_FIELD: 11,

  render(match) {
    this.match = match;
    this.homeTeam = Store.getTeam(match.homeTeamId);
    this.awayTeam = Store.getTeam(match.awayTeamId);

    const renderSide = (team, side) => {
      if (!team) return '<p class="text-muted">未设置队伍</p>';
      const activeIds = side === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
      const activePlayers = team.players.filter(p => activeIds.includes(p.id));
      const benchPlayers = team.players.filter(p =>
        !activeIds.includes(p.id) && !this._isRedCarded(match, p.id)
      );

      const playerChips = activePlayers.map(p => {
        const cards = (match.playerCards || {})[p.id] || {};
        let badges = '';
        if (cards.yellow > 0) badges += `<span class="fp-card-badge yellow">🟨</span>`;
        if (cards.red > 0 || cards.redSecond > 0) badges += `<span class="fp-card-badge red">🟥</span>`;
        return `
          <div class="fp-player-chip ${match.status !== 'finished' ? 'clickable' : ''}"
               data-player-id="${p.id}" data-team-side="${side}" data-team-id="${team.id}"
               title="${match.status !== 'finished' ? '点击换下' : ''}">
            <span class="fp-number">#${p.number}</span>
            <span class="fp-name">${escapeHtml(p.name)}</span>
            ${badges}
          </div>
        `;
      }).join('');

      const benchChips = benchPlayers.map(p => {
        const cards = (match.playerCards || {})[p.id] || {};
        let badges = '';
        if (cards.yellow > 0) badges += `<span class="fp-card-badge yellow">🟨</span>`;
        return `
          <div class="fp-bench-chip ${match.status !== 'finished' ? 'clickable' : ''}"
               data-player-id="${p.id}" data-team-side="${side}" data-team-id="${team.id}"
               title="${match.status !== 'finished' ? '点击换上' : ''}">
            <span class="fp-number">#${p.number}</span>
            <span class="fp-name">${escapeHtml(p.name)}</span>
            ${badges}
          </div>
        `;
      }).join('');

      return `
        <div class="fp-team-section">
          <h4 style="color:${team.color};display:flex;align-items:center;gap:6px;">
            <span class="team-dot" style="background:${team.color}"></span>
            ${escapeHtml(team.name)}
            <span style="font-size:0.7rem;color:var(--color-text-muted);font-weight:400;">
              (场上${activePlayers.length}/${this.MAX_ON_FIELD})
            </span>
          </h4>
          <div class="fp-active-list">${playerChips || '<p class="text-muted" style="font-size:0.75rem;">首发未设置</p>'}</div>
          ${benchChips ? `
          <div class="fp-bench-section">
            <span class="bench-label">替补 (${benchPlayers.length}人)</span>
            <div class="fp-bench-list">${benchChips}</div>
          </div>` : ''}
        </div>
      `;
    };

    return `
      <div class="football-player-panel card">
        <h3 class="section-title">⚽ 球员阵容</h3>
        <div class="fp-teams">
          ${renderSide(this.homeTeam, 'home')}
          <div class="fp-divider"></div>
          ${renderSide(this.awayTeam, 'away')}
        </div>
        ${match.status !== 'finished' ? `
        <div class="text-center text-muted mt-sm" style="font-size:0.72rem;">
          点击场上球员换下 | 点击替补换上 | 最多${this.MAX_ON_FIELD}人
        </div>` : ''}
      </div>
    `;
  },

  bindEvents(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    if (this.match.status === 'finished') return;

    // Click active player → sub out
    container.querySelectorAll('.fp-player-chip.clickable').forEach(chip => {
      chip.addEventListener('click', () => {
        const playerId = chip.dataset.playerId;
        const teamSide = chip.dataset.teamSide;
        const teamId = chip.dataset.teamId;
        this._subOutPlayer(playerId, teamSide, teamId);
      });
    });

    // Click bench player → sub in
    container.querySelectorAll('.fp-bench-chip.clickable').forEach(chip => {
      chip.addEventListener('click', () => {
        const playerId = chip.dataset.playerId;
        const teamSide = chip.dataset.teamSide;
        const teamId = chip.dataset.teamId;
        this._subInPlayer(playerId, teamSide, teamId);
      });
    });
  },

  _isRedCarded(match, playerId) {
    const cards = (match.playerCards || {})[playerId];
    if (!cards) return false;
    return (cards.red || 0) > 0 || (cards.redSecond || 0) > 0;
  },

  _subInPlayer(playerId, teamSide, teamId) {
    const match = this.match;
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
    if (activeList.includes(playerId)) return;

    // Check red card — cannot sub in a red-carded player
    if (this._isRedCarded(match, playerId)) {
      Modal.alert({ title: '无法上场', message: '该球员已被红牌罚下，本场比赛不可再上场。' });
      return;
    }

    // Max 11 check — must swap
    if (activeList.length >= this.MAX_ON_FIELD) {
      this._showSwapSelector(playerId, teamSide, teamId);
      return;
    }

    this._doSubIn(playerId, teamSide, teamId);
    this.callbacks?.onRefresh();
  },

  _subOutPlayer(playerId, teamSide, teamId) {
    const match = this.match;
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
    const idx = activeList.indexOf(playerId);
    if (idx === -1) return;

    activeList.splice(idx, 1);
    const team = Store.getTeam(teamId);
    const player = team?.players.find(p => p.id === playerId);
    const elapsed = Timer.getElapsed();

    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: 'substitution',
      teamId,
      playerId,
      description: `#${player?.number || '?'} ${player?.name || ''} 下场`,
    }));

    Store.updateMatch(match.id, {
      homeActivePlayers: match.homeActivePlayers,
      awayActivePlayers: match.awayActivePlayers,
      events: match.events,
    });

    // Show replacement picker
    const benchPlayers = team?.players.filter(p =>
      !match.homeActivePlayers.includes(p.id) && !match.awayActivePlayers.includes(p.id) &&
      !this._isRedCarded(match, p.id)
    ) || [];

    if (benchPlayers.length > 0) {
      this._showReplacementPicker(benchPlayers, teamSide, teamId, player);
    } else {
      this.callbacks?.onRefresh();
    }
  },

  _doSubIn(playerId, teamSide, teamId) {
    const match = this.match;
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
    if (activeList.includes(playerId)) return;
    activeList.push(playerId);

    const team = Store.getTeam(teamId);
    const player = team?.players.find(p => p.id === playerId);
    const elapsed = Timer.getElapsed();

    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: 'substitution',
      teamId,
      playerId,
      description: `#${player?.number || '?'} ${player?.name || ''} 上场`,
    }));

    Store.updateMatch(match.id, {
      homeActivePlayers: match.homeActivePlayers,
      awayActivePlayers: match.awayActivePlayers,
      events: match.events,
    });
  },

  _showSwapSelector(newPlayerId, teamSide, teamId) {
    const match = this.match;
    const team = Store.getTeam(teamId);
    const newPlayer = team?.players.find(p => p.id === newPlayerId);
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
    const activePlayers = team?.players.filter(p => activeList.includes(p.id)) || [];

    const listHTML = activePlayers.map(p => `
      <button class="card-player-btn" data-player-id="${p.id}">
        <span>#${p.number} ${escapeHtml(p.name)}</span>
        <span style="color:var(--color-text-muted);font-size:0.75rem">换下</span>
      </button>
    `).join('');

    Modal.show({
      title: `场上已有${this.MAX_ON_FIELD}名球员`,
      content: `
        <p style="font-size:0.9rem;margin-bottom:12px">
          要将 <strong>#${newPlayer?.number || '?'} ${escapeHtml(newPlayer?.name || '')}</strong> 换上，请选择一名球员换下：
        </p>
        <div class="card-player-list">${listHTML}</div>
      `,
      showCancel: true,
      confirmText: '取消',
      onConfirm: () => {},
    });

    setTimeout(() => {
      document.querySelectorAll('.card-player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const outPlayerId = btn.dataset.playerId;
          Modal.close();
          const activeList2 = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
          const idx = activeList2.indexOf(outPlayerId);
          if (idx > -1) activeList2.splice(idx, 1);
          this._doSubIn(newPlayerId, teamSide, teamId);
          this.callbacks?.onRefresh();
        });
      });
    }, 50);
  },

  _showReplacementPicker(benchPlayers, teamSide, teamId, outPlayer) {
    const listHTML = benchPlayers.map(p => `
      <button class="card-player-btn" data-player-id="${p.id}">
        <span>#${p.number} ${escapeHtml(p.name)}</span>
        <span style="color:var(--color-success);font-size:0.75rem">换上</span>
      </button>
    `).join('');

    const panel = document.querySelector('.football-player-panel');
    const popover = document.createElement('div');
    popover.className = 'player-action-popover';
    popover.style.width = '260px';
    popover.innerHTML = `
      <div class="pap-header">
        <strong>选择替补上场</strong>
        <span style="font-size:0.75rem;color:var(--color-text-muted)">替下 #${outPlayer?.number || '?'} ${escapeHtml(outPlayer?.name || '')}</span>
      </div>
      <div class="card-player-list">${listHTML}</div>
      <button class="btn btn-ghost btn-sm mt-sm" style="width:100%" data-action="skip-replace">跳过（不上替补）</button>
    `;
    document.body.appendChild(popover);

    if (panel) {
      const rect = panel.getBoundingClientRect();
      popover.style.left = Math.max(8, rect.left) + 'px';
      popover.style.top = Math.min(window.innerHeight - 420, rect.top + 100) + 'px';
    }

    const close = () => {
      popover.remove();
      this.callbacks?.onRefresh();
    };

    popover.querySelectorAll('.card-player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const inPlayerId = btn.dataset.playerId;
        popover.remove();
        this._doSubIn(inPlayerId, teamSide, teamId);
        this.callbacks?.onRefresh();
      });
    });
    popover.querySelector('[data-action="skip-replace"]')?.addEventListener('click', close);

    setTimeout(() => {
      const handler = (e) => {
        if (!popover.contains(e.target)) { close(); document.removeEventListener('click', handler); }
      };
      document.addEventListener('click', handler);
    }, 50);
  },

  /** Called from match.js when a red card is issued — auto-remove from field */
  handleRedCard(playerId, teamSide, teamId) {
    const match = this.match;
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
    const idx = activeList.indexOf(playerId);
    if (idx === -1) return;
    activeList.splice(idx, 1);

    Store.updateMatch(match.id, {
      homeActivePlayers: match.homeActivePlayers,
      awayActivePlayers: match.awayActivePlayers,
    });
  },
};
