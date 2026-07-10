/* ============================================================
   MODAL – modal.js
   Reusable modal system for task creation/editing,
   confirmations, and day-detail views.
   ============================================================ */

const Modal = {
  overlay: null,
  
  /**
   * Initialize the modal system (call once on app start).
   */
  init() {
    this.overlay = $('#modal-overlay');
    
    // Close on overlay click (not modal body)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
        this.close();
      }
    });
  },
  
  /**
   * Open the modal with dynamic content.
   * @param {object} opts - { title, body, footer, onClose }
   */
  open({ title = '', body = '', footer = '', onClose = null }) {
    const modal = $('.modal', this.overlay);
    
    // Set title
    const titleEl = $('.modal__title', modal);
    titleEl.textContent = title;
    
    // Set body content
    const bodyEl = $('.modal__body', modal);
    if (typeof body === 'string') {
      bodyEl.innerHTML = body;
    } else {
      bodyEl.innerHTML = '';
      bodyEl.appendChild(body);
    }
    
    // Set footer
    const footerEl = $('.modal__footer', modal);
    if (typeof footer === 'string') {
      footerEl.innerHTML = footer;
    } else if (footer) {
      footerEl.innerHTML = '';
      footerEl.appendChild(footer);
    } else {
      footerEl.innerHTML = '';
    }
    
    // Close button handler
    const closeBtn = $('.modal__close', modal);
    closeBtn.onclick = () => this.close();
    
    this._onClose = onClose;
    
    // Show
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus first input if present
    setTimeout(() => {
      const firstInput = $('input, select, textarea', bodyEl);
      if (firstInput) firstInput.focus();
    }, 100);
  },
  
  /**
   * Close the modal.
   */
  close() {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (this._onClose) this._onClose();
    this._onClose = null;
  },
  
  /**
   * Show a task creation/edit form in the modal.
   * @param {object} task - Existing task data (null for new)
   * @param {object} opts - { defaultDate, defaultCategory }
   * @returns {Promise<object|null>} - Resolved with form data or null if cancelled
   */
  showTaskForm(task = null, opts = {}) {
    return new Promise((resolve) => {
      const isEdit = !!task;
      const title = isEdit ? 'Edit Task' : 'New Task';
      
      // Build form HTML
      const formHtml = `
        <form id="task-form" class="task-form">
          <div class="form-group">
            <label class="form-label" for="task-title">Title *</label>
            <input type="text" id="task-title" class="form-input" 
                   placeholder="What needs to be done?" 
                   value="${task?.title || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="task-description">Description</label>
            <textarea id="task-description" class="form-input" 
                      placeholder="Add details...">${task?.description || ''}</textarea>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap: var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="task-category">Category</label>
              <select id="task-category" class="form-input">
                ${CATEGORIES.map(c => `
                  <option value="${c}" ${(task?.category || opts.defaultCategory || 'Personal') === c ? 'selected' : ''}>
                    ${CATEGORY_ICONS[c]} ${c}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="task-priority">Priority</label>
              <select id="task-priority" class="form-input">
                ${PRIORITIES.map(p => `
                  <option value="${p}" ${(task?.priority || 'Medium') === p ? 'selected' : ''}>
                    ${p}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="task-due">Due Date</label>
            <input type="date" id="task-due" class="form-input" 
                   value="${task?.dueDate ? toDateInputValue(task.dueDate) : (opts.defaultDate || '')}">
          </div>
          <div class="form-group" style="display:flex; align-items:center; gap: var(--space-3); padding-top: var(--space-2);">
            <label class="checkbox" style="cursor:pointer;">
              <input type="checkbox" class="checkbox__input" id="task-milestone" ${task?.milestone ? 'checked' : ''}>
              <span class="checkbox__box"></span>
              <span class="checkbox__label" style="text-decoration:none !important; color: var(--text-primary) !important;">⭐ Mark as Milestone</span>
            </label>
          </div>
        </form>
      `;
      
      // Build footer buttons
      const footerEl = createElement('div', {
        className: 'modal__footer-buttons',
        html: `
          <div style="display:flex; gap: var(--space-3); justify-content: flex-end; width:100%;">
            ${isEdit ? `<button type="button" class="btn btn--danger" id="modal-delete-btn">
              <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Delete
            </button>` : ''}
            <div style="flex:1;"></div>
            <button type="button" class="btn btn--secondary" id="modal-cancel-btn">Cancel</button>
            <button type="submit" form="task-form" class="btn btn--primary" id="modal-save-btn">
              ${isEdit ? 'Update' : 'Create'} Task
            </button>
          </div>
        `
      });
      
      this.open({
        title,
        body: formHtml,
        footer: footerEl,
        onClose: () => resolve(null)
      });
      
      // Handle cancel
      $('#modal-cancel-btn').addEventListener('click', () => {
        this._onClose = null;
        this.close();
        resolve(null);
      });
      
      // Handle delete
      if (isEdit) {
        $('#modal-delete-btn').addEventListener('click', () => {
          this._onClose = null;
          this.close();
          resolve({ action: 'delete', id: task.id });
        });
      }
      
      // Handle submit
      $('#task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
          action: isEdit ? 'update' : 'create',
          id: task?.id || null,
          title: $('#task-title').value.trim(),
          description: $('#task-description').value.trim(),
          category: $('#task-category').value,
          priority: $('#task-priority').value,
          dueDate: $('#task-due').value || null,
          milestone: $('#task-milestone').checked,
          completed: task?.completed || false
        };
        
        if (!formData.title) {
          showToast('Please enter a task title', 'error');
          return;
        }
        
        this._onClose = null;
        this.close();
        resolve(formData);
      });
    });
  },
  
  /**
   * Show a confirmation dialog.
   * @param {string} message 
   * @param {string} confirmText 
   * @returns {Promise<boolean>}
   */
  confirm(message, confirmText = 'Confirm') {
    return new Promise((resolve) => {
      const bodyEl = createElement('p', {
        text: message,
        className: 'modal-confirm-message'
      });
      bodyEl.style.color = 'var(--text-secondary)';
      bodyEl.style.fontSize = 'var(--font-size-base)';
      bodyEl.style.lineHeight = '1.6';
      
      const footerEl = createElement('div', {
        html: `
          <div style="display:flex; gap: var(--space-3); justify-content: flex-end; width:100%;">
            <button class="btn btn--secondary" id="confirm-cancel">Cancel</button>
            <button class="btn btn--danger" id="confirm-ok">${confirmText}</button>
          </div>
        `
      });
      
      this.open({
        title: 'Confirm Action',
        body: bodyEl,
        footer: footerEl,
        onClose: () => resolve(false)
      });
      
      $('#confirm-cancel').addEventListener('click', () => {
        this.close();
        resolve(false);
      });
      
      $('#confirm-ok').addEventListener('click', () => {
        this.close();
        resolve(true);
      });
    });
  },

  /**
   * Show a document creation/edit form in the modal.
   * @param {object} doc - Existing document data (null for new)
   * @returns {Promise<object|null>} - Resolved with form data or null if cancelled
   */
  showDocumentForm(doc = null) {
    return new Promise((resolve) => {
      const isEdit = !!doc;
      const title = isEdit ? 'Edit Document' : 'New Document';
      
      // Common emoji options for document icons
      const emojiOptions = ['📄','📨','🏛️','🛂','🎓','📜','✍️','📝','🛫','💰','🏥','📸','📋','📁','📑','🔖','🗂️','📎','🏦','🔒','🎤','💼','🌐','🔑'];
      
      const formHtml = `
        <form id="doc-form" class="task-form">
          <div class="form-group">
            <label class="form-label" for="doc-name">Document Name *</label>
            <input type="text" id="doc-name" class="form-input" 
                   placeholder="e.g., Motivationsletter" 
                   value="${doc?.name || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Icon</label>
            <div class="emoji-picker" id="emoji-picker">
              ${emojiOptions.map(e => `
                <button type="button" class="emoji-option ${(doc?.icon || '📄') === e ? 'emoji-option--active' : ''}" 
                        data-emoji="${e}" onclick="document.querySelectorAll('.emoji-option').forEach(b=>b.classList.remove('emoji-option--active')); this.classList.add('emoji-option--active');">
                  ${e}
                </button>
              `).join('')}
            </div>
          </div>
          ${isEdit ? `
            <div class="form-group">
              <label class="form-label" for="doc-status">Status</label>
              <select id="doc-status" class="form-input">
                <option value="Missing" ${doc?.status === 'Missing' ? 'selected' : ''}>Missing</option>
                <option value="In Progress" ${doc?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Uploaded" ${doc?.status === 'Uploaded' ? 'selected' : ''}>Uploaded</option>
              </select>
            </div>
          ` : ''}
        </form>
      `;
      
      const footerEl = createElement('div', {
        className: 'modal__footer-buttons',
        html: `
          <div style="display:flex; gap: var(--space-3); justify-content: flex-end; width:100%;">
            ${isEdit ? `<button type="button" class="btn btn--danger" id="modal-delete-btn">
              <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Delete
            </button>` : ''}
            <div style="flex:1;"></div>
            <button type="button" class="btn btn--secondary" id="modal-cancel-btn">Cancel</button>
            <button type="submit" form="doc-form" class="btn btn--primary" id="modal-save-btn">
              ${isEdit ? 'Update' : 'Create'} Document
            </button>
          </div>
        `
      });
      
      this.open({
        title,
        body: formHtml,
        footer: footerEl,
        onClose: () => resolve(null)
      });
      
      // Handle cancel
      $('#modal-cancel-btn').addEventListener('click', () => {
        this._onClose = null;
        this.close();
        resolve(null);
      });
      
      // Handle delete
      if (isEdit) {
        $('#modal-delete-btn').addEventListener('click', () => {
          this._onClose = null;
          this.close();
          resolve({ action: 'delete', id: doc.id });
        });
      }
      
      // Handle submit
      $('#doc-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const activeEmoji = document.querySelector('.emoji-option--active');
        const formData = {
          action: isEdit ? 'update' : 'create',
          id: doc?.id || null,
          name: $('#doc-name').value.trim(),
          icon: activeEmoji ? activeEmoji.dataset.emoji : '📄',
          status: isEdit ? $('#doc-status').value : 'Missing'
        };
        
        if (!formData.name) {
          showToast('Please enter a document name', 'error');
          return;
        }
        
        this._onClose = null;
        this.close();
        resolve(formData);
      });
    });
  }
};
