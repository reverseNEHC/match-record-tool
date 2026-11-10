/**
 * 计分板组件
 * 显示双方队名、比分、得分按钮
 */
const ScoreBoard = {
  match: null,
  homeTeam: null,
  awayTeam: null,
  config: null,

  render(match) {
    this.match = match;
    this.homeTeam = Store.getTeam(match.homeTeamId);
    this.awayTeam = Store.getTeam(match.awayTeamId);
    this.config = getSportConfig(match.sportType);

    const homeColor = this.homeTeam?.color || '#2563eb';
    const awayColor = this.awayTeam?.color || '#dc2626';
    const rules = match.rules || {};
    const periodName = rules.periods > 2 ? '节' : this.config.periodName;
    const overtimeLabel = match.isOvertime ? ' (加时)' : '';

    // First-to-N indicator
    let winConditionHTML = '';
    if (rules.winCondition === 'firstTo' && rules.firstToScore > 0) {
      winConditionHTML = `<span class="text-muted" style="font-size:0.8rem">（先得${rules.firstToScore}分获胜）</span>`;
    }

    const scoreBtnsHTML = this.config.scoreValues.map((val, i) => {
      const homeLabel = this.config.scoreLabels[i] || `+${val}`;
      const awayLabel = this.config.scoreLabels[i] || `+${val}`;
      return `
        <div class="score-btn-row">
          <button class="score-btn score-btn-home" data-team="home" data-value="${val}">${homeLabel}</button>
          <span class="score-btn-value">+${val}</span>
          <button class="score-btn score-btn-away" data-team="away" data-value="${val}">${awayLabel}</button>
        </div>
      `;
    }).join('');

    const isFinished = match.status === 'finished';
    const isFirstToWin = rules.winCondition === 'firstTo' &&
      (match.homeScore >= rules.firstToScore || match.awayScore >= rules.firstToScore);

    return `
      <div class="scoreboard card">
        <div class="scoreboard-period">
          <span>第 ${match.currentPeriod} ${periodName}${overtimeLabel} ${winConditionHTML}</span>
          <span class="status-badge ${match.status}">
            ${isFirstToWin ? '🏆 获胜' : match.status === 'live' ? '● 进行中' : '已结束'}
          </span>
        </div>
        <div class="scoreboard-main">
          <div class="scoreboard-team scoreboard-team--home" style="--team-color: ${homeColor}">
            <div class="scoreboard-team-color" style="background:${homeColor}"></div>
            <div class="scoreboard-team-name">${escapeHtml(this.homeTeam?.name || '主队')}</div>
          </div>
          <div class="scoreboard-score">
            <span class="score-num" id="home-score">${match.homeScore}</span>
            <span class="score-colon">:</span>
            <span class="score-num" id="away-score">${match.awayScore}</span>
          </div>
          <div class="scoreboard-team scoreboard-team--away" style="--team-color: ${awayColor}">
            <div class="scoreboard-team-color" style="background:${awayColor}"></div>
            <div class="scoreboard-team-name">${escapeHtml(this.awayTeam?.name || '客队')}</div>
          </div>
        </div>
        ${!isFinished && !isFirstToWin ? `
        <div class="scoreboard-actions">
          ${scoreBtnsHTML}
          <div class="scoreboard-undo">
            <button class="btn btn-outline btn-sm" id="btn-undo">↩ 撤销</button>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  },

  bindEvents(container, { onScore, onUndo }) {
    // Check if actions exist (they won't if match is finished or first-to-win)
    const actionsExist = container.querySelector('.scoreboard-actions');
    if (!actionsExist) return;

    container.querySelectorAll('.score-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const team = btn.dataset.team;
        const value = parseInt(btn.dataset.value);
        onScore(team, value);
      });
    });

    container.querySelector('#btn-undo')?.addEventListener('click', () => {
      onUndo();
    });
  },
};
