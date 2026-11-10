/**
 * 比赛卡片组件
 * 用于首页比赛列表中渲染单场比赛
 */
const MatchCard = {
  /**
   * 渲染单张比赛卡片
   * @param {Object} match - 比赛对象
   * @returns {string} HTML 字符串
   */
  render(match) {
    const config = getSportConfig(match.sportType);
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);
    const homeName = homeTeam?.name || '（未知队伍）';
    const awayName = awayTeam?.name || '（未知队伍）';

    // Custom sport: show user-defined name
    let sportLabel = config.label;
    if (match.sportType === 'custom' && match.rules?.customSportName) {
      sportLabel = match.rules.customSportName;
    }

    return `
      <div class="match-card" data-id="${match.id}">
        <div class="match-card-header">
          <span class="sport-badge ${match.sportType}">${config.icon} ${escapeHtml(sportLabel)}</span>
          <span class="status-badge ${match.status}">${
            match.status === 'live' ? '● 进行中' :
            match.status === 'finished' ? '已结束' : '未开始'
          }</span>
        </div>
        <h3 class="match-card-name">${escapeHtml(match.name) || '未命名比赛'}</h3>
        <div class="match-card-score">
          <div class="match-card-team match-card-team--home">
            <div class="team-color-dot" style="background:${homeTeam?.color || '#999'}"></div>
            <span class="team-name">${escapeHtml(homeName)}</span>
          </div>
          <div class="match-card-score-num">
            <span class="score-value">${match.homeScore}</span>
            <span class="score-divider">:</span>
            <span class="score-value">${match.awayScore}</span>
          </div>
          <div class="match-card-team match-card-team--away">
            <span class="team-name">${escapeHtml(awayName)}</span>
            <div class="team-color-dot" style="background:${awayTeam?.color || '#999'}"></div>
          </div>
        </div>
        <div class="match-card-footer">
          <span class="text-muted">${formatDate(match.startTime)}</span>
          <div class="match-card-actions">
            <button class="btn btn-sm btn-outline match-btn-edit" data-id="${match.id}">✏️ 编辑</button>
            <button class="btn btn-sm btn-primary match-btn-enter" data-id="${match.id}">
              ${match.status === 'live' ? '➡️ 进入' : match.status === 'finished' ? '📋 查看' : '▶️ 开始'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 绑定卡片事件
   */
  bindEvents(container) {
    // 进入比赛
    container.querySelectorAll('.match-btn-enter').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const match = Store.getMatch(id);
        if (match && match.status === 'upcoming') {
          // 首次进入：设为 live
          Store.updateMatch(id, { status: 'live' });
        }
        Router.go(`#match/${id}`);
      });
    });

    // 编辑比赛
    container.querySelectorAll('.match-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const match = Store.getMatch(id);
        if (!match) return;
        HomePage.showMatchForm(match);
      });
    });
  },
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
