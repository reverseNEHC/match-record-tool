/**
 * Excel 导出模块
 * 依赖 SheetJS (xlsx) 库 — 已在 index.html 通过 CDN 引入
 * 通过 window.XLSX 访问
 */

const Excel = {
  /**
   * 检查 SheetJS 是否加载
   */
  _checkLib() {
    if (typeof XLSX === 'undefined') {
      Modal.alert({ title: '导出失败', message: 'Excel 库未加载，请检查网络连接后刷新页面。' });
      return false;
    }
    return true;
  },

  /**
   * 导出单场比赛为 Excel
   * @param {string} matchId - 比赛ID
   */
  exportMatch(matchId) {
    if (!this._checkLib()) return;

    const match = Store.getMatch(matchId);
    if (!match) {
      Modal.alert({ title: '导出失败', message: '比赛不存在' });
      return;
    }

    const wb = XLSX.utils.book_new();
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);
    const homeName = homeTeam?.name || '主队';
    const awayName = awayTeam?.name || '客队';

    // Sheet 1: 比赛概览
    this._addOverviewSheet(wb, match, homeName, awayName);

    // Sheet 2: 球员统计（篮球）或球队统计（足球/自定义）
    if (match.sportType === 'basketball') {
      this._addBasketballPlayerSheet(wb, match, homeTeam, awayTeam);
    } else if (match.sportType === 'football') {
      this._addFootballTeamSheet(wb, match, homeName, awayName);
    } else if (match.sportType === 'custom') {
      this._addCustomTeamSheet(wb, match, homeName, awayName);
    }

    // Sheet 3: 事件时间线
    this._addEventsSheet(wb, match);

    // 触发下载
    const filename = `match_${match.name || matchId}.xlsx`;
    XLSX.writeFile(wb, filename);
  },

  /**
   * Sheet: 比赛概览
   */
  _addOverviewSheet(wb, match, homeName, awayName) {
    const config = getSportConfig(match.sportType);
    const sportLabel = (match.sportType === 'custom' && match.rules?.customSportName)
      ? match.rules.customSportName
      : config.label;
    const rows = [
      ['比赛名称', match.name],
      ['运动类型', sportLabel],
      ['日期', formatDate(match.startTime)],
      ['状态', match.status === 'live' ? '进行中' : match.status === 'finished' ? '已结束' : '未开始'],
      ['', ''],
      ['队伍', '比分'],
      [homeName, match.homeScore],
      [awayName, match.awayScore],
      ['', ''],
      ['当前节次/半场', `第 ${match.currentPeriod} ${config.periodName}`],
      ['事件总数', match.events.length],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, '比赛概览');
  },

  /**
   * Sheet: 篮球球员统计
   */
  _addBasketballPlayerSheet(wb, match, homeTeam, awayTeam) {
    const headers = ['队伍', '号码', '姓名', '位置', '得分', '投篮', '三分', '罚球', '进攻篮板', '防守篮板', '总篮板', '助攻', '盖帽', '抢断', '犯规', '失误'];

    const rows = [headers];

    const addPlayerRows = (team, teamName) => {
      if (!team) return;
      team.players.forEach(player => {
        const stats = match.playerStats[player.id];
        if (!stats) return; // 只导出有数据的球员
        rows.push([
          teamName,
          player.number,
          player.name,
          player.position,
          stats.pts,
          `${stats.fgm}/${stats.fga}`,
          `${stats.threePm}/${stats.threePa}`,
          `${stats.ftm}/${stats.fta}`,
          stats.oreb,
          stats.dreb,
          stats.oreb + stats.dreb,
          stats.ast,
          stats.blk,
          stats.stl,
          stats.pf,
          stats.tov,
        ]);
      });
    };

    addPlayerRows(homeTeam, homeTeam?.name || '主队');
    // 空行分隔
    if (homeTeam && awayTeam) rows.push([]);
    addPlayerRows(awayTeam, awayTeam?.name || '客队');

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = headers.map(() => ({ wch: 12 }));
    XLSX.utils.book_append_sheet(wb, ws, '球员统计');
  },

  /**
   * Sheet: 足球球队数据对比
   */
  _addFootballTeamSheet(wb, match, homeName, awayName) {
    const rows = [
      ['统计项', homeName, awayName],
    ];

    const config = getSportConfig('football');
    config.teamStatFields.forEach(field => {
      const homeVal = match.teamStats[match.homeTeamId]?.[field.key] ?? 0;
      const awayVal = match.teamStats[match.awayTeamId]?.[field.key] ?? 0;
      rows.push([field.label, homeVal + (field.unit || ''), awayVal + (field.unit || '')]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, '球队统计');
  },

  /**
   * Sheet: 自定义运动数据对比
   */
  _addCustomTeamSheet(wb, match, homeName, awayName) {
    const fields = match.rules?.customFields || [];
    const rows = [['统计项', homeName, awayName]];

    const homeStats = match.teamStats[match.homeTeamId] || {};
    const awayStats = match.teamStats[match.awayTeamId] || {};

    fields.forEach(field => {
      const hv = homeStats[field.key] ?? 0;
      const av = awayStats[field.key] ?? 0;
      rows.push([field.label, hv, av]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, '比赛数据');
  },

  /**
   * Sheet: 事件时间线
   */
  _addEventsSheet(wb, match) {
    const config = getSportConfig(match.sportType);
    const homeTeam = Store.getTeam(match.homeTeamId);
    const awayTeam = Store.getTeam(match.awayTeamId);

    const headers = ['序号', '时间', '节/半场', '事件类型', '队伍', '球员', '描述'];
    const rows = [headers];

    match.events.forEach((event, idx) => {
      const team = event.teamId === match.homeTeamId ? homeTeam : awayTeam;
      const teamName = team?.name || '';
      let playerName = '';
      if (event.playerId && team) {
        const player = team.players.find(p => p.id === event.playerId);
        playerName = player ? `#${player.number} ${player.name}` : '';
      }
      const eventTypeInfo = config.eventTypes[event.type] || { label: event.type };

      rows.push([
        idx + 1,
        formatTime(event.gameTime),
        `第${event.period}${config.periodName}`,
        eventTypeInfo.label,
        teamName,
        playerName,
        event.description,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '事件时间线');
  },
};
