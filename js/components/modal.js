/**
 * 通用弹窗组件
 * 用法:
 *   Modal.show({ title, content, onConfirm, confirmText, danger, showCancel })
 *   Modal.close()
 *   Modal.alert({ title, message })   — 仅提示
 *   Modal.confirm({ title, message }) — 返回 Promise<boolean>
 */
const Modal = {
  overlay: null,
  dialog: null,

  _ensureDOM() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title"></h3>
          <button class="btn btn-ghost btn-icon modal-close-btn">&times;</button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-footer"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.dialog = this.overlay.querySelector('.modal-dialog');
    this.titleEl = this.overlay.querySelector('.modal-title');
    this.bodyEl = this.overlay.querySelector('.modal-body');
    this.footerEl = this.overlay.querySelector('.modal-footer');
    this.closeBtn = this.overlay.querySelector('.modal-close-btn');

    // Click overlay to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Close button
    this.closeBtn.addEventListener('click', () => this.close());

    // Escape key
    this._onKeydown = (e) => {
      if (e.key === 'Escape') this.close();
    };
  },

  /**
   * Show a modal
   */
  show({ title = '', content = '', onConfirm = null, confirmText = '确定', danger = false, showCancel = true }) {
    this._ensureDOM();
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = content;

    // Build footer buttons
    this.footerEl.innerHTML = '';

    if (showCancel) {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.textContent = '取消';
      cancelBtn.addEventListener('click', () => this.close());
      this.footerEl.appendChild(cancelBtn);
    }

    if (onConfirm) {
      const confirmBtn = document.createElement('button');
      confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      confirmBtn.textContent = confirmText;
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '处理中...';
        try {
          await onConfirm();
        } catch (e) {
          console.error('Modal confirm error:', e);
        }
        confirmBtn.disabled = false;
        confirmBtn.textContent = confirmText;
        this.close();
      });
      this.footerEl.appendChild(confirmBtn);
    }

    this.overlay.classList.add('active');
    document.addEventListener('keydown', this._onKeydown);
  },

  /**
   * Close the modal
   */
  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('active');
    document.removeEventListener('keydown', this._onKeydown);
  },

  /**
   * Simple alert dialog
   */
  alert({ title = '提示', message = '' }) {
    this.show({ title, content: `<p>${message}</p>`, showCancel: false, confirmText: '好的' });
  },

  /**
   * Confirm dialog — returns Promise<boolean>
   */
  confirm({ title = '确认', message = '' }) {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${message}</p>`,
        confirmText: '确定',
        danger: true,
        onConfirm: () => resolve(true),
      });
      // If cancelled (overlay click, escape, or cancel button), resolve false
      const originalClose = this.close.bind(this);
      this.close = () => {
        resolve(false);
        originalClose();
        this.close = originalClose; // restore
      };
    });
  },
};
