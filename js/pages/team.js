/**
 * 队伍管理页
 */
const TeamPage = {
  container: null,

  render(params, container) {
    this.container = container;
    const teams = Store.getTeams();

    container.innerHTML = `
      <div class="page-header">
        <div class="page-heading">
          <span class="eyebrow">ROSTER</span>
          <h1>队伍管理</h1>
          <p class="page-subtitle">维护队伍资料与球员名单，创建比赛时可直接选用。</p>
        </div>
        <button class="btn btn-primary" id="btn-new-team">+ 新建队伍</button>
      </div>
      <div id="team-list">
        ${teams.length === 0 ? this._emptyState() : teams.map(t => this._renderTeam(t)).join('')}
      </div>
    `;

    this._bindEvents();
  },

  _emptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>暂无队伍</p>
        <p class="text-muted">点击"新建队伍"创建你的第一支队伍！</p>
      </div>
    `;
  },

  _renderTeam(team) {
    const players = team.players || [];
    return `
      <div class="team-card card mb-md" data-team-id="${team.id}">
        <div class="team-card-header">
          <div class="flex items-center gap-sm">
            <div class="team-color-dot-lg" style="background:${team.color}"></div>
            <h2>${escapeHtml(team.name)}</h2>
            <span class="text-muted">(${players.length}名球员)</span>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-sm btn-outline btn-edit-team" data-id="${team.id}">✏️ 编辑</button>
            <button class="btn btn-sm btn-danger btn-delete-team" data-id="${team.id}">🗑 删除</button>
          </div>
        </div>
        <div class="player-list">
          <div class="player-list-header">
            <span class="player-col-num">号码</span>
            <span class="player-col-name">姓名</span>
            <span class="player-col-pos">位置</span>
            <span class="player-col-actions">操作</span>
          </div>
          ${players.length === 0
            ? '<p class="text-muted" style="padding:12px">暂无球员</p>'
            : players.map(p => this._renderPlayer(team, p)).join('')
          }
        </div>
        <button class="btn btn-sm btn-outline btn-add-player mt-sm" data-team-id="${team.id}">+ 添加球员</button>
      </div>
    `;
  },

  _renderPlayer(team, player) {
    return `
      <div class="player-row" data-player-id="${player.id}">
        <span class="player-col-num"><strong>#${player.number}</strong></span>
        <span class="player-col-name">${escapeHtml(player.name)}</span>
        <span class="player-col-pos">${escapeHtml(player.position) || '-'}</span>
        <span class="player-col-actions">
          <button class="btn btn-ghost btn-sm btn-edit-player" data-team-id="${team.id}" data-player-id="${player.id}">✏️</button>
          <button class="btn btn-ghost btn-sm btn-delete-player" data-team-id="${team.id}" data-player-id="${player.id}">🗑</button>
        </span>
      </div>
    `;
  },

  _bindEvents() {
    // New team
    document.getElementById('btn-new-team')?.addEventListener('click', () => this._showTeamForm(null));

    // Edit team
    this.container.querySelectorAll('.btn-edit-team').forEach(btn => {
      btn.addEventListener('click', () => {
        const team = Store.getTeam(btn.dataset.id);
        if (team) this._showTeamForm(team);
      });
    });

    // Delete team
    this.container.querySelectorAll('.btn-delete-team').forEach(btn => {
      btn.addEventListener('click', async () => {
        const team = Store.getTeam(btn.dataset.id);
        if (!team) return;
        const confirmed = await Modal.confirm({
          title: '删除队伍',
          message: `确定要删除队伍"${escapeHtml(team.name)}"吗？<br>该队伍的所有球员也将被删除。`,
        });
        if (confirmed) {
          Store.deleteTeam(team.id);
          this.render({}, this.container);
        }
      });
    });

    // Add player
    this.container.querySelectorAll('.btn-add-player').forEach(btn => {
      btn.addEventListener('click', () => {
        this._showPlayerForm(btn.dataset.teamId, null);
      });
    });

    // Edit player
    this.container.querySelectorAll('.btn-edit-player').forEach(btn => {
      btn.addEventListener('click', () => {
        const team = Store.getTeam(btn.dataset.teamId);
        const player = team?.players.find(p => p.id === btn.dataset.playerId);
        if (player) this._showPlayerForm(btn.dataset.teamId, player);
      });
    });

    // Delete player
    this.container.querySelectorAll('.btn-delete-player').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await Modal.confirm({
          title: '删除球员',
          message: '确定要删除这名球员吗？',
        });
        if (confirmed) {
          Store.deletePlayer(btn.dataset.teamId, btn.dataset.playerId);
          this.render({}, this.container);
        }
      });
    });
  },

  _showTeamForm(team) {
    const isEdit = !!team;
    Modal.show({
      title: isEdit ? '编辑队伍' : '新建队伍',
      content: `
        <div class="form-group">
          <label class="form-label">队伍名称</label>
          <input class="form-input" id="team-form-name" value="${escapeHtml(team?.name || '')}" placeholder="如：湖人队">
        </div>
        <div class="form-group">
          <label class="form-label">队伍颜色</label>
          <input type="color" class="form-input" id="team-form-color" value="${team?.color || '#2563eb'}" style="height:40px;padding:4px;width:80px">
        </div>
      `,
      confirmText: isEdit ? '保存' : '创建',
      onConfirm: () => {
        const name = document.getElementById('team-form-name')?.value.trim();
        const color = document.getElementById('team-form-color')?.value;
        if (!name) {
          Modal.alert({ title: '提示', message: '请输入队伍名称' });
          return;
        }
        if (isEdit) {
          Store.updateTeam(team.id, { name, color });
        } else {
          Store.addTeam(createTeam({ name, color }));
        }
        this.render({}, this.container);
      },
    });
  },

  _showPlayerForm(teamId, player) {
    const isEdit = !!player;
    const team = Store.getTeam(teamId);
    if (!team) return;

    Modal.show({
      title: isEdit ? '编辑球员' : `添加球员 — ${escapeHtml(team.name)}`,
      content: `
        <div class="form-group">
          <label class="form-label">姓名</label>
          <input class="form-input" id="player-form-name" value="${escapeHtml(player?.name || '')}" placeholder="球员姓名">
        </div>
        <div class="flex gap-md">
          <div class="form-group flex-1">
            <label class="form-label">号码</label>
            <input type="number" class="form-input" id="player-form-number" value="${player?.number || ''}" placeholder="如：23">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">位置</label>
            <input class="form-input" id="player-form-position" value="${escapeHtml(player?.position || '')}" placeholder="如：PG / FW">
          </div>
        </div>
      `,
      confirmText: isEdit ? '保存' : '添加',
      onConfirm: () => {
        const name = document.getElementById('player-form-name')?.value.trim();
        const number = parseInt(document.getElementById('player-form-number')?.value) || 0;
        const position = document.getElementById('player-form-position')?.value.trim();
        if (!name) {
          Modal.alert({ title: '提示', message: '请输入球员姓名' });
          return;
        }
        if (isEdit) {
          Store.updatePlayer(teamId, player.id, { name, number, position });
        } else {
          Store.addPlayer(teamId, createPlayer({ name, number, position }));
        }
        this.render({}, this.container);
      },
    });
  },
};
