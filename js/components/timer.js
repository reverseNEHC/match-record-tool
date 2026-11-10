/**
 * 计时器组件
 * 篮球：分节倒计时
 * 足球：累计正计时
 * 比赛规则（match.rules）控制节数和每节时长
 */
const Timer = {
  match: null,
  config: null,
  elapsed: 0,          // 累计已过秒数
  periodElapsed: 0,    // 当前节已过秒数
  intervalId: null,
  isRunning: false,
  onPeriodEnd: null,
  _periodDurationOverride: null, // overtime overrides the default period duration

  render(match) {
    this.match = match;
    this.config = getSportConfig(match.sportType);
    this._periodDurationOverride = null;

    const rules = match.rules || {};
    const periodName = rules.periods > 2 ? '节' : this.config.periodName;
    const overtimeLabel = match.isOvertime ? ' (加时)' : '';

    return `
      <div class="timer card flex items-center justify-between">
        <div class="timer-display">
          <span class="timer-icon">⏱️</span>
          <span class="timer-value" id="timer-value">00:00</span>
          <span class="timer-period">
            第 ${match.currentPeriod} ${periodName}${overtimeLabel}
            <span class="text-muted" style="font-size:0.75rem">
              (${Math.round(this._getPeriodDuration() / 60)}分钟)
            </span>
          </span>
        </div>
        <div class="timer-controls flex gap-sm">
          ${match.status !== 'finished' ? `
          <button class="btn btn-sm btn-primary" id="btn-timer-start">▶ 开始</button>
          <button class="btn btn-sm btn-outline" id="btn-timer-pause" style="display:none">⏸ 暂停</button>
          <button class="btn btn-sm btn-ghost" id="btn-timer-reset">↺ 重置</button>
          ` : ''}
        </div>
      </div>
    `;
  },

  bindEvents(container, { onPeriodEnd }) {
    if (this.match.status === 'finished') return;

    this.onPeriodEnd = onPeriodEnd;

    // Use a wrapper to avoid duplicate listeners
    const startBtn = document.getElementById('btn-timer-start');
    const pauseBtn = document.getElementById('btn-timer-pause');
    const resetBtn = document.getElementById('btn-timer-reset');

    if (startBtn) {
      const newStart = startBtn.cloneNode(true);
      startBtn.parentNode.replaceChild(newStart, startBtn);
      newStart.addEventListener('click', () => this.start());
    }
    if (pauseBtn) {
      const newPause = pauseBtn.cloneNode(true);
      pauseBtn.parentNode.replaceChild(newPause, pauseBtn);
      newPause.addEventListener('click', () => this.pause());
    }
    if (resetBtn) {
      const newReset = resetBtn.cloneNode(true);
      resetBtn.parentNode.replaceChild(newReset, resetBtn);
      newReset.addEventListener('click', () => this.reset());
    }
  },

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const startBtn = document.getElementById('btn-timer-start');
    const pauseBtn = document.getElementById('btn-timer-pause');
    if (startBtn) startBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = '';

    this.intervalId = setInterval(() => {
      this.elapsed++;
      this.periodElapsed++;
      this._updateDisplay();

      // 倒计时模式：检查当前节是否结束
      if (this.config.timerMode === 'countdown') {
        const remaining = this._getPeriodDuration() - this.periodElapsed;
        if (remaining <= 0) {
          this._onPeriodEnd();
        }
      }
    }, 1000);
  },

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.intervalId);

    const startBtn = document.getElementById('btn-timer-start');
    const pauseBtn = document.getElementById('btn-timer-pause');
    if (startBtn) startBtn.style.display = '';
    if (pauseBtn) pauseBtn.style.display = 'none';
  },

  reset() {
    this.pause();
    this.elapsed = 0;
    this.periodElapsed = 0;
    this._updateDisplay();
  },

  /** Overtime: change period duration on the fly */
  setPeriodDuration(seconds) {
    this._periodDurationOverride = seconds;
  },

  getElapsed() {
    return this.elapsed;
  },

  /** Get period duration from match rules (or overtime override) */
  _getPeriodDuration() {
    if (this._periodDurationOverride) return this._periodDurationOverride;
    const rules = this.match?.rules || {};
    return rules.periodDuration || this.config.periodDuration;
  },

  _onPeriodEnd() {
    this.pause();
    this.periodElapsed = 0;
    if (this.onPeriodEnd) {
      this.onPeriodEnd();
    }
  },

  _updateDisplay() {
    const display = document.getElementById('timer-value');
    if (!display) return;

    if (this.config.timerMode === 'countdown') {
      const remaining = Math.max(0, this._getPeriodDuration() - this.periodElapsed);
      display.textContent = formatTime(remaining);
    } else {
      display.textContent = formatTime(this.elapsed);
    }
  },
};
