/* ============================================================
   DATABASE – db.js
   Firestore CRUD abstraction layer with user-scoped paths.
   
   DATABASE ARCHITECTURE:
     users/
       {uid}/                    ← Auth.getUid()
         tasks/{taskId}          ← Task documents
         documents/{docId}       ← Document checklist items
         settings/{settingKey}   ← User preferences / app settings
   
   USAGE:
     All public methods accept a collection name ('tasks', 'documents',
     'settings'). The DB layer automatically prepends the user path.
   ============================================================ */

const DB = {

  // ══════════════════════════════════════════
  //  PATH RESOLUTION
  // ══════════════════════════════════════════

  /**
   * Get the full Firestore collection path scoped to the current user.
   * Example: "tasks" → "users/abc123/tasks"
   * @param {string} collection - Short collection name
   * @returns {string} Full Firestore path
   */
  _userPath(collection) {
    const uid = Auth.getUid();
    if (!uid) throw new Error('User not authenticated');
    return `users/${uid}/${collection}`;
  },

  /**
   * Get a Firestore CollectionReference for the current user.
   * @param {string} collection 
   * @returns {firebase.firestore.CollectionReference}
   */
  _colRef(collection) {
    return db.collection(this._userPath(collection));
  },

  /**
   * Get a Firestore DocumentReference for a specific doc.
   * @param {string} collection 
   * @param {string} id 
   * @returns {firebase.firestore.DocumentReference}
   */
  _docRef(collection, id) {
    return db.collection(this._userPath(collection)).doc(id);
  },

  // ══════════════════════════════════════════
  //  CRUD OPERATIONS
  // ══════════════════════════════════════════

  /**
   * Add a new document to a user-scoped collection.
   * @param {string} collection - 'tasks', 'documents', or 'settings'
   * @param {object} data - Document fields
   * @returns {Promise<string>} New document ID
   */
  async add(collection, data) {
    if (!isFirebaseReady()) throw new Error('Firebase not configured');

    // Strip UI-specific properties before saving to database
    const { id, action, ...dbData } = data;
    
    const doc = {
      ...dbData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const ref = await this._colRef(collection).add(doc);
      return ref.id;
    } catch (error) {
      console.error(`Firestore add error [${this._userPath(collection)}]:`, error);
      showToast('Failed to save. Check your connection.', 'error');
      throw error;
    }
  },

  /**
   * Get all documents from a user-scoped collection.
   * @param {string} collection 
   * @param {object} opts - { orderBy: 'field', direction: 'asc'|'desc' }
   * @returns {Promise<Array<object>>}
   */
  async getAll(collection, opts = {}) {
    if (!isFirebaseReady() || !Auth.getUid()) return [];

    try {
      let query = this._colRef(collection);
      if (opts.orderBy) {
        query = query.orderBy(opts.orderBy, opts.direction || 'asc');
      }
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error(`Firestore getAll error [${this._userPath(collection)}]:`, error);
      return [];
    }
  },

  /**
   * Get a single document by ID.
   * @param {string} collection 
   * @param {string} id 
   * @returns {Promise<object|null>}
   */
  async getById(collection, id) {
    if (!isFirebaseReady() || !Auth.getUid()) return null;

    try {
      const doc = await this._docRef(collection, id).get();
      return doc.exists ? { ...doc.data(), id: doc.id } : null;
    } catch (error) {
      console.error(`Firestore getById error [${this._userPath(collection)}/${id}]:`, error);
      return null;
    }
  },

  /**
   * Update a document by ID (merge).
   * @param {string} collection 
   * @param {string} docId 
   * @param {object} data - Fields to update (merged, not replaced)
   * @returns {Promise<void>}
   */
  async update(collection, docId, data) {
    if (!isFirebaseReady()) throw new Error('Firebase not configured');

    // Strip UI-specific properties before updating
    const { id, action, ...dbData } = data;
    
    const update = {
      ...dbData,
      updatedAt: new Date().toISOString()
    };

    try {
      await this._docRef(collection, docId).update(update);
    } catch (error) {
      console.error(`Firestore update error [${this._userPath(collection)}/${docId}]:`, error);
      showToast('Failed to update. Check your connection.', 'error');
      throw error;
    }
  },

  /**
   * Delete a document by ID.
   * @param {string} collection 
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async delete(collection, id) {
    if (!isFirebaseReady()) throw new Error('Firebase not configured');

    try {
      await this._docRef(collection, id).delete();
    } catch (error) {
      console.error(`Firestore delete error [${this._userPath(collection)}/${id}]:`, error);
      showToast('Failed to delete. Check your connection.', 'error');
      throw error;
    }
  },

  // ══════════════════════════════════════════
  //  REAL-TIME LISTENERS
  // ══════════════════════════════════════════

  /**
   * Listen for real-time updates on a user-scoped collection.
   * @param {string} collection 
   * @param {function} callback - Called with Array<object> on every change
   * @param {object} opts - { orderBy, direction }
   * @returns {function} Unsubscribe function
   */
  listen(collection, callback, opts = {}) {
    if (!isFirebaseReady() || !Auth.getUid()) {
      callback([]);
      return () => {};
    }

    let query = this._colRef(collection);
    if (opts.orderBy) {
      query = query.orderBy(opts.orderBy, opts.direction || 'asc');
    }
    return query.onSnapshot(
      snapshot => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        callback(items);
      },
      error => {
        console.error(`Firestore listen error [${this._userPath(collection)}]:`, error);
      }
    );
  },

  // ══════════════════════════════════════════
  //  SETTINGS (Key-Value Store)
  // ══════════════════════════════════════════

  /**
   * Get a single setting value.
   * Settings are stored as users/{uid}/settings/{key} → { value: ... }
   * @param {string} key 
   * @param {*} defaultValue 
   * @returns {Promise<*>}
   */
  async getSetting(key, defaultValue = null) {
    if (!isFirebaseReady() || !Auth.getUid()) return defaultValue;

    try {
      const doc = await this._docRef('settings', key).get();
      return doc.exists ? doc.data().value : defaultValue;
    } catch (error) {
      console.error(`getSetting error [${key}]:`, error);
      return defaultValue;
    }
  },

  /**
   * Set a single setting value.
   * Uses set() with merge to create or update.
   * @param {string} key 
   * @param {*} value 
   * @returns {Promise<void>}
   */
  async setSetting(key, value) {
    if (!isFirebaseReady()) throw new Error('Firebase not configured');

    const data = {
      value,
      updatedAt: new Date().toISOString()
    };

    try {
      await this._docRef('settings', key).set(data, { merge: true });
    } catch (error) {
      console.error(`setSetting error [${key}]:`, error);
      throw error;
    }
  },

  // ══════════════════════════════════════════
  //  BATCH OPERATIONS
  // ══════════════════════════════════════════

  /**
   * Perform multiple writes atomically using a Firestore batch.
   * @param {function} callback - Receives a batch-like API: { set, update, delete }
   * @returns {Promise<void>}
   */
  async batch(callback) {
    if (!isFirebaseReady()) throw new Error('Firebase not configured');

    const batch = db.batch();
    const api = {
      set: (collection, id, data) => {
        batch.set(this._docRef(collection, id), {
          ...data,
          updatedAt: new Date().toISOString()
        });
      },
      update: (collection, id, data) => {
        batch.update(this._docRef(collection, id), {
          ...data,
          updatedAt: new Date().toISOString()
        });
      },
      delete: (collection, id) => {
        batch.delete(this._docRef(collection, id));
      }
    };
    
    callback(api);
    await batch.commit();
  }
};
