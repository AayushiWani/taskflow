/* ============================================================
   UTILITIES – utils.js
   Date helpers, DOM utilities, toast notifications,
   and other shared helper functions.
   ============================================================ */

// ── Date Formatting ──

/**
 * Format a Date object or Firestore timestamp to a readable string.
 * @param {Date|{seconds:number}} date
 * @param {object} opts - Intl.DateTimeFormat options
 * @returns {string}
 */
function formatDate(date, opts = {}) {
  if (!date) return '';
  // Handle Firestore Timestamp objects
  if (date.seconds) date = new Date(date.seconds * 1000);
  if (typeof date === 'string') date = new Date(date);
  
  const defaults = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat('en-US', { ...defaults, ...opts }).format(date);
}

/**
 * Format a date as YYYY-MM-DD (for <input type="date"> value).
 * @param {Date} date
 * @returns {string}
 */
function toDateInputValue(date) {
  if (!date) return '';
  if (date.seconds) date = new Date(date.seconds * 1000);
  if (typeof date === 'string') date = new Date(date);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get a relative time string like "2 days ago" or "in 3 hours".
 * @param {Date} date
 * @returns {string}
 */
function relativeTime(date) {
  if (!date) return '';
  if (date.seconds) date = new Date(date.seconds * 1000);
  if (typeof date === 'string') date = new Date(date);
  
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  return formatDate(date);
}

/**
 * Check if two dates are the same calendar day.
 */
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/**
 * Check if a date is today.
 */
function isToday(date) {
  return isSameDay(date, new Date());
}

/**
 * Get the start of a day (midnight).
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get all days in a month as an array of Date objects,
 * padded to start on Sunday and end on Saturday.
 */
function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  
  // Pad from previous month
  const startPad = firstDay.getDay(); // 0=Sun
  for (let i = startPad - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  
  // Days of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  
  // Pad to complete last week
  const endPad = 6 - lastDay.getDay();
  for (let i = 1; i <= endPad; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
}

/**
 * Get the week (Sun–Sat) containing the given date.
 */
function getWeekDays(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const wd = new Date(start);
    wd.setDate(start.getDate() + i);
    days.push(wd);
  }
  return days;
}

// ── Month & Day names ──
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_SHORT = ['S','M','T','W','T','F','S'];

// ── DOM Utilities ──

/**
 * Create a DOM element with classes and attributes.
 * @param {string} tag 
 * @param {object} opts - { className, id, text, html, attrs, children, events }
 * @returns {HTMLElement}
 */
function createElement(tag, opts = {}) {
  const el = document.createElement(tag);
  if (opts.className) el.className = opts.className;
  if (opts.id) el.id = opts.id;
  if (opts.text) el.textContent = opts.text;
  if (opts.html) el.innerHTML = opts.html;
  if (opts.attrs) {
    Object.entries(opts.attrs).forEach(([k, v]) => el.setAttribute(k, v));
  }
  if (opts.children) {
    opts.children.forEach(child => {
      if (child) el.appendChild(child);
    });
  }
  if (opts.events) {
    Object.entries(opts.events).forEach(([event, handler]) => {
      el.addEventListener(event, handler);
    });
  }
  return el;
}

/**
 * Shorthand for querySelector.
 */
function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Shorthand for querySelectorAll.
 */
function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

// ── Toast Notification System ──

let toastContainer = null;

/**
 * Show a toast notification.
 * @param {string} message 
 * @param {'success'|'error'|'info'} type 
 * @param {number} duration - ms before auto-dismiss
 */
function showToast(message, type = 'info', duration = 3000) {
  if (!toastContainer) {
    toastContainer = createElement('div', { className: 'toast-container', id: 'toast-container' });
    document.body.appendChild(toastContainer);
  }
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };
  
  const toast = createElement('div', {
    className: `toast toast--${type}`,
    html: `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`
  });
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Category Helpers ──

const CATEGORIES = ['Germany', 'Internship', 'IELTS', 'German', 'Personal'];

const CATEGORY_ICONS = {
  Germany:    '🇩🇪',
  Internship: '💼',
  IELTS:      '📝',
  German:     '🗣️',
  Personal:   '⭐'
};

/**
 * Get the CSS class suffix for a category.
 */
function getCategoryClass(category) {
  return category ? category.toLowerCase().replace(/\s+/g, '-') : 'personal';
}

// ── Priority Helpers ──
const PRIORITIES = ['High', 'Medium', 'Low'];

// ── ID Generator ──

/**
 * Generate a simple unique ID (for demo/offline mode).
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ── Debounce ──

/**
 * Debounce a function call.
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
