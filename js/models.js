/**
 * 数据模型工厂函数
 */

/** 创建新队伍 */
function createTeam({ name = '', color = '#2563eb', players = [] } = {}) {
  return {
    id: generateId(),
    name,
    color,
    players: players.map(p => createPlayer(p)),
  };
}

/** 创建新球员 */
function createPlayer({ name = '', number = 0, position = '' } = {}) {
  return {
    id: generateId(),
    name,
    number,
    position,
  };
}

/** 创建篮球球员比赛统计（初始全0） */
function createBasketballPlayerStats() {
  return {
    pts: 0,
    fgm: 0, fga: 0,
    threePm: 0, threePa: 0,
    ftm: 0, fta: 0,
    oreb: 0,
    dreb: 0,
    ast: 0,
    blk: 0,
    stl: 0,
    pf: 0,
    tov: 0,
    minutes: 0,
  };
}

/** 创建足球球队比赛统计（初始全0） */
function createFootballTeamStats() {
  return {
    possession: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 0,
    passesCompleted: 0,
    interceptions: 0,
    blockedShots: 0,
    corners: 0,
    offsides: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0,
  };
}

/** 创建比赛事件 */
function createEvent({ gameTime = 0, period = 1, type = 'custom', teamId = '', playerId = null, value = null, description = '' } = {}) {
  return {
    id: generateId(),
    gameTime,
    period,
    type,
    teamId,
    playerId,
    value,
    description,
  };
}

/** 创建默认比赛规则 */
function createDefaultRules(sportType) {
  const config = getSportConfig(sportType);
  return {
    periods: config.periods,
    periodDuration: config.periodDuration,
    winCondition: 'time',       // 'time' — 时间结束时领先者胜 | 'firstTo' — 先得N分胜
    firstToScore: sportType === 'basketball' ? 21 : 0,
    hasOvertime: sportType === 'basketball',
    overtimeDuration: 5 * 60,   // 加时赛 5 分钟
  };
}

/** 创建新比赛 */
function createMatch({
  name = '',
  sportType = 'basketball',
  homeTeamId = '',
  awayTeamId = '',
  rules = null,
} = {}) {
  const match = {
    id: generateId(),
    name,
    sportType,
    homeTeamId,
    awayTeamId,
    homeScore: 0,
    awayScore: 0,
    status: 'upcoming',         // 'upcoming' | 'live' | 'finished'
    currentPeriod: 1,
    isOvertime: false,
    events: [],
    startTime: new Date().toISOString(),
    endTime: null,
    rules: rules || createDefaultRules(sportType),
    playerStats: {},            // { [playerId]: BasketballPlayerStats }
    teamStats: {},              // { [teamId]: FootballTeamStats }
    // 篮球：当前在场上的球员ID列表
    homeActivePlayers: [],
    awayActivePlayers: [],
  };

  // 初始化球队统计数据
  if (sportType === 'football') {
    match.teamStats[homeTeamId] = createFootballTeamStats();
    match.teamStats[awayTeamId] = createFootballTeamStats();
  } else if (sportType === 'custom' && match.rules.customFields?.length > 0) {
    match.teamStats[homeTeamId] = createCustomTeamStats(match.rules.customFields);
    match.teamStats[awayTeamId] = createCustomTeamStats(match.rules.customFields);
  }

  return match;
}

/** 根据自定义字段创建球队统计对象 */
function createCustomTeamStats(customFields) {
  const stats = {};
  (customFields || []).forEach(f => { stats[f.key] = 0; });
  return stats;
}

/**
 * 为比赛中的球员初始化统计数据（如果尚未存在）
 */
function ensurePlayerStats(match, playerId) {
  if (!match.playerStats[playerId]) {
    match.playerStats[playerId] = createBasketballPlayerStats();
  }
  return match.playerStats[playerId];
}

/**
 * 为比赛中的球队初始化统计数据
 */
function ensureTeamStats(match, teamId) {
  if (!match.teamStats[teamId]) {
    match.teamStats[teamId] = createFootballTeamStats();
  }
  return match.teamStats[teamId];
}
