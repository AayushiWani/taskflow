/* ============================================================
   DOCUMENTS – documents.js
   Document readiness checklist with full CRUD:
   - Create new document types
   - Edit name, icon, status, notes
   - Delete documents
   - Reorder documents (move up/down)
   - Progress calculation
   ============================================================ */

const Documents = {
  // ── Default Document Types ──
  // Seeded on first use. Users can add/remove/edit these.
  DEFAULT_DOCS: [
    { name: 'Letters of Recommendation', icon: '📨', key: 'lor',        order: 0  },
    { name: 'APS Certificate',           icon: '🏛️', key: 'aps',        order: 1  },
    { name: 'Passport',                  icon: '🛂', key: 'passport',   order: 2  },
    { name: 'Degree Certificate',        icon: '🎓', key: 'degree',     order: 3  },
    { name: 'Academic Transcript',       icon: '📜', key: 'transcript', order: 4  },
    { name: 'Statement of Purpose',      icon: '✍️', key: 'sop',        order: 5  },
    { name: 'Resume / CV',              icon: '📄', key: 'resume',     order: 6  },
    { name: 'IELTS Score Report',        icon: '📝', key: 'ielts',      order: 7  },
    { name: 'Visa Application',          icon: '🛫', key: 'visa',       order: 8  },
    { name: 'Financial Documents',       icon: '💰', key: 'financial',  order: 9  },
    { name: 'Health Insurance',          icon: '🏥', key: 'insurance',  order: 10 },
    { name: 'Photographs',              icon: '📸', key: 'photos',     order: 11 },
  ],
  
  documents: [],
  
  /**
   * Initialize the documents section.
   * Seeds default documents if none exist, then binds events.
   */
  async init() {
    await this.seedDefaults();
    this.bindEvents();
    await this.refresh();
  },
  
  /**
   * Seed default documents if the collection is empty.
   */
  async seedDefaults() {
    const existing = await DB.getAll('documents');
    if (existing.length > 0) {
      this.documents = existing;
      return;
    }
    
    // Create default documents with order field
    for (const doc of this.DEFAULT_DOCS) {
      await DB.add('documents', {
        name: doc.name,
        icon: doc.icon,
        key: doc.key,
        order: doc.order,
        status: 'Missing', // 'Missing', 'In Progress', 'Uploaded'
        driveUrl: '',
        updatedAt: null
      });
    }
    
    this.documents = await DB.getAll('documents');
  },
  
  /**
   * Bind the "Add Document" button event and event delegation for the grid.
   */
  bindEvents() {
    const addBtn = $('#docs-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addDocument());
    }

    const grid = $('#documents-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const reorderUp = e.target.closest('.doc-action-move-up');
        if (reorderUp && !reorderUp.disabled) {
          this.moveDocument(reorderUp.dataset.id, -1);
          return;
        }

        const reorderDown = e.target.closest('.doc-action-move-down');
        if (reorderDown && !reorderDown.disabled) {
          this.moveDocument(reorderDown.dataset.id, 1);
          return;
        }

        const editBtn = e.target.closest('.doc-action-edit');
        if (editBtn) {
          this.editDocument(editBtn.dataset.id);
          return;
        }

        const saveBtn = e.target.closest('.doc-action-save-link');
        if (saveBtn) {
          this.saveDriveLink(saveBtn.dataset.id);
          return;
        }

        const copyBtn = e.target.closest('.doc-action-copy-link');
        if (copyBtn) {
          this.copyDriveLink(copyBtn.dataset.id);
          return;
        }
      });

      grid.addEventListener('change', (e) => {
        if (e.target.classList.contains('doc-action-status-change')) {
          this.updateStatus(e.target.dataset.id, e.target.value);
        }
      });
    }
  },
  
  /**
   * Refresh document data and re-render.
   */
  async refresh() {
    this.documents = await DB.getAll('documents');
    // Sort by order field, then by createdAt for new ones without order
    this.documents.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      // Fallback: sort by creation time
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
    this.render();
  },
  
  /**
   * Render the documents section.
   */
  render() {
    this.renderProgress();
    this.renderGrid();
  },
  
  // ══════════════════════════════════════════
  //  PROGRESS BAR
  // ══════════════════════════════════════════
  
  renderProgress() {
    const total = this.documents.length;
    const complete = this.documents.filter(d => d.status === 'Uploaded').length;
    const inProgress = this.documents.filter(d => d.status === 'In Progress').length;
    const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
    
    $('#docs-progress-bar').querySelector('.progress-bar__fill').style.width = `${pct}%`;
    $('#docs-progress-text').textContent = `${complete} of ${total} documents ready`;
    $('#docs-progress-pct').textContent = `${pct}%`;
    
    const detailEl = $('#docs-progress-detail');
    if (detailEl) {
      detailEl.textContent = `${inProgress} in progress · ${total - complete - inProgress} pending`;
    }
  },
  
  // ══════════════════════════════════════════
  //  DOCUMENT GRID
  // ══════════════════════════════════════════
  
  renderGrid() {
    const container = $('#documents-grid');
    const total = this.documents.length;
    
    if (total === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">📋</div>
          <div class="empty-state__text">No documents yet. Click "Add Document" to create your first checklist item.</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.documents.map((doc, index) => {
      const statusClass = doc.status || 'pending';
      const statusSelectClass = `document-card__status-select--${statusClass}`;
      const isFirst = index === 0;
      const isLast = index === total - 1;
      
      return `
        <div class="document-card document-card--${statusClass.replace(' ', '-').toLowerCase()}" 
             style="animation: fadeIn 0.3s ease ${index * 0.04}s both;"
             data-doc-id="${doc.id}">
          <div class="document-card__header">
            <div class="document-card__icon">${doc.icon || '📄'}</div>
            <div class="document-card__actions">
              <div class="document-card__reorder">
                <button class="document-card__reorder-btn doc-action-move-up ${isFirst ? 'document-card__reorder-btn--disabled' : ''}" 
                        data-id="${doc.id}" 
                        title="Move up" ${isFirst ? 'disabled' : ''}>
                  <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button class="document-card__reorder-btn doc-action-move-down ${isLast ? 'document-card__reorder-btn--disabled' : ''}" 
                        data-id="${doc.id}" 
                        title="Move down" ${isLast ? 'disabled' : ''}>
                  <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
              <button class="document-card__edit-btn doc-action-edit" 
                      data-id="${doc.id}" 
                      title="Edit document">
                <svg viewBox="0 0 24 24" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <select class="document-card__status-select doc-action-status-change document-card__status-select--${statusClass.replace(' ', '-').toLowerCase()}" 
                      data-id="${doc.id}">
                <option value="Missing" ${statusClass === 'Missing' ? 'selected' : ''}>Missing</option>
                <option value="In Progress" ${statusClass === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Uploaded" ${statusClass === 'Uploaded' ? 'selected' : ''}>Uploaded</option>
              </select>
            </div>
          </div>
          <div class="document-card__name">${doc.name}</div>
          
          <div class="document-card__drive">
            <div class="document-card__drive-input-group">
              <div class="document-card__drive-icon">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              </div>
              <input type="text" class="document-card__drive-input" 
                     id="drive-input-${doc.id}"
                     placeholder="Paste Google Drive link..."
                     value="${doc.driveUrl || ''}">
              <button class="document-card__drive-save doc-action-save-link" data-id="${doc.id}">Save</button>
            </div>
            ${doc.driveUrl ? `
              <div class="document-card__drive-actions">
                <a href="${doc.driveUrl}" target="_blank" class="document-card__drive-btn" title="Open in Drive">
                  <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  Open
                </a>
                <button class="document-card__drive-btn document-card__drive-btn--copy doc-action-copy-link" data-id="${doc.id}" title="Copy link">
                  <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  Copy
                </button>
              </div>
            ` : ''}
          </div>
          ${doc.updatedAt ? `
            <div class="document-card__updated">Last updated: ${formatDate(doc.updatedAt, { hour: 'numeric', minute: '2-digit' })}</div>
          ` : ''}
        </div>
      `;
    }).join('');
  },
  
  // ══════════════════════════════════════════
  //  CRUD ACTIONS
  // ══════════════════════════════════════════
  
  /**
   * Open the "Add Document" modal.
   */
  async addDocument() {
    const result = await Modal.showDocumentForm(null);
    if (!result || result.action !== 'create') return;
    
    // Assign order = last position
    const maxOrder = this.documents.reduce((max, d) => Math.max(max, d.order ?? 0), -1);
    
    await DB.add('documents', {
      name: result.name,
      icon: result.icon,
      status: 'Missing',
      driveUrl: '',
      updatedAt: null,
      order: maxOrder + 1
    });
    
    showToast(`"${result.name}" added to checklist`, 'success');
    await this.refresh();
  },
  
  /**
   * Open the "Edit Document" modal for an existing document.
   */
  async editDocument(id) {
    const doc = await DB.getById('documents', id);
    if (!doc) return;
    
    const result = await Modal.showDocumentForm(doc);
    if (!result) return;
    
    if (result.action === 'update') {
      await DB.update('documents', id, {
        name: result.name,
        icon: result.icon,
        status: result.status
      });
      showToast('Document updated', 'success');
      await this.refresh();
    } else if (result.action === 'delete') {
      await this.deleteDocument(id);
    }
  },
  
  /**
   * Delete a document with confirmation.
   */
  async deleteDocument(id) {
    const doc = this.documents.find(d => d.id === id);
    const name = doc?.name || 'this document';
    
    const confirmed = await Modal.confirm(
      `Are you sure you want to remove "${name}" from the checklist?`,
      'Delete'
    );
    
    if (confirmed) {
      await DB.delete('documents', id);
      showToast(`"${name}" removed`, 'info');
      await this.refresh();
    }
  },
  
  /**
   * Update a document's status via the inline dropdown.
   */
  async updateStatus(id, status) {
    await DB.update('documents', id, { status });
    showToast(
      status === 'Uploaded' ? 'Document marked uploaded! ✅' :
      status === 'In Progress' ? 'Document in progress ⏳' :
      'Document status missing', 
      'success'
    );
    await this.refresh();
  },
  
  /**
   * Automatically update the status based on Drive URL.
   */
  async autoUpdateStatus(id, newUrl) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) return;
    const hasUrl = !!newUrl;
    const newStatus = hasUrl ? 'Uploaded' : 'Missing';
    if (doc.status !== newStatus) {
      await DB.update('documents', id, { status: newStatus });
      doc.status = newStatus;
    }
  },

  /**
   * Save the Google Drive link from the input field.
   */
  async saveDriveLink(docId) {
    const input = document.getElementById(`drive-input-${docId}`);
    if (!input) return;
    
    const url = input.value.trim();
    const doc = this.documents.find(d => d.id === docId);
    if (!doc) return;

    try {
      await DB.update('documents', docId, { 
        driveUrl: url,
        updatedAt: new Date().toISOString()
      });
      doc.driveUrl = url;
      await this.autoUpdateStatus(docId, url);
      showToast('Drive link saved', 'success');
      await this.refresh();
    } catch (error) {
      showToast('Failed to save link', 'error');
    }
  },

  /**
   * Copy the Drive link to clipboard.
   */
  async copyDriveLink(docId) {
    const doc = this.documents.find(d => d.id === docId);
    if (!doc || !doc.driveUrl) return;

    try {
      await navigator.clipboard.writeText(doc.driveUrl);
      showToast('Link copied to clipboard', 'info');
    } catch (err) {
      showToast('Failed to copy link', 'error');
    }
  },

  // ══════════════════════════════════════════
  //  REORDER
  // ══════════════════════════════════════════
  
  /**
   * Move a document up or down in the list.
   * @param {string} id - Document ID to move
   * @param {number} direction - -1 for up, +1 for down
   */
  async moveDocument(id, direction) {
    const index = this.documents.findIndex(d => d.id === id);
    if (index === -1) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.documents.length) return;
    
    // Swap the two documents' order values
    const docA = this.documents[index];
    const docB = this.documents[newIndex];
    
    const orderA = docA.order ?? index;
    const orderB = docB.order ?? newIndex;
    
    // Use batch write for atomicity
    await DB.batch((batch) => {
      batch.update('documents', docA.id, { order: orderB });
      batch.update('documents', docB.id, { order: orderA });
    });
    
    await this.refresh();
  }
};

// Expose globally for inline event handlers
window.Documents = Documents;
