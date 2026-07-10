/* ============================================================
   CALENDAR – calendar.js
   Month and week views with task rendering, navigation,
   day-click interactions, and add/edit/delete from calendar.
   ============================================================ */

const Calendar = {
  currentDate: localStorage.getItem('calendar_currentDate') ? new Date(localStorage.getItem('calendar_currentDate')) : new Date(),
  currentView: localStorage.getItem('calendar_currentView') || 'month',
  tasks: [],
  selectedDate: null,
  
  /**
   * Initialize the calendar section.
   */
  async init() {
    this.restoreUI();
    this.bindEvents();
    await this.refresh();
  },

  /**
   * Restore UI elements (tabs) based on loaded state.
   */
  restoreUI() {
    $$('.calendar-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === this.currentView);
    });
  },
  
  /**
   * Refresh task data and re-render current view.
   */
  async refresh() {
    this.tasks = await DB.getAll('tasks');
    this.render();
  },
  
  /**
   * Refresh only if the Calendar section is currently active.
   */
  async refreshIfActive() {
    if ($('#section-calendar')?.classList.contains('active')) {
      await this.refresh();
    }
  },
  
  /**
   * Bind navigation and view toggle events.
   */
  bindEvents() {
    // Nav arrows
    $('#cal-prev').addEventListener('click', () => this.navigate(-1));
    $('#cal-next').addEventListener('click', () => this.navigate(1));
    $('#cal-today').addEventListener('click', () => {
      this.currentDate = new Date();
      localStorage.setItem('calendar_currentDate', this.currentDate.toISOString());
      this.render();
    });
    
    // View toggles
    $$('.calendar-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentView = btn.dataset.view;
        localStorage.setItem('calendar_currentView', this.currentView);
        $$('.calendar-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });
    
    // Add task from calendar
    $('#cal-add-btn').addEventListener('click', async () => {
      const defaultDate = this.selectedDate
        ? toDateInputValue(this.selectedDate)
        : toDateInputValue(new Date());
      const result = await Modal.showTaskForm(null, { defaultDate });
      if (result && result.action === 'create') {
        await DB.add('tasks', result);
        showToast('Task created!', 'success');
        await this.refresh();
        await Dashboard.refresh();
      }
    });

    // Event delegation for calendar interactions
    const calendarSection = $('#section-calendar');
    if (calendarSection && !this._eventsBound) {
      calendarSection.addEventListener('click', (e) => {
        // Stop propagation equivalents handled by specific classes
        const editBtn = e.target.closest('.cal-action-edit');
        if (editBtn) {
          e.stopPropagation();
          this.editTask(editBtn.dataset.id);
          return;
        }

        const deleteBtn = e.target.closest('.cal-action-delete');
        if (deleteBtn) {
          e.stopPropagation();
          this.deleteTask(deleteBtn.dataset.id);
          return;
        }

        const addBtn = e.target.closest('.cal-action-add');
        if (addBtn) {
          e.stopPropagation();
          this.addTaskForDate(addBtn.dataset.date);
          return;
        }

        const eventEl = e.target.closest('.cal-action-event');
        if (eventEl) {
          e.stopPropagation();
          this.editTask(eventEl.dataset.id);
          return;
        }

        const dayEl = e.target.closest('.cal-action-day');
        if (dayEl) {
          this.selectDate(dayEl.dataset.date);
          return;
        }
        
        const weekCol = e.target.closest('.cal-action-week-col');
        if (weekCol) {
          this.addTaskForDate(weekCol.dataset.date);
          return;
        }
      });

      calendarSection.addEventListener('change', (e) => {
        if (e.target.classList.contains('cal-action-toggle')) {
          this.toggleTask(e.target.dataset.id, e.target.checked);
        }
      });
      this._eventsBound = true;
    }
  },
  
  /**
   * Navigate forward or backward by 1 month or 1 week.
   */
  navigate(direction) {
    if (this.currentView === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() + direction * 7);
    }
    localStorage.setItem('calendar_currentDate', this.currentDate.toISOString());
    this.render();
  },
  
  /**
   * Render the current view (month or week).
   */
  render() {
    // Update title
    if (this.currentView === 'month') {
      $('#cal-title').textContent = `${MONTH_NAMES[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    } else {
      const weekDays = getWeekDays(this.currentDate);
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        $('#cal-title').textContent = `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      } else {
        $('#cal-title').textContent = `${MONTH_NAMES[start.getMonth()].slice(0,3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0,3)} ${end.getDate()}, ${end.getFullYear()}`;
      }
    }
    
    // Show/hide the correct view container
    const monthView = $('#calendar-month-view');
    const weekView = $('#calendar-week-view');
    
    if (this.currentView === 'month') {
      monthView.style.display = 'block';
      weekView.style.display = 'none';
      this.renderMonth();
    } else {
      monthView.style.display = 'none';
      weekView.style.display = 'block';
      this.renderWeek();
    }
    
    // Render day detail if a date is selected
    this.renderDayDetail();
  },
  
  /**
   * Render the month grid.
   */
  renderMonth() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const days = getMonthDays(year, month);
    const today = new Date();
    
    const container = $('#calendar-days');
    container.innerHTML = days.map(day => {
      const isOtherMonth = day.getMonth() !== month;
      const isToday_ = isSameDay(day, today);
      const isSelected = this.selectedDate && isSameDay(day, this.selectedDate);
      const dateStr = toDateInputValue(day);
      
      // Tasks for this day
      const dayTasks = this.tasks.filter(t => {
        if (!t.dueDate) return false;
        return isSameDay(new Date(t.dueDate), day);
      });
      
      const maxEvents = 3;
      const visibleTasks = dayTasks.slice(0, maxEvents);
      const remaining = dayTasks.length - maxEvents;
      
      let classes = 'calendar-day';
      if (isOtherMonth) classes += ' calendar-day--other-month';
      if (isToday_) classes += ' calendar-day--today';
      if (isSelected) classes += ' calendar-day--selected';
      
      return `
        <div class="${classes} cal-action-day" data-date="${dateStr}">
          <div class="calendar-day__number">${day.getDate()}</div>
          <div class="calendar-day__events">
            ${visibleTasks.map(t => `
              <div class="calendar-event calendar-event--${getCategoryClass(t.category)} cal-action-event" 
                   data-id="${t.id}"
                   title="${t.title}">
                ${t.title}
              </div>
            `).join('')}
            ${remaining > 0 ? `<div class="calendar-event-more">+${remaining} more</div>` : ''}
          </div>
          <button class="calendar-add-btn cal-action-add" data-date="${dateStr}" title="Add task">+</button>
        </div>
      `;
    }).join('');
  },
  
  /**
   * Render the week view.
   */
  renderWeek() {
    const weekDays = getWeekDays(this.currentDate);
    const today = new Date();
    
    // Week header
    const headerContainer = $('#week-header');
    headerContainer.innerHTML = weekDays.map(day => {
      const isToday_ = isSameDay(day, today);
      return `
        <div class="week-header__day ${isToday_ ? 'week-header__day--today' : ''}">
          <div class="week-header__name">${DAY_NAMES[day.getDay()]}</div>
          <div class="week-header__number">${day.getDate()}</div>
        </div>
      `;
    }).join('');
    
    // Week body (tasks)
    const bodyContainer = $('#week-body');
    bodyContainer.innerHTML = weekDays.map(day => {
      const dateStr = toDateInputValue(day);
      const dayTasks = this.tasks.filter(t => {
        if (!t.dueDate) return false;
        return isSameDay(new Date(t.dueDate), day);
      });
      
      return `
        <div class="week-column cal-action-week-col" data-date="${dateStr}">
          ${dayTasks.map(t => `
            <div class="week-task week-task--${getCategoryClass(t.category)} cal-action-event" 
                 data-id="${t.id}"
                 title="${t.title}">
              ${t.completed ? '✓ ' : ''}${t.title}
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  },
  
  /**
   * Render the day detail panel below the calendar.
   */
  renderDayDetail() {
    const container = $('#day-detail');
    if (!this.selectedDate) {
      container.style.display = 'none';
      return;
    }
    
    container.style.display = 'block';
    const date = new Date(this.selectedDate);
    const dayTasks = this.tasks.filter(t => {
      if (!t.dueDate) return false;
      return isSameDay(new Date(t.dueDate), date);
    });
    
    const titleEl = $('#day-detail-title');
    titleEl.textContent = formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    const listEl = $('#day-detail-list');
    if (dayTasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding: var(--space-6);">
          <div class="empty-state__text">No tasks for this day</div>
        </div>
      `;
      return;
    }
    
    listEl.innerHTML = dayTasks.map(task => `
      <div class="day-detail-task ${task.completed ? 'task-card--completed' : ''}">
        <label class="checkbox">
          <input type="checkbox" class="checkbox__input cal-action-toggle" 
                 ${task.completed ? 'checked' : ''} 
                 data-id="${task.id}">
          <span class="checkbox__box"></span>
        </label>
        <span class="day-detail-task__title ${task.completed ? '' : ''}">${task.title}</span>
        <span class="badge badge--${getCategoryClass(task.category)}">${task.category}</span>
        <span class="badge badge--${task.priority?.toLowerCase() || 'low'}">${task.priority || 'Low'}</span>
        <div class="day-detail-task__actions">
          <button class="btn btn--ghost btn--icon cal-action-edit" data-id="${task.id}" title="Edit">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn--ghost btn--icon cal-action-delete" data-id="${task.id}" title="Delete">
            <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  },
  
  // ── Actions ──
  
  selectDate(dateStr) {
    this.selectedDate = new Date(dateStr + 'T00:00:00');
    // Highlight selected day
    $$('.calendar-day').forEach(el => el.classList.remove('calendar-day--selected'));
    const selected = $(`.calendar-day[data-date="${dateStr}"]`);
    if (selected) selected.classList.add('calendar-day--selected');
    this.renderDayDetail();
  },
  
  async addTaskForDate(dateStr) {
    const result = await Modal.showTaskForm(null, { defaultDate: dateStr });
    if (result && result.action === 'create') {
      await DB.add('tasks', result);
      showToast('Task created!', 'success');
      await this.refresh();
      await Dashboard.refresh();
      Tasks.refreshIfActive();
    }
  },
  
  async editTask(id) {
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
    Tasks.refreshIfActive();
  },
  
  async toggleTask(id, completed) {
    await DB.update('tasks', id, { completed });
    await this.refresh();
    await Dashboard.refresh();
    Tasks.refreshIfActive();
    showToast(completed ? 'Task completed! 🎉' : 'Task reopened', 'success');
  },
  
  async deleteTask(id) {
    const confirmed = await Modal.confirm('Are you sure you want to delete this task?', 'Delete');
    if (confirmed) {
      await DB.delete('tasks', id);
      showToast('Task deleted', 'info');
      await this.refresh();
      await Dashboard.refresh();
      Tasks.refreshIfActive();
    }
  }
};

// Expose globally for inline event handlers
window.Calendar = Calendar;
