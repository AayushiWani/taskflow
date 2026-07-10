/* ============================================================
   DASHBOARD – dashboard.js
   Upcoming milestones, today's tasks, upcoming deadlines,
   progress ring, and category breakdown.
   
   MILESTONES:
   Auto-generated from tasks that have a due date AND are either:
     - High Priority, OR
     - Marked as milestone (task.milestone === true)
   Sorted by nearest due date. Completed tasks excluded.
   ============================================================ */

const Dashboard = {
  
  /**
   * Initialize the dashboard section.
   */
  async init() {
    await this.refresh();
  },
  
  /**
   * Refresh all dashboard data.
   */
  async refresh() {
    const tasks = await DB.getAll('tasks');
    this.renderMilestones(tasks);
    this.renderUpcoming(tasks);
    this.renderProgress(tasks);
    this.renderCategoryStats(tasks);
    
    // Bind event delegation if not already bound
    if (!this._eventsBound) {
      this.bindEvents();
      this._eventsBound = true;
    }
  },

  bindEvents() {
    const milestonesGrid = $('#milestones-container');
    if (milestonesGrid) {
      milestonesGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.milestone-card');
        if (card && card.dataset.id) {
          this.onMilestoneClick(card.dataset.id);
        }
      });
    }
  },
  
  // ══════════════════════════════════════════
  //  MILESTONES
  // ══════════════════════════════════════════
  
  /**
   * Get milestone-qualifying tasks from the full task list.
   * A task qualifies if it:
   *   1. Has a due date
   *   2. Is High Priority OR has milestone: true
   * Includes completed milestones so we can show their status.
   * Sorted by nearest due date.
   */
  getMilestones(tasks) {
    return tasks
      .filter(t => {
        if (!t.dueDate) return false;
        return t.priority === 'High' || t.milestone === true;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  },
  
  /**
   * Determine the status of a milestone based on its due date and completion.
   * @param {object} task 
   * @returns {{ status: string, label: string, daysText: string }}
   */
  getMilestoneStatus(task) {
    if (task.completed) {
      return { status: 'completed', label: 'Completed', daysText: '✓ Done' };
    }
    
    const now = startOfDay(new Date());
    const due = startOfDay(new Date(task.dueDate));
    const diffMs = due - now;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        status: 'overdue',
        label: 'Overdue',
        daysText: `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`
      };
    }
    
    if (diffDays === 0) {
      return { status: 'due-today', label: 'Due Today', daysText: 'Due today' };
    }
    
    return {
      status: 'upcoming',
      label: 'Upcoming',
      daysText: `${diffDays} day${diffDays !== 1 ? 's' : ''} left`
    };
  },
  
  /**
   * Get an appropriate icon for a milestone based on its category and title.
   */
  getMilestoneIcon(task) {
    // Use category icon as primary fallback
    if (task.category && CATEGORY_ICONS[task.category]) {
      return CATEGORY_ICONS[task.category];
    }
    
    // Keyword-based icon matching
    const title = (task.title || '').toLowerCase();
    if (title.includes('visa'))        return '✈️';
    if (title.includes('aps'))         return '🏛️';
    if (title.includes('ielts'))       return '📝';
    if (title.includes('university') || title.includes('application')) return '🎓';
    if (title.includes('sop'))         return '✍️';
    if (title.includes('lor'))         return '📨';
    if (title.includes('resume') || title.includes('cv'))  return '📄';
    if (title.includes('passport'))    return '🛂';
    if (title.includes('transcript'))  return '📜';
    if (title.includes('exam'))        return '📝';
    if (title.includes('interview'))   return '🎤';
    if (title.includes('deadline'))    return '⏰';
    
    return '🎯'; // Default milestone icon
  },
  
  /**
   * Render the milestones grid on the dashboard.
   */
  renderMilestones(tasks) {
    const container = $('#milestones-container');
    if (!container) return;
    
    const milestones = this.getMilestones(tasks);
    const display = milestones.filter(m => !m.completed);
    
    if (display.length === 0) {
      container.innerHTML = `
        <div class="milestones-empty">
          <div class="milestones-empty__icon">🎯</div>
          <div class="milestones-empty__title">No milestones yet</div>
          <div class="milestones-empty__text">
            Mark important tasks as milestones or set them to High priority — they'll appear here as a visual countdown to your key deadlines.
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="milestones-grid">
        ${display.map((task, i) => {
          const { status, label, daysText } = this.getMilestoneStatus(task);
          const icon = this.getMilestoneIcon(task);
          const dueDate = formatDate(task.dueDate, { day: 'numeric', month: 'long', year: 'numeric' });
          
          return `
            <div class="milestone-card milestone-card--${status}" 
                 style="animation-delay: ${i * 0.07}s"
                 data-id="${task.id}"
                 title="${task.title}">
              <div class="milestone-card__icon">${icon}</div>
              <div class="milestone-card__title">${task.title}</div>
              <div class="milestone-card__days">${daysText}</div>
              <div class="milestone-card__due">Due: ${dueDate}</div>
              <div class="milestone-card__status">
                <span>${status === 'completed' ? '✓' : status === 'overdue' ? '!' : status === 'due-today' ? '⚡' : '◷'}</span>
                ${label}
              </div>
              <div class="milestone-card__category">${CATEGORY_ICONS[task.category] || ''} ${task.category || 'Uncategorized'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    // Update milestone count in header
    const countEl = $('#milestones-count');
    if (countEl) {
      countEl.textContent = `${display.length} active`;
    }
  },
  
  /**
   * Handle clicking a milestone card — navigate to Tasks and open edit modal.
   */
  async onMilestoneClick(taskId) {
    const task = await DB.getById('tasks', taskId);
    if (!task) return;
    
    const result = await Modal.showTaskForm(task);
    if (!result) return;
    
    if (result.action === 'update') {
      await DB.update('tasks', taskId, result);
      showToast('Milestone updated!', 'success');
    } else if (result.action === 'delete') {
      const confirmed = await Modal.confirm('Are you sure you want to delete this milestone?', 'Delete');
      if (confirmed) {
        await DB.delete('tasks', taskId);
        showToast('Milestone deleted', 'info');
      }
    }
    
    await this.refresh();
    Tasks.refreshIfActive();
    Calendar.refreshIfActive();
  },
  

  // ══════════════════════════════════════════
  //  UPCOMING DEADLINES
  // ══════════════════════════════════════════
  
  renderUpcoming(tasks) {
    const container = $('#upcoming-list');
    const now = startOfDay(new Date());
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 7);
    
    const upcoming = tasks
      .filter(t => {
        if (!t.dueDate || t.completed) return false;
        const d = new Date(t.dueDate);
        return d >= now && d <= weekLater;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);
    
    if (upcoming.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📅</div>
          <div class="empty-state__text">No upcoming deadlines</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = upcoming.map(task => {
      const d = new Date(task.dueDate);
      return `
        <div class="deadline-item">
          <div class="deadline-item__date">
            <span class="deadline-item__day">${d.getDate()}</span>
            <span class="deadline-item__month">${MONTH_NAMES[d.getMonth()].slice(0,3)}</span>
          </div>
          <div class="deadline-item__info">
            <div class="deadline-item__title">${task.title}</div>
            <div class="deadline-item__category">${CATEGORY_ICONS[task.category] || ''} ${task.category}</div>
          </div>
          <span class="badge badge--${task.priority?.toLowerCase() || 'low'}">${task.priority || 'Low'}</span>
        </div>
      `;
    }).join('');
  },
  
  // ══════════════════════════════════════════
  //  PROGRESS RING
  // ══════════════════════════════════════════
  
  renderProgress(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Update ring
    const circle = $('#progress-ring-fill');
    if (circle) {
      const radius = 58;
      const circumference = 2 * Math.PI * radius;
      circle.style.strokeDasharray = circumference;
      circle.style.strokeDashoffset = circumference - (percentage / 100) * circumference;
    }
    
    // Update text
    const pctEl = $('#progress-percentage');
    if (pctEl) pctEl.textContent = `${percentage}%`;
    
    const labelEl = $('#progress-label');
    if (labelEl) labelEl.textContent = `${completed} of ${total} tasks`;
  },
  
  // ══════════════════════════════════════════
  //  CATEGORY STATS
  // ══════════════════════════════════════════
  
  renderCategoryStats(tasks) {
    const container = $('#category-stats');
    if (!container) return;
    
    container.innerHTML = CATEGORIES.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      const total = catTasks.length;
      const completed = catTasks.filter(t => t.completed).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return `
        <div class="category-stat">
          <div class="category-stat__name">${CATEGORY_ICONS[cat]} ${cat}</div>
          <div class="category-stat__value" style="color: var(--cat-${getCategoryClass(cat)})">${pct}%</div>
          <div class="category-stat__bar">
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width: ${pct}%; background: var(--cat-${getCategoryClass(cat)})"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },
  
  // ══════════════════════════════════════════
  //  ACTIONS
  // ══════════════════════════════════════════
  
  async toggleTask(id, completed) {
    await DB.update('tasks', id, { completed });
    await this.refresh();
    showToast(completed ? 'Task completed! 🎉' : 'Task reopened', 'success');
  }
};

// Expose globally for inline event handlers
window.Dashboard = Dashboard;
