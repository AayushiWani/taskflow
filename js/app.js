/* ============================================================
   APP – app.js
   Main entry point: auth initialization, client-side routing,
   navigation, section initialization, and global event handlers.
   ============================================================ */

const App = {
  currentSection: 'dashboard',
  _initialized: false,  // Prevents double-init on auth state change
  
  /**
   * Boot the entire application.
   * 1. Wait for auth state to resolve
   * 2. Initialize the modal system
   * 3. Set up navigation
   * 4. Initialize all feature modules
   */
  async init() {
    Modal.init();
    
    // Set up navigation
    this.bindNavigation();
    this.updateSidebarDate();

    // Show splash screen sequence
    const splashScreen = $('#splash-screen');
    const splashDelay = new Promise(res => setTimeout(res, 1500)); // Minimum 1.5s display

    // Wait for auth to resolve AND the splash minimum time
    await Promise.all([Auth.init(), splashDelay]);
    
    // Hide splash screen
    if (splashScreen) {
      splashScreen.style.opacity = '0';
      setTimeout(() => splashScreen.remove(), 500);
    }

    // Register auth state change handler
    Auth.onAuthChange(async (user) => {
      if (this._initialized) {
        if (user) {
          await this.showLoadingScreen();
          await this._initModules();
          this.hideLoadingScreen();
          this.navigateTo('dashboard');
        } else {
          this.navigateTo('login');
        }
      }
    });
    
    // Initial Routing
    if (Auth.isSignedIn()) {
      await this.showLoadingScreen();
      await this._initModules();
      this.hideLoadingScreen();
      const targetSection = localStorage.getItem('lastSection') || 'dashboard';
      this.navigateTo(targetSection);
    } else {
      this.navigateTo('login');
    }

    this._initialized = true;
  },

  async showLoadingScreen() {
    const loader = $('#loading-screen');
    if (!loader) return;
    
    const title = $('#loading-title');
    if (title && Auth.currentUser) {
      title.textContent = `Welcome back, ${Auth.currentUser.displayName?.split(' ')[0] || 'User'}`;
    }
    
    loader.classList.add('active');
    // Ensure loading screen shows for at least 800ms for a smooth UX
    await new Promise(res => setTimeout(res, 800));
  },

  hideLoadingScreen() {
    const loader = $('#loading-screen');
    if (loader) loader.classList.remove('active');
  },
  
  /**
   * Initialize (or re-initialize) all feature modules.
   * Called on first load and whenever auth state changes.
   */
  async _initModules() {
    await Promise.all([
      Dashboard.init(),
      Calendar.init(),
      Tasks.init(),
      Documents.init()
    ]);
  },
  
  /**
   * Bind click events to all navigation links (sidebar + bottom nav).
   */
  bindNavigation() {
    // Sidebar nav links
    $$('.nav-link[data-section]').forEach(link => {
      link.addEventListener('click', () => {
        this.navigateTo(link.dataset.section);
      });
    });
    
    // Bottom nav links (mobile)
    $$('.bottom-nav__link[data-section]').forEach(link => {
      link.addEventListener('click', () => {
        this.navigateTo(link.dataset.section);
      });
    });
  },
  
  /**
   * Switch to a section by ID.
   * @param {string} sectionId - 'dashboard', 'calendar', 'tasks', 'documents'
   */
  async navigateTo(sectionId) {
    this.currentSection = sectionId;
    
    // Hide sidebar/header if login screen
    const sidebar = $('#sidebar');
    const header = $('#mobile-header');
    const bottomNav = $('.bottom-nav');
    
    if (sectionId === 'login') {
      document.body.classList.add('app--login');
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      if (bottomNav) bottomNav.style.display = 'none';
    } else {
      document.body.classList.remove('app--login');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (bottomNav) bottomNav.style.display = '';
      localStorage.setItem('lastSection', sectionId);
    }

    // Now that we're navigating to a section, we can show the app
    document.body.classList.remove('app--starting');
    
    // Update sidebar active state
    $$('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });
    
    // Update bottom nav active state
    $$('.bottom-nav__link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });
    
    // Show/hide sections
    $$('.section').forEach(section => {
      section.classList.toggle('active', section.id === `section-${sectionId}`);
    });
    
    // Refresh the active section's data
    switch (sectionId) {
      case 'dashboard':
        await Dashboard.refresh();
        break;
      case 'calendar':
        await Calendar.refresh();
        break;
      case 'tasks':
        await Tasks.refresh();
        break;
      case 'documents':
        await Documents.refresh();
        break;
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  
  /**
   * Display today's date in the sidebar footer.
   */
  updateSidebarDate() {
    const el = $('#sidebar-date');
    if (el) {
      const now = new Date();
      el.textContent = formatDate(now, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
};

// ── Boot the app when DOM is ready ──
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
