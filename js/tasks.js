/* ============================================================
   TASKS – tasks.js
   Task list with category tabs, priority/status filters,
   CRUD operations, and sorting.
   ============================================================ */

const Tasks = {
  tasks: [],
  currentCategory: localStorage.getItem('tasks_currentCategory') || 'All',
  currentPriority: localStorage.getItem('tasks_currentPriority') || 'All',
  currentStatus: localStorage.getItem('tasks_currentStatus') || 'All',
  sortBy: localStorage.getItem('tasks_sortBy') || 'dueDate',
  
  /**
   * Initialize the tasks section.
   */
  async init() {
    this.restoreUI();
    this.bindEvents();
    await this.refresh();
  },

  /**
   * Restore UI elements (tabs and selects) based on loaded state.
   */
  restoreUI() {
    // Restore category tabs
    $$('.task-category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === this.currentCategory);
    });
    
    // Restore selects
    const prioritySelect = $('#task-priority-filter');
    const statusSelect = $('#task-status-filter');
    const sortSelect = $('#task-sort');
    
    if (prioritySelect) prioritySelect.value = this.currentPriority;
    if (statusSelect) statusSelect.value = this.currentStatus;
    if (sortSelect) sortSelect.value = this.sortBy;
  },
  
  /**
   * Refresh data and re-render (only if tasks section is visible).
   */
  async refresh() {
    this.tasks = await DB.getAll('tasks');
    this.render();
  },
  
  /**
   * Refresh only if the Tasks section is currently active.
   */
  refreshIfActive() {
    if ($('#section-tasks')?.classList.contains('active')) {
      this.refresh();
    }
  },
  
  /**
   * Bind filter, sort, and add button events.
   */
  bindEvents() {
    // Category tabs
    $$('.task-category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentCategory = tab.dataset.category;
        localStorage.setItem('tasks_currentCategory', this.currentCategory);
        $$('.task-category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.render();
      });
    });
    
    // Priority filter
    $('#task-priority-filter').addEventListener('change', (e) => {
      this.currentPriority = e.target.value;
      localStorage.setItem('tasks_currentPriority', this.currentPriority);
      this.render();
    });
    
    // Status filter
    $('#task-status-filter').addEventListener('change', (e) => {
      this.currentStatus = e.target.value;
      localStorage.setItem('tasks_currentStatus', this.currentStatus);
      this.render();
    });
    
    // Sort
    $('#task-sort').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      localStorage.setItem('tasks_sortBy', this.sortBy);
      this.render();
    });
    
    // Add task button
    $('#tasks-add-btn').addEventListener('click', async () => {
      const defaultCat = this.currentCategory !== 'All' ? this.currentCategory : undefined;
      const result = await Modal.showTaskForm(null, { defaultCategory: defaultCat });
      if (result && result.action === 'create') {
        await DB.add('tasks', result);
        showToast('Task created!', 'success');
        await this.refresh();
        await Dashboard.refresh();
        Calendar.refreshIfActive();
      }
    });

    // Event delegation for task list actions
    $('#task-list').addEventListener('click', (e) => {
      const editBtn = e.target.closest('.task-edit-btn');
      if (editBtn) {
        const id = editBtn.dataset.id;
        this.editTask(id);
        return;
      }
      
      const deleteBtn = e.target.closest('.task-delete-btn');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        this.deleteTask(id);
        return;
      }
    });

    $('#task-list').addEventListener('change', (e) => {
      if (e.target.classList.contains('task-toggle-checkbox')) {
        const id = e.target.dataset.id;
        this.toggleTask(id, e.target.checked);
      }
    });
  },
  
  /**
   * Filter and sort tasks, then render the list.
   */
  render() {
    let filtered = [...this.tasks];
    
    // Filter by category
    if (this.currentCategory !== 'All') {
      filtered = filtered.filter(t => t.category === this.currentCategory);
    }
    
    // Filter by priority
    if (this.currentPriority !== 'All') {
      filtered = filtered.filter(t => t.priority === this.currentPriority);
    }
    
    // Filter by status
    if (this.currentStatus === 'Pending') {
      filtered = filtered.filter(t => !t.completed);
    } else if (this.currentStatus === 'Completed') {
      filtered = filtered.filter(t => t.completed);
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (this.sortBy === 'dueDate') {
        const aDate = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
        const bDate = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
        return aDate - bDate;
      }
      if (this.sortBy === 'priority') {
        const order = { High: 0, Medium: 1, Low: 2 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      }
      if (this.sortBy === 'category') {
        return (a.category || '').localeCompare(b.category || '');
      }
      if (this.sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
    
    // Put completed at bottom and sort by newest completedAt
    const pending = filtered.filter(t => !t.completed);
    const completed = filtered.filter(t => t.completed);
    
    completed.sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime; // newest first
    });

    filtered = [...pending, ...completed];
    
    // Update count
    $('#task-count').innerHTML = `Showing <span>${filtered.length}</span> of <span>${this.tasks.length}</span> tasks`;
    
    // Render list
    const container = $('#task-list');
    
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📋</div>
          <div class="empty-state__text">No tasks found. Click "Add Task" to get started!</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = filtered.map((task, index) => {

      const isOverdue = task.dueDate && new Date(task.dueDate) < startOfDay(new Date()) && !task.completed;
      
      return `
        <div class="task-card task-card--${(task.priority || 'low').toLowerCase()} ${task.completed ? 'task-card--completed-styled' : ''}" 
             style="animation-delay: ${index * 0.05}s" data-id="${task.id}">
          <div class="task-card__checkbox">
            <label class="checkbox">
              <input type="checkbox" class="checkbox__input task-toggle-checkbox" 
                     ${task.completed ? 'checked' : ''}
                     data-id="${task.id}">
              <span class="checkbox__box"></span>
            </label>
          </div>
          <div class="task-card__content">
            <div class="task-card__header">
              <span class="task-card__title">${task.title}</span>
            </div>
            ${task.description ? `<div class="task-card__description">${task.description}</div>` : ''}
            <div class="task-card__meta">
              ${task.completed && task.completedAt ? `
                <span class="badge badge--success" style="background: rgba(16, 185, 129, 0.12); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2);">
                  ✓ Completed on ${formatDate(task.completedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              ` : ''}
              <span class="badge badge--${getCategoryClass(task.category)}">${CATEGORY_ICONS[task.category] || ''} ${task.category}</span>
              <span class="badge badge--${(task.priority || 'low').toLowerCase()}">${task.priority || 'Low'}</span>
              ${task.milestone ? '<span class="badge" style="background:rgba(245,158,11,0.12);color:#f59e0b;">⭐ Milestone</span>' : ''}
              ${task.dueDate ? `
                <span class="task-card__due ${isOverdue ? 'task-card__due--overdue' : ''}">
                  <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  ${isOverdue ? 'Overdue: ' : ''}${formatDate(task.dueDate)}
                </span>
              ` : ''}
            </div>
          </div>
          <div class="task-card__actions">
            <button class="btn btn--ghost btn--icon task-edit-btn" data-id="${task.id}" title="Edit task">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn--ghost btn--icon task-delete-btn" data-id="${task.id}" title="Delete task">
              <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },
  
  // ── Actions ──
  
  async toggleTask(id, completed) {
    const update = { completed };
    if (completed) {
      update.completedAt = new Date().toISOString();
    } else {
      update.completedAt = null;
    }
    await DB.update('tasks', id, update);
    await this.refresh();
    await Dashboard.refresh();
    Calendar.refreshIfActive();
    showToast(completed ? 'Task completed! 🎉' : 'Task reopened', 'success');
  },
  
  async editTask(id) {

    try {
      const task = await DB.getById('tasks', id);

      if (!task) return;
      
      const result = await Modal.showTaskForm(task);

      if (!result) return;
    
    if (result.action === 'update') {
      await DB.update('tasks', id, result);
      showToast('Task updated!', 'success');
    } else if (result.action === 'delete') {
      const confirmed = await Modal.confirm('Are you sure you want to delete this task?', 'Delete');
      if (confirmed) {
        await DB.delete('tasks', id);
        showToast('Task deleted', 'info');
      }
    }
    
    await this.refresh();
    await Dashboard.refresh();
    Calendar.refreshIfActive();
    } catch (error) {
      showToast('Failed to edit task. Please try again.', 'error');
    }
  },
  
  async deleteTask(id) {
    const confirmed = await Modal.confirm('Are you sure you want to delete this task?', 'Delete');
    if (confirmed) {
      await DB.delete('tasks', id);
      showToast('Task deleted', 'info');
      await this.refresh();
      await Dashboard.refresh();
      Calendar.refreshIfActive();
    }
  }
};

// Expose globally for inline event handlers
window.Tasks = Tasks;
