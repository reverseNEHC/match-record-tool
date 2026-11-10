/**
 * 首页 — 比赛列表
 */
const HomePage = {
  currentFilter: null,

  render(params, container) {
    this.container = container;
    const matches = Store.getMatches(this.currentFilter);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-heading">
          <span class="eyebrow">MATCH CENTER</span>
          <h1>比赛中心</h1>
          <p class="page-subtitle">管理赛程，快速进入比赛记录。</p>
        </div>
        <button class="btn btn-primary" id="btn-new-match">+ 新建比赛</button>
      </div>

      <div class="filter-tabs mb-md">
        <button class="filter-tab ${this.currentFilter === null ? 'active' : ''}" data-filter="">全部</button>
        <button class="filter-tab ${this.currentFilter === 'basketball' ? 'active' : ''}" data-filter="basketball">🏀 篮球</button>
        <button class="filter-tab ${this.currentFilter === 'football' ? 'active' : ''}" data-filter="football">⚽ 足球</button>
        <button class="filter-tab ${this.currentFilter === 'custom' ? 'active' : ''}" data-filter="custom">🏆 自定义</button>
      </div>

      <div id="match-list">
        ${matches.length === 0 ? this._emptyState() : this._renderList(matches)}
      </div>
    `;

    this._bindEvents();
  },

  _emptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无比赛记录</p>
        <p class="text-muted">点击"新建比赛"开始记录你的第一场比赛！</p>
      </div>
    `;
  },

  _renderList(matches) {
    return `
      <div class="match-grid">
        ${matches.map(m => MatchCard.render(m)).join('')}
      </div>
    `;
  },

  _bindEvents() {
    document.getElementById('btn-new-match')?.addEventListener('click', () => {
      this.showMatchForm(null);
    });

    this.container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentFilter = tab.dataset.filter || null;
        this.container.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.render({}, this.container);
      });
    });

    MatchCard.bindEvents(this.container);
  },

  showMatchForm(match) {
    const isEdit = !!match;
    const teams = Store.getTeams();
    const rules = match?.rules || {};
    const sportType = match?.sportType || 'basketball';

    const teamsOptions = teams.map(t =>
      `<option value="${t.id}" ${match && match.homeTeamId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>`
    ).join('');

    const sportOptions = ['basketball', 'football', 'custom'].map(s => {
      const cfg = getSportConfig(s);
      return `<option value="${s}" ${sportType === s ? 'selected' : ''}>${cfg.icon} ${cfg.label}</option>`;
    }).join('');

    // Custom fields HTML (existing or empty)
    const customFields = rules.customFields || [];
    const customFieldsHTML = customFields.map((f, i) => `
      <div class="custom-field-row flex gap-sm items-center mb-sm" data-index="${i}">
        <input class="form-input flex-1" value="${escapeHtml(f.label)}" placeholder="数据项名称（如：扣球）" data-role="field-label">
        <button class="btn btn-ghost btn-sm btn-remove-custom-field" title="删除">✕</button>
      </div>
    `).join('');

    Modal.show({
      title: isEdit ? '编辑比赛' : '新建比赛',
      content: `
        <!-- basic info -->
        <div class="form-group">
          <label class="form-label">比赛名称</label>
          <input class="form-input" id="match-form-name" value="${escapeHtml(match?.name || '')}" placeholder="如：决赛、小组赛A组...">
        </div>
        <div class="form-group">
          <label class="form-label">运动类型</label>
          <select class="form-select" id="match-form-sport">${sportOptions}</select>
        </div>

        <!-- custom sport name (shown when type=custom) -->
        <div class="form-group" id="custom-sport-name-group" style="display:${sportType === 'custom' ? '' : 'none'}">
          <label class="form-label">自定义运动名称</label>
          <input class="form-input" id="match-form-custom-sport" value="${escapeHtml(rules.customSportName || '')}" placeholder="如：排球、网球、乒乓球...">
        </div>

        <div class="flex gap-md">
          <div class="form-group flex-1">
            <label class="form-label">主队</label>
            <select class="form-select" id="match-form-home">${teamsOptions}</select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">客队</label>
            <select class="form-select" id="match-form-away">${teamsOptions}</select>
          </div>
        </div>

        <!-- rules -->
        <details class="form-rules-section" open>
          <summary class="form-rules-summary">⚙️ 比赛规则设置</summary>
          <div class="mt-sm">
            <div class="flex gap-md">
              <div class="form-group flex-1">
                <label class="form-label">节数/半场数</label>
                <input type="number" class="form-input" id="match-form-periods" value="${rules.periods ?? 4}" min="1" max="10">
              </div>
              <div class="form-group flex-1">
                <label class="form-label">每节时长（分钟）</label>
                <input type="number" class="form-input" id="match-form-period-duration" value="${Math.round((rules.periodDuration ?? 600) / 60)}" min="1" max="60">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">获胜条件</label>
              <div class="flex gap-sm">
                <label class="radio-label">
                  <input type="radio" name="winCondition" value="time" ${(rules.winCondition || 'time') === 'time' ? 'checked' : ''}>
                  时间结束时分高者胜
                </label>
                <label class="radio-label">
                  <input type="radio" name="winCondition" value="firstTo" ${rules.winCondition === 'firstTo' ? 'checked' : ''}>
                  率先得到
                  <input type="number" class="form-input" id="match-form-first-to" value="${rules.firstToScore || 21}" min="1" max="999" style="width:70px;display:inline;padding:4px 8px;">
                  分获胜
                </label>
              </div>
            </div>
            <div class="flex gap-md">
              <div class="form-group flex-1">
                <label class="checkbox-label">
                  <input type="checkbox" id="match-form-overtime" ${rules.hasOvertime !== false ? 'checked' : ''}>
                  启用加时赛
                </label>
              </div>
              <div class="form-group flex-1" id="overtime-duration-group">
                <label class="form-label">加时赛时长（分钟）</label>
                <input type="number" class="form-input" id="match-form-overtime-duration" value="${Math.round((rules.overtimeDuration ?? 300) / 60)}" min="1" max="30">
              </div>
            </div>
          </div>
        </details>

        <!-- custom data fields (shown when type=custom) -->
        <details class="form-rules-section mt-sm" id="custom-fields-section" style="display:${sportType === 'custom' ? '' : 'none'}">
          <summary class="form-rules-summary">📋 自定义比赛数据项</summary>
          <p class="text-muted" style="font-size:0.78rem;margin:6px 0">定义你想要在此类运动中记录的数据项（如排球：扣球、拦网、发球得分等）</p>
          <div id="custom-fields-list">
            ${customFieldsHTML}
          </div>
          <button class="btn btn-sm btn-outline mt-sm" id="btn-add-custom-field">+ 添加数据项</button>
        </details>

        ${isEdit ? `<div class="mt-lg" style="border-top:1px solid var(--color-border);padding-top:12px;">
          <button class="btn btn-danger btn-sm" id="btn-delete-match">🗑 删除此比赛</button>
        </div>` : ''}

        ${teams.length === 0 ? '<p class="text-muted mt-sm">⚠️ 还没有队伍，请先在<a href="#team">队伍管理</a>中创建队伍。</p>' : ''}
        ${teams.length > 0 && teams.length < 2 ? '<p class="text-muted mt-sm">⚠️ 需要至少两支队伍才能创建比赛。</p>' : ''}
      `,
      confirmText: isEdit ? '保存' : '创建',
      onConfirm: () => {
        const name = document.getElementById('match-form-name')?.value.trim() || '未命名比赛';
        const sportType = document.getElementById('match-form-sport')?.value || 'basketball';
        const homeTeamId = document.getElementById('match-form-home')?.value;
        const awayTeamId = document.getElementById('match-form-away')?.value;

        if (!homeTeamId || !awayTeamId) {
          Modal.alert({ title: '提示', message: '请选择主队和客队' });
          return;
        }
        if (homeTeamId === awayTeamId) {
          Modal.alert({ title: '提示', message: '主队和客队不能是同一支队伍' });
          return;
        }

        const customSportName = document.getElementById('match-form-custom-sport')?.value.trim() || '自定义';

        // Collect custom fields
        const customFields = [];
        document.querySelectorAll('#custom-fields-list .custom-field-row').forEach(row => {
          const labelEl = row.querySelector('[data-role="field-label"]');
          const label = labelEl?.value.trim();
          if (label) {
            customFields.push({ key: 'cf_' + generateId().slice(0, 8), label });
          }
        });

        const newRules = {
          periods: parseInt(document.getElementById('match-form-periods')?.value) || 4,
          periodDuration: (parseInt(document.getElementById('match-form-period-duration')?.value) || 10) * 60,
          winCondition: document.querySelector('input[name="winCondition"]:checked')?.value || 'time',
          firstToScore: parseInt(document.getElementById('match-form-first-to')?.value) || 21,
          hasOvertime: document.getElementById('match-form-overtime')?.checked,
          overtimeDuration: (parseInt(document.getElementById('match-form-overtime-duration')?.value) || 5) * 60,
        };

        if (sportType === 'custom') {
          newRules.customSportName = customSportName;
          newRules.customFields = customFields;
        }

        if (isEdit) {
          Store.updateMatch(match.id, { name, sportType, homeTeamId, awayTeamId, rules: newRules });
        } else {
          Store.addMatch(createMatch({ name, sportType, homeTeamId, awayTeamId, rules: newRules }));
        }
        this.render({}, this.container);
      },
    });

    // --- dynamic form behavior ---
    setTimeout(() => {
      // sport type switch → show/hide custom sections
      const sportSelect = document.getElementById('match-form-sport');
      const customNameGroup = document.getElementById('custom-sport-name-group');
      const customFieldsSection = document.getElementById('custom-fields-section');

      sportSelect?.addEventListener('change', () => {
        const isCustom = sportSelect.value === 'custom';
        if (customNameGroup) customNameGroup.style.display = isCustom ? '' : 'none';
        if (customFieldsSection) customFieldsSection.style.display = isCustom ? '' : 'none';
      });

      // overtime toggle
      const cb = document.getElementById('match-form-overtime');
      const group = document.getElementById('overtime-duration-group');
      if (cb && group) {
        const toggle = () => { group.style.display = cb.checked ? '' : 'none'; };
        cb.addEventListener('change', toggle);
        toggle();
      }

      // firstTo radio
      const firstToRadio = document.querySelector('input[name="winCondition"][value="firstTo"]');
      const timeRadio = document.querySelector('input[name="winCondition"][value="time"]');
      const firstToInput = document.getElementById('match-form-first-to');
      if (firstToRadio && timeRadio && firstToInput) {
        firstToRadio.addEventListener('change', () => { firstToInput.disabled = false; });
        timeRadio.addEventListener('change', () => { firstToInput.disabled = true; });
        firstToInput.disabled = timeRadio.checked;
      }

      // add custom field
      document.getElementById('btn-add-custom-field')?.addEventListener('click', () => {
        const list = document.getElementById('custom-fields-list');
        const idx = list.children.length;
        const row = document.createElement('div');
        row.className = 'custom-field-row flex gap-sm items-center mb-sm';
        row.dataset.index = idx;
        row.innerHTML = `
          <input class="form-input flex-1" placeholder="数据项名称（如：扣球）" data-role="field-label">
          <button class="btn btn-ghost btn-sm btn-remove-custom-field" title="删除">✕</button>
        `;
        list.appendChild(row);
        row.querySelector('.btn-remove-custom-field').addEventListener('click', () => row.remove());
      });

      // remove custom field (existing rows)
      document.querySelectorAll('.btn-remove-custom-field').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.custom-field-row').remove());
      });

      // delete match button
      document.getElementById('btn-delete-match')?.addEventListener('click', async () => {
        const confirmed = await Modal.confirm({
          title: '删除比赛',
          message: `确定要删除比赛 "<strong>${escapeHtml(match.name)}</strong>" 吗？<br>此操作<strong>不可撤销</strong>，所有比赛数据将永久丢失。`,
        });
        if (confirmed) {
          Store.deleteMatch(match.id);
          Modal.close();
          this.render({}, this.container);
        }
      });
    }, 50);
  },
};
