/**
 * 事件时间线组件
 */
const EventLog = {
  match: null,
  config: null,
  filterType: null, // null = 全部

  render(match) {
    this.match = match;
    this.config = getSportConfig(match.sportType);
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);

    // Filter events
    let events = [...match.events];
    if (this.filterType) {
      events = events.filter(e => e.type === this.filterType);
    }
    // 最新在前
    events.reverse();

    // Collect event types for filter tabs
    const eventTypes = new Set(match.events.map(e => e.type));

    const filterTabsHTML = `
      <div class="filter-tabs mb-sm">
        <button class="filter-tab ${this.filterType === null ? 'active' : ''}" data-type="">全部</button>
        ${[...eventTypes].map(t => {
          const info = this.config.eventTypes[t] || { label: t, icon: '' };
          return `<button class="filter-tab ${this.filterType === t ? 'active' : ''}" data-type="${t}">${info.icon} ${info.label}</button>`;
        }).join('')}
      </div>
    `;

    const eventsHTML = events.length === 0
      ? '<div class="empty-state"><p>暂无事件记录</p></div>'
      : events.map(e => this._renderEvent(e, homeTeam, awayTeam)).join('');

    return `
      <div class="event-log card">
        <h3 class="section-title">📋 事件时间线 <span class="text-muted">(${match.events.length}条)</span></h3>
        ${eventTypes.size > 0 ? filterTabsHTML : ''}
        <div class="event-list">
          ${eventsHTML}
        </div>
      </div>
    `;
  },

  _renderEvent(event, homeTeam, awayTeam) {
    const info = this.config.eventTypes[event.type] || { label: event.type, icon: '📌' };
    const team = event.teamId === this.match.homeTeamId ? homeTeam : awayTeam;
    const teamName = team?.name || '';
    const teamColor = team?.color || '#999';

    let playerName = '';
    if (event.playerId && team) {
      const player = team.players.find(p => p.id === event.playerId);
      if (player) playerName = `#${player.number} ${player.name}`;
    }

    return `
      <div class="event-item">
        <div class="event-time">${formatTime(event.gameTime)}</div>
        <div class="event-icon">${info.icon}</div>
        <div class="event-content">
          <span class="event-team-badge" style="border-left:3px solid ${teamColor}">${escapeHtml(teamName)}</span>
          ${playerName ? `<span class="event-player">${escapeHtml(playerName)}</span>` : ''}
          <span class="event-desc">${escapeHtml(event.description) || info.label}</span>
        </div>
        <button class="btn btn-ghost btn-sm event-delete-btn" data-event-id="${event.id}" title="删除此事件">✕</button>
      </div>
    `;
  },

  bindEvents(container, callbacks) {
    // Filter tabs
    container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.filterType = tab.dataset.type || null;
        callbacks.onRefresh();
      });
    });

    // Delete event
    container.querySelectorAll('.event-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const eventId = btn.dataset.eventId;
        const confirmed = await Modal.confirm({
          title: '删除事件',
          message: '确定要删除这条事件记录吗？此操作不可撤销。',
        });
        if (confirmed) {
          this.match.events = this.match.events.filter(e => e.id !== eventId);
          Store.updateMatch(this.match.id, { events: this.match.events });
          callbacks.onRefresh();
        }
      });
    });
  },
};
