/* ============================================================
   AUTH – auth.js
   Google Sign-In integration with Firebase Authentication.
   
   ARCHITECTURE:
   - Auth is MANDATORY. The app requires login to sync data.
   - All data is stored securely under users/{uid}/...
   - The Auth module exposes the current user's UID to the DB 
     layer via Auth.getUid().
   ============================================================ */

const Auth = {

  // ── State ──
  currentUser: null,        // Firebase User object (null if not signed in)
  _authReady: false,        // Has the auth state been resolved?
  _authReadyPromise: null,  // Promise that resolves when auth state is known
  _authReadyResolve: null,  // Resolver for the above promise
  _onAuthChangeCallbacks: [], // Registered auth state change listeners

  /**
   * Initialize the Auth module.
   * Sets up the Firebase auth state listener and prepares the UI.
   * @returns {Promise<void>} Resolves when auth state is first determined.
   */
  init() {
    // Create a promise that resolves when we first know the auth state
    this._authReadyPromise = new Promise(resolve => {
      this._authReadyResolve = resolve;
    });

    if (auth) {
      // Listen for Firebase auth state changes
      auth.onAuthStateChanged(user => {
        this.currentUser = user;
        this._authReady = true;
        this._authReadyResolve();

        // Update UI
        this._updateAuthUI();

        // Notify registered listeners
        this._onAuthChangeCallbacks.forEach(cb => cb(user));

        // Removed debug logs
      });
    } else {
      // Firebase not available – resolve immediately
      this._authReady = true;
      this._authReadyResolve();
      this._updateAuthUI();
    }

    // Bind UI event handlers
    this._bindEvents();

    return this._authReadyPromise;
  },

  /**
   * Get the current user's UID.
   * Returns the Firebase UID if signed in, or null otherwise.
   * This is used by the DB layer to scope all data under users/{uid}/...
   * @returns {string|null}
   */
  getUid() {
    return this.currentUser?.uid || null;
  },

  /**
   * Check if a real user is signed in (not the default anonymous user).
   * @returns {boolean}
   */
  isSignedIn() {
    return this.currentUser !== null;
  },

  /**
   * Wait until the auth state has been resolved.
   * Useful for gating app initialization.
   * @returns {Promise<void>}
   */
  whenReady() {
    return this._authReadyPromise;
  },

  /**
   * Register a callback for auth state changes.
   * @param {function} callback - Called with (user) on every auth change
   */
  onAuthChange(callback) {
    this._onAuthChangeCallbacks.push(callback);
  },

  // ── Sign-In / Sign-Out Actions ──

  /**
   * Sign in with Google popup.
   * @returns {Promise<firebase.auth.UserCredential|null>}
   */
  async signInWithGoogle() {
    if (!auth) {
      showToast('Firebase Auth not available', 'error');
      return null;
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      // Prompt user to select account every time
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await auth.signInWithPopup(provider);
      showToast(`Welcome, ${result.user.displayName}! 🎉`, 'success');
      return result;
    } catch (error) {
      // Handle common errors
      if (error.code === 'auth/popup-closed-by-user') {
        return null;
      }
      if (error.code === 'auth/cancelled-popup-request') {
        return null;
      }
      showToast(`Sign-in failed: ${error.message}`, 'error');
      return null;
    }
  },

  /**
   * Sign out the current user.
   * Data remains in Firestore under their UID.
   */
  async signOut() {
    if (!auth) return;

    try {
      await auth.signOut();
      showToast('Signed out successfully', 'info');
    } catch (error) {
      showToast('Failed to sign out. Try again.', 'error');
    }
  },

  // ── UI Updates ──

  /**
   * Update the sidebar/header auth UI based on current auth state.
   * Shows user avatar + name when signed in, sign-in button when not.
   */
  _updateAuthUI() {
    const authContainer = $('#auth-container');
    if (!authContainer) return;

    if (this.isSignedIn()) {
      const user = this.currentUser;
      const photoURL = user.photoURL || '';
      const displayName = user.displayName || user.email || 'User';
      const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      authContainer.innerHTML = `
        <div class="auth-profile" id="auth-profile">
          <div class="auth-avatar" id="auth-avatar">
            ${photoURL 
              ? `<img src="${photoURL}" alt="${displayName}" referrerpolicy="no-referrer">` 
              : `<span class="auth-avatar__initials">${initials}</span>`
            }
          </div>
          <div class="auth-info">
            <div class="auth-name">${displayName}</div>
            <div class="auth-email">${user.email || ''}</div>
          </div>
          <button class="btn btn--ghost btn--icon auth-signout-btn" id="auth-signout-btn" title="Sign Out">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      `;

      // Bind sign-out button
      const signOutBtn = $('#auth-signout-btn');
      if (signOutBtn) {
        signOutBtn.addEventListener('click', () => this.signOut());
      }
    } else {
      authContainer.innerHTML = `
        <button class="auth-signin-btn" id="auth-signin-btn" title="Sign in with Google">
          <svg class="auth-google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Sign in with Google</span>
        </button>
      `;

      // Bind sign-in button
      const signInBtn = $('#auth-signin-btn');
      if (signInBtn) {
        signInBtn.addEventListener('click', () => this.signInWithGoogle());
      }
    }
  },

  /**
   * Bind persistent UI event handlers.
   */
  _bindEvents() {
    // Bind the big Google login button on the splash/login screen
    const loginGoogleBtn = $('#login-google-btn');
    if (loginGoogleBtn) {
      loginGoogleBtn.addEventListener('click', () => this.signInWithGoogle());
    }
  }
};
