/**
 * 篮球球员面板（右侧）
 * 显示当前在场上的球员，点击弹出快捷操作按钮
 * - 得分（罚球/投篮/三分）
 * - 篮板（进攻/防守）
 * - 助攻、盖帽、抢断、犯规、失误
 */
const PlayerPanel = {
  match: null,
  homeTeam: null,
  awayTeam: null,
  container: null,
  callbacks: null,
  _activePopover: null,

  render(match) {
    this.match = match;
    this.homeTeam = Store.getTeam(match.homeTeamId);
    this.awayTeam = Store.getTeam(match.awayTeamId);

    const renderActivePlayers = (team, side) => {
      if (!team) return '<p class="text-muted">未设置队伍</p>';
      const activeIds = side === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
      const activePlayers = team.players.filter(p => activeIds.includes(p.id));

      if (activePlayers.length === 0) {
        return `<p class="text-muted" style="font-size:0.8rem">
          暂无场上球员<br><small>点击下方球员头像使其上场</small>
        </p>`;
      }

      return `
        <div class="active-player-chips">
          ${activePlayers.map(p => {
            const stats = match.playerStats[p.id];
            const pts = stats?.pts || 0;
            return `
              <div class="active-player-chip"
                   data-player-id="${p.id}"
                   data-team-side="${side}"
                   data-team-id="${team.id}"
                   title="点击记录数据">
                <span class="apc-number">#${p.number}</span>
                <span class="apc-name">${escapeHtml(p.name)}</span>
                <span class="apc-pts">${pts}pts</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    const renderBench = (team, side) => {
      if (!team) return '';
      const activeIds = side === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
      const benchPlayers = team.players.filter(p => !activeIds.includes(p.id));
      if (benchPlayers.length === 0) return '';

      return `
        <div class="bench-section">
          <span class="bench-label">替补</span>
          <div class="bench-chips">
            ${benchPlayers.map(p => `
              <span class="bench-chip" data-player-id="${p.id}" data-team-side="${side}" data-team-id="${team.id}" title="点击上场">
                #${p.number} ${escapeHtml(p.name)}
              </span>
            `).join('')}
          </div>
        </div>
      `;
    };

    return `
      <div class="player-panel-right card">
        <h3 class="section-title">🏀 场上球员</h3>
        <div class="ppr-teams">
          <div class="ppr-team">
            <h4 style="color:${this.homeTeam?.color || '#2563eb'}">
              <span class="team-dot" style="background:${this.homeTeam?.color || '#2563eb'}"></span>
              ${escapeHtml(this.homeTeam?.name || '主队')}
            </h4>
            <div class="ppr-active">${renderActivePlayers(this.homeTeam, 'home')}</div>
            ${renderBench(this.homeTeam, 'home')}
          </div>
          <div class="ppr-divider"></div>
          <div class="ppr-team">
            <h4 style="color:${this.awayTeam?.color || '#dc2626'}">
              <span class="team-dot" style="background:${this.awayTeam?.color || '#dc2626'}"></span>
              ${escapeHtml(this.awayTeam?.name || '客队')}
            </h4>
            <div class="ppr-active">${renderActivePlayers(this.awayTeam, 'away')}</div>
            ${renderBench(this.awayTeam, 'away')}
          </div>
        </div>
      </div>
    `;
  },

  bindEvents(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    const match = this.match;
    if (match.status === 'finished') return;

    // Click active player → show action popover
    container.querySelectorAll('.active-player-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = chip.dataset.playerId;
        const teamSide = chip.dataset.teamSide;
        const teamId = chip.dataset.teamId;
        this._showActionPopover(chip, playerId, teamSide, teamId);
      });
    });

    // Click bench player → sub in
    container.querySelectorAll('.bench-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const playerId = chip.dataset.playerId;
        const teamSide = chip.dataset.teamSide;
        const teamId = chip.dataset.teamId;
        this._subInPlayer(playerId, teamSide, teamId);
      });
    });

    // Click outside to close popover
    document.addEventListener('click', () => this._closePopover());
  },

  _showActionPopover(anchorEl, playerId, teamSide, teamId) {
    this._closePopover();

    const team = Store.getTeam(teamId);
    const player = team?.players.find(p => p.id === playerId);
    if (!player) return;

    const popover = document.createElement('div');
    popover.className = 'player-action-popover';
    popover.innerHTML = `
      <div class="pap-header">
        <strong>#${player.number} ${escapeHtml(player.name)}</strong>
        <span class="pap-position">${escapeHtml(player.position)}</span>
      </div>
      <div class="pap-actions">
        <button class="pap-btn pap-btn-pts" data-action="score" data-value="2">🏀 投篮 +2</button>
        <button class="pap-btn pap-btn-three" data-action="score" data-value="3">🎯 三分 +3</button>
        <button class="pap-btn pap-btn-ft" data-action="score" data-value="1">📍 罚球 +1</button>
        <button class="pap-btn" data-action="rebound">🔄 篮板</button>
        <button class="pap-btn" data-action="assist">🤝 助攻</button>
        <button class="pap-btn" data-action="block">✋ 盖帽</button>
        <button class="pap-btn" data-action="steal">⚡ 抢断</button>
        <button class="pap-btn" data-action="foul">⚠️ 犯规</button>
        <button class="pap-btn" data-action="turnover">❌ 失误</button>
        <button class="pap-btn pap-btn-sub-out" data-action="sub-out">🔄 下场</button>
      </div>
      <div class="pap-footer">
        <button class="btn btn-sm btn-outline" data-action="detail">📋 详细数据</button>
      </div>
    `;
    document.body.appendChild(popover);
    this._activePopover = popover;

    // Position popover near the anchor
    this._positionPopover(anchorEl, popover);

    // Bind popover actions
    popover.querySelectorAll('.pap-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const value = parseInt(btn.dataset.value) || 0;

        switch (action) {
          case 'score':
            this._recordScore(playerId, teamSide, teamId, value, player);
            break;
          case 'rebound':
            this._showReboundChoice(playerId, teamSide, teamId, player, popover);
            return; // don't close yet
          case 'assist':
            this._recordStat(playerId, teamSide, teamId, 'ast', 1, `${player.name} 助攻`);
            break;
          case 'block':
            this._recordStat(playerId, teamSide, teamId, 'blk', 1, `${player.name} 盖帽`);
            break;
          case 'steal':
            this._recordStat(playerId, teamSide, teamId, 'stl', 1, `${player.name} 抢断`);
            break;
          case 'foul':
            this._recordStat(playerId, teamSide, teamId, 'pf', 1, `${player.name} 犯规`);
            break;
          case 'turnover':
            this._recordStat(playerId, teamSide, teamId, 'tov', 1, `${player.name} 失误`);
            break;
          case 'sub-out':
            this._subOutPlayer(playerId, teamSide, teamId, player);
            break;
          case 'detail':
            this._showDetailModal(playerId, teamSide, teamId);
            break;
        }
        this._closePopover();
      });
    });

    // "详细数据" button
    popover.querySelector('[data-action="detail"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._closePopover();
      this._showDetailModal(playerId, teamSide, teamId);
    });
  },

  _positionPopover(anchorEl, popover) {
    const rect = anchorEl.getBoundingClientRect();
    const popoverW = 240;
    const popoverH = popover.offsetHeight || 400;

    let left = rect.left + rect.width / 2 - popoverW / 2;
    let top = rect.bottom + 6;

    // Keep in viewport
    if (left < 8) left = 8;
    if (left + popoverW > window.innerWidth - 8) left = window.innerWidth - popoverW - 8;
    if (top + popoverH > window.innerHeight - 8) {
      top = rect.top - popoverH - 6;
    }
    if (top < 8) top = 8;

    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
  },

  _closePopover() {
    if (this._activePopover) {
      this._activePopover.remove();
      this._activePopover = null;
    }
  },

  // ---- stat recording ----

  _recordScore(playerId, teamSide, teamId, value, player) {
    const match = this.match;
    const elapsed = Timer.getElapsed();
    ensurePlayerStats(match, playerId);
    const stats = match.playerStats[playerId];

    stats.pts += value;
    if (value === 3) {
      stats.threePm++; stats.threePa++;
      stats.fgm++; stats.fga++;
    } else if (value === 2) {
      stats.fgm++; stats.fga++;
    } else if (value === 1) {
      stats.ftm++; stats.fta++;
    }

    if (teamSide === 'home') match.homeScore += value;
    else match.awayScore += value;

    const labels = { 1: '罚球', 2: '投篮', 3: '三分' };
    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: 'score',
      teamId,
      playerId,
      value,
      description: `#${player.number} ${player.name} — ${labels[value] || ''} +${value}`,
    }));

    Store.updateMatch(match.id, {
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      playerStats: match.playerStats,
      events: match.events,
    });

    // Check first-to-N win
    const rules = match.rules || {};
    if (rules.winCondition === 'firstTo' && rules.firstToScore > 0) {
      if (match.homeScore >= rules.firstToScore || match.awayScore >= rules.firstToScore) {
        this.callbacks?.onFirstToWin?.();
        return;
      }
    }

    this.callbacks?.onRefresh();
  },

  _showReboundChoice(playerId, teamSide, teamId, player, anchorPopover) {
    // Replace popover content with oreb/dreb choice
    anchorPopover.querySelector('.pap-actions').innerHTML = `
      <button class="pap-btn" data-reb="oreb">⬆️ 进攻篮板</button>
      <button class="pap-btn" data-reb="dreb">⬇️ 防守篮板</button>
      <button class="pap-btn pap-btn-cancel">↩ 返回</button>
    `;
    anchorPopover.querySelector('.pap-header').innerHTML = `
      <strong>篮板 — #${player.number} ${escapeHtml(player.name)}</strong>
    `;

    const actionsEl = anchorPopover.querySelector('.pap-actions');
    actionsEl.querySelectorAll('.pap-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const reb = btn.dataset.reb;
        if (reb) {
          this._recordStat(playerId, teamSide, teamId, reb, 1,
            `${player.name} ${reb === 'oreb' ? '进攻篮板' : '防守篮板'}`);
        }
        this._closePopover();
      });
    });
  },

  _recordStat(playerId, teamSide, teamId, statKey, value, desc) {
    const match = this.match;
    const elapsed = Timer.getElapsed();
    ensurePlayerStats(match, playerId);
    match.playerStats[playerId][statKey] = (match.playerStats[playerId][statKey] || 0) + value;

    // For rebounds, also record a general event
    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: statKey === 'oreb' || statKey === 'dreb' ? 'rebound' : statKey,
      teamId,
      playerId,
      value,
      description: desc,
    }));

    Store.updateMatch(match.id, {
      playerStats: match.playerStats,
      events: match.events,
    });

    this.callbacks?.onRefresh();
  },

  _subInPlayer(playerId, teamSide, teamId) {
    const match = this.match;
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
    if (activeList.includes(playerId)) return;

    // Max 5 players on court
    if (activeList.length >= 5) {
      this._showSubOutFirst(playerId, teamSide, teamId);
      return;
    }

    this._doSubIn(playerId, teamSide, teamId);
  },

  _doSubIn(playerId, teamSide, teamId) {
    const match = this.match;
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
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

    this.callbacks?.onRefresh();
  },

  /** 场上已满5人时，先选择要换下的球员 */
  _showSubOutFirst(newPlayerId, teamSide, teamId) {
    const match = this.match;
    const team = Store.getTeam(teamId);
    const newPlayer = team?.players.find(p => p.id === newPlayerId);
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
    const activePlayers = team?.players.filter(p => activeList.includes(p.id)) || [];

    const listHTML = activePlayers.map(p => `
      <button class="card-player-btn" data-player-id="${p.id}">
        <span>#${p.number} ${escapeHtml(p.name)}</span>
        <span style="font-size:0.75rem;color:var(--color-text-muted)">换下</span>
      </button>
    `).join('');

    Modal.show({
      title: '场上已有5名球员',
      content: `
        <p style="font-size:0.9rem;margin-bottom:12px">
          要将 <strong>#${newPlayer?.number || '?'} ${escapeHtml(newPlayer?.name || '')}</strong> 换上，请先选择一名球员换下：
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
          // Sub out the old player, then sub in the new one
          this._doSubOutOnly(outPlayerId, teamSide, teamId);
          this._doSubIn(newPlayerId, teamSide, teamId);
        });
      });
    }, 50);
  },

  _subOutPlayer(playerId, teamSide, teamId, player) {
    const match = this.match;
    const activeList = teamSide === 'home' ? match.homeActivePlayers : match.awayActivePlayers;
    const idx = activeList.indexOf(playerId);
    if (idx === -1) return;

    activeList.splice(idx, 1);
    const elapsed = Timer.getElapsed();

    match.events.push(createEvent({
      gameTime: elapsed,
      period: match.currentPeriod,
      type: 'substitution',
      teamId,
      playerId,
      description: `#${player.number} ${player.name} 下场`,
    }));

    Store.updateMatch(match.id, {
      homeActivePlayers: match.homeActivePlayers,
      awayActivePlayers: match.awayActivePlayers,
      events: match.events,
    });

    // Show bench players so user can pick a replacement
    const team = Store.getTeam(teamId);
    const benchPlayers = team?.players.filter(p =>
      !match.homeActivePlayers.includes(p.id) && !match.awayActivePlayers.includes(p.id)
    ) || [];

    if (benchPlayers.length > 0) {
      this._showReplacementPicker(benchPlayers, teamSide, teamId, player, elapsed);
    } else {
      this.callbacks?.onRefresh();
    }
  },

  /** Just remove a player without replacement prompt (used by swap flow) */
  _doSubOutOnly(playerId, teamSide, teamId) {
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
  },

  /** After subbing out, offer to pick a replacement from the bench */
  _showReplacementPicker(benchPlayers, teamSide, teamId, outPlayer, elapsed) {
    const listHTML = benchPlayers.map(p => `
      <button class="card-player-btn" data-player-id="${p.id}">
        <span>#${p.number} ${escapeHtml(p.name)}</span>
        <span style="color:var(--color-success);font-size:0.75rem">换上</span>
      </button>
    `).join('');

    // Use a floating popover near the last action area
    const panel = document.querySelector('.player-panel-right');
    const popover = document.createElement('div');
    popover.className = 'player-action-popover';
    popover.style.width = '260px';
    popover.innerHTML = `
      <div class="pap-header">
        <strong>选择替补上场</strong>
        <span style="font-size:0.75rem;color:var(--color-text-muted)">替下 #${outPlayer.number} ${escapeHtml(outPlayer.name)}</span>
      </div>
      <div class="card-player-list">${listHTML}</div>
      <button class="btn btn-ghost btn-sm mt-sm" style="width:100%" data-action="skip-replace">跳过（不上替补）</button>
    `;
    document.body.appendChild(popover);

    // Position near the right panel
    if (panel) {
      const rect = panel.getBoundingClientRect();
      popover.style.position = 'fixed';
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

    // Close on outside click
    setTimeout(() => {
      const handler = (e) => {
        if (!popover.contains(e.target)) {
          close();
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 50);
  },

  _showDetailModal(playerId, teamSide, teamId) {
    const match = this.match;
    const team = Store.getTeam(teamId);
    const player = team?.players.find(p => p.id === playerId);
    if (!player) return;

    const config = getSportConfig('basketball');
    const stats = match.playerStats[playerId] || createBasketballPlayerStats();

    const statFieldsHTML = config.playerStatFields
      .filter(f => !f.hidden)
      .map(field => {
        return `
          <div class="stat-input-row">
            <span class="stat-input-label">${field.icon || ''} ${field.label}</span>
            <div class="stat-input-controls">
              <button class="btn btn-sm btn-outline stat-dec" data-key="${field.key}">−</button>
              <span class="stat-input-value" data-key="${field.key}">${stats[field.key] || 0}</span>
              <button class="btn btn-sm btn-outline stat-inc" data-key="${field.key}">+</button>
            </div>
          </div>
        `;
      }).join('');

    Modal.show({
      title: `编辑数据 — #${player.number} ${escapeHtml(player.name)}`,
      content: `<div class="stat-input-list">${statFieldsHTML}</div>`,
      confirmText: '保存',
      onConfirm: () => {
        document.querySelectorAll('.stat-input-value').forEach(el => {
          const key = el.dataset.key;
          stats[key] = parseInt(el.textContent) || 0;
        });
        // Recalculate pts
        stats.pts = (stats.fgm - stats.threePm) * 2 + stats.threePm * 3 + stats.ftm;
        if (!match.playerStats[playerId]) match.playerStats[playerId] = stats;
        Store.updateMatch(match.id, { playerStats: match.playerStats });
        this.callbacks?.onRefresh();
      },
    });

    setTimeout(() => {
      document.querySelectorAll('.stat-inc').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          const valEl = document.querySelector(`.stat-input-value[data-key="${key}"]`);
          if (valEl) valEl.textContent = parseInt(valEl.textContent) + 1;
        });
      });
      document.querySelectorAll('.stat-dec').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          const valEl = document.querySelector(`.stat-input-value[data-key="${key}"]`);
          if (valEl && parseInt(valEl.textContent) > 0) {
            valEl.textContent = parseInt(valEl.textContent) - 1;
          }
        });
      });
    }, 100);
  },
};
