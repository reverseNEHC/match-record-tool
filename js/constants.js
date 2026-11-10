/**
 * 运动类型配置
 * 定义每种运动的得分规则、数据统计项、比赛结构等
 */
const SPORT_CONFIGS = {
  basketball: {
    label: '篮球',
    icon: '🏀',
    scoreValues: [1, 2, 3],           // 罚球、投篮、三分
    scoreLabels: ['+1 罚球', '+2 投篮', '+3 三分'],
    periods: 4,                        // 4节
    periodName: '节',
    periodDuration: 10 * 60,           // 10分钟/节（FIBA规则）
    timerMode: 'countdown',            // 倒计时
    // 球员数据统计项定义
    playerStatFields: [
      { key: 'pts',  label: '得分',   short: 'PTS', icon: '🏀' },
      { key: 'fgm',  label: '投篮命中', short: 'FGM', parent: 'fga', ratioKey: 'fga' },
      { key: 'fga',  label: '投篮出手', short: 'FGA', hidden: true },
      { key: 'threePm', label: '三分命中', short: '3PM', parent: 'threePa', ratioKey: 'threePa' },
      { key: 'threePa', label: '三分出手', short: '3PA', hidden: true },
      { key: 'ftm',  label: '罚球命中', short: 'FTM', parent: 'fta', ratioKey: 'fta' },
      { key: 'fta',  label: '罚球出手', short: 'FTA', hidden: true },
      { key: 'oreb', label: '进攻篮板', short: 'OREB' },
      { key: 'dreb', label: '防守篮板', short: 'DREB' },
      { key: 'ast',  label: '助攻',   short: 'AST' },
      { key: 'blk',  label: '盖帽',   short: 'BLK' },
      { key: 'stl',  label: '抢断',   short: 'STL' },
      { key: 'pf',   label: '犯规',   short: 'PF' },
      { key: 'tov',  label: '失误',   short: 'TOV' },
    ],
    // 快速事件按钮
    quickEvents: [
      { type: 'foul',     label: '犯规',   icon: '⚠️' },
      { type: 'timeout',  label: '暂停',   icon: '⏸️' },
      { type: 'substitution', label: '换人', icon: '🔄' },
      { type: 'turnover', label: '失误',   icon: '❌' },
    ],
    eventTypes: {
      score:        { label: '得分',   icon: '🏀' },
      foul:         { label: '犯规',   icon: '⚠️' },
      substitution: { label: '换人',   icon: '🔄' },
      timeout:      { label: '暂停',   icon: '⏸️' },
      rebound:      { label: '篮板',   icon: '🔄' },
      assist:       { label: '助攻',   icon: '🤝' },
      block:        { label: '盖帽',   icon: '✋' },
      steal:        { label: '抢断',   icon: '⚡' },
      turnover:     { label: '失误',   icon: '❌' },
      period_start: { label: '节开始', icon: '▶️' },
      period_end:   { label: '节结束', icon: '⏹️' },
      overtime_start: { label: '加时开始', icon: '⏱️' },
    },
    defaultRules: {
      winCondition: 'time',
      firstToScore: 21,
      hasOvertime: true,
      overtimeDuration: 5 * 60,
    },
  },

  football: {
    label: '足球',
    icon: '⚽',
    scoreValues: [1],                   // 只有进球
    scoreLabels: ['+1 进球'],
    periods: 2,                         // 上下半场
    periodName: '半场',
    periodDuration: 45 * 60,            // 45分钟/半场
    timerMode: 'countup',               // 正计时
    // 球队数据统计项
    teamStatFields: [
      { key: 'possession',     label: '控球率',     unit: '%',  max: 100 },
      { key: 'shots',          label: '射门',       unit: '' },
      { key: 'shotsOnTarget',  label: '射正',       unit: '' },
      { key: 'passes',         label: '传球',       unit: '' },
      { key: 'passesCompleted',label: '传球成功',   unit: '' },
      { key: 'interceptions',  label: '拦截',       unit: '' },
      { key: 'blockedShots',   label: '封堵射门',   unit: '' },
      { key: 'corners',        label: '角球',       unit: '' },
      { key: 'offsides',       label: '越位',       unit: '' },
      { key: 'fouls',          label: '犯规',       unit: '' },
      { key: 'yellowCards',    label: '黄牌',       unit: '' },
      { key: 'redCards',       label: '红牌',       unit: '' },
    ],
    // 快速事件按钮（仅球员相关操作；犯规/角球/越位在球队数据面板记录）
    quickEvents: [
      { type: 'score',        label: '进球',  icon: '⚽' },
      { type: 'card_yellow',  label: '黄牌',  icon: '🟨' },
      { type: 'card_red',     label: '红牌',  icon: '🟥' },
    ],
    eventTypes: {
      score:         { label: '进球',   icon: '⚽' },
      card_yellow:   { label: '黄牌',   icon: '🟨' },
      card_red:      { label: '红牌',   icon: '🟥' },
      card_red_second: { label: '两黄变红', icon: '🟥🟨' },
      foul:          { label: '犯规',   icon: '⚠️' },
      substitution:  { label: '换人',   icon: '🔄' },
      corner:        { label: '角球',   icon: '🚩' },
      offside:       { label: '越位',   icon: '🏳️' },
      period_start:  { label: '半场开始', icon: '▶️' },
      period_end:    { label: '半场结束', icon: '⏹️' },
      overtime_start: { label: '加时开始', icon: '⏱️' },
    },
    defaultRules: {
      winCondition: 'time',
      firstToScore: 0,
      hasOvertime: true,
      overtimeDuration: 15 * 60,
    },
  },

  custom: {
    label: '自定义',
    icon: '🏆',
    scoreValues: [1, 2, 3],
    scoreLabels: ['+1', '+2', '+3'],
    periods: 2,
    periodName: '时段',
    periodDuration: 20 * 60,
    timerMode: 'countup',
    playerStatFields: [],
    teamStatFields: [],
    quickEvents: [],
    eventTypes: {
      score: { label: '得分', icon: '✅' },
      custom: { label: '事件', icon: '📌' },
      period_start: { label: '时段开始', icon: '▶️' },
      period_end:   { label: '时段结束', icon: '⏹️' },
    },
    defaultRules: {
      winCondition: 'time',
      firstToScore: 0,
      hasOvertime: false,
      overtimeDuration: 5 * 60,
    },
  },
};

/**
 * 篮球球员位置列表
 */
const BASKETBALL_POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

/**
 * 足球球员位置列表
 */
const FOOTBALL_POSITIONS = ['GK', 'DF', 'MF', 'FW'];

/**
 * 生成 UUID v4
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * 格式化时间为 mm:ss
 */
function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * 格式化日期
 */
function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/**
 * 获取安全的运动类型配置
 */
function getSportConfig(sportType) {
  return SPORT_CONFIGS[sportType] || SPORT_CONFIGS.custom;
}
