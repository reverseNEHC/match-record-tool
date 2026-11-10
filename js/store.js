/**
 * 数据仓库
 * 管理所有比赛、队伍数据，提供增删改查 + LocalStorage + JSON导入导出
 */
const STORAGE_KEY = 'matchtracker_data';

const Store = {
  matches: [],       // Match[]
  teams: [],         // Team[]

  /** 初始化：从 LocalStorage 加载数据，若无则初始化空数组 */
  init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.matches = data.matches || [];
        this.teams = data.teams || [];
      } catch (e) {
        console.error('数据加载失败，已重置:', e);
        this.matches = [];
        this.teams = [];
      }
    }
  },

  /** 持久化到 LocalStorage */
  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        matches: this.matches,
        teams: this.teams,
      }));
    } catch (e) {
      console.error('数据保存失败:', e);
      Modal.alert({ title: '保存失败', message: 'LocalStorage 可能已满，请导出数据备份。' });
    }
  },

  // ========== 比赛 CRUD ==========

  /** 获取所有比赛（可按 sportType 筛选） */
  getMatches(sportType = null) {
    let list = [...this.matches];
    if (sportType) {
      list = list.filter(m => m.sportType === sportType);
    }
    // 按开始时间倒序
    list.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    return list;
  },

  /** 根据 ID 获取比赛 */
  getMatch(id) {
    return this.matches.find(m => m.id === id) || null;
  },

  /** 新增比赛 */
  addMatch(match) {
    this.matches.push(match);
    this._save();
    return match;
  },

  /** 更新比赛 */
  updateMatch(id, updates) {
    const match = this.getMatch(id);
    if (!match) return null;
    Object.assign(match, updates);
    this._save();
    return match;
  },

  /** 删除比赛 */
  deleteMatch(id) {
    this.matches = this.matches.filter(m => m.id !== id);
    this._save();
  },

  // ========== 队伍 CRUD ==========

  /** 获取所有队伍 */
  getTeams() {
    return [...this.teams];
  },

  /** 根据 ID 获取队伍 */
  getTeam(id) {
    return this.teams.find(t => t.id === id) || null;
  },

  /** 新增队伍 */
  addTeam(team) {
    this.teams.push(team);
    this._save();
    return team;
  },

  /** 更新队伍 */
  updateTeam(id, updates) {
    const team = this.getTeam(id);
    if (!team) return null;
    Object.assign(team, updates);
    this._save();
    return team;
  },

  /** 删除队伍 */
  deleteTeam(id) {
    this.teams = this.teams.filter(t => t.id !== id);
    this._save();
  },

  // ========== 球员 CRUD ==========

  /** 向队伍添加球员 */
  addPlayer(teamId, player) {
    const team = this.getTeam(teamId);
    if (!team) return null;
    team.players.push(player);
    this._save();
    return player;
  },

  /** 更新球员 */
  updatePlayer(teamId, playerId, updates) {
    const team = this.getTeam(teamId);
    if (!team) return null;
    const player = team.players.find(p => p.id === playerId);
    if (!player) return null;
    Object.assign(player, updates);
    this._save();
    return player;
  },

  /** 从队伍删除球员 */
  deletePlayer(teamId, playerId) {
    const team = this.getTeam(teamId);
    if (!team) return;
    team.players = team.players.filter(p => p.id !== playerId);
    this._save();
  },

  // ========== JSON 导入/导出 ==========

  /** 导出单个比赛为 JSON 文件 */
  exportMatchJSON(matchId) {
    const match = this.getMatch(matchId);
    if (!match) {
      Modal.alert({ title: '导出失败', message: '比赛不存在' });
      return;
    }
    const data = { matches: [match], teams: this.teams };
    this._downloadJSON(data, `match_${match.name || matchId}.json`);
  },

  /** 导出全部数据 */
  exportAllJSON() {
    const data = { matches: this.matches, teams: this.teams };
    const ts = new Date().toISOString().slice(0, 10);
    this._downloadJSON(data, `matchtracker_backup_${ts}.json`);
  },

  /** 触发 JSON 文件下载 */
  _downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** 导入 JSON 文件 */
  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data.matches && !data.teams) {
            throw new Error('无效的数据格式');
          }

          Modal.show({
            title: '导入数据',
            content: `
              <p>发现 <strong>${data.matches?.length || 0}</strong> 场比赛 和 <strong>${data.teams?.length || 0}</strong> 支队伍。</p>
              <p class="text-secondary">请选择导入方式：</p>
              <div class="flex gap-sm mt-sm">
                <label class="radio-label">
                  <input type="radio" name="importMode" value="merge" checked> 合并（保留现有数据，新增导入数据）
                </label>
                <label class="radio-label">
                  <input type="radio" name="importMode" value="overwrite"> 覆盖（清空现有数据）
                </label>
              </div>
            `,
            confirmText: '导入',
            onConfirm: () => {
              const mode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
              if (mode === 'overwrite') {
                this.matches = data.matches || [];
                this.teams = data.teams || [];
              } else {
                // Merge: avoid duplicates by id
                if (data.teams) {
                  data.teams.forEach(t => {
                    if (!this.teams.find(ex => ex.id === t.id)) {
                      this.teams.push(t);
                    }
                  });
                }
                if (data.matches) {
                  data.matches.forEach(m => {
                    if (!this.matches.find(ex => ex.id === m.id)) {
                      this.matches.push(m);
                    }
                  });
                }
              }
              this._save();
              Router.refresh();
              Modal.alert({ title: '导入成功', message: '数据已成功导入！' });
            },
          });
        } catch (e) {
          Modal.alert({ title: '导入失败', message: 'JSON 文件格式不正确: ' + e.message });
        }
      };
      reader.readAsText(file);
    });
    input.click();
  },
};
