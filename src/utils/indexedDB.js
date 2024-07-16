// utils/indexedDB.js

const DB_NAME = 'FlashcardApp';
const DB_VERSION = 3; // バージョンを上げて、新しいオブジェクトストアを追加
const SETS_STORE_NAME = 'sets';
const HISTORY_STORE_NAME = 'studyHistory';

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("Error opening database");

    request.onsuccess = (event) => resolve(event.target.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SETS_STORE_NAME)) {
        const store = db.createObjectStore(SETS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        const historyStore = db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        historyStore.createIndex('date', 'date', { unique: false });
      }
    };
  });
};

export const saveStudyHistory = async (setId, setTitle, setType, score, endTime) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE_NAME);
    const newEntry = {
      setId,
      setTitle,
      setType,
      score,
      date: endTime.toISOString(),
    };
    const request = store.add(newEntry);

    request.onerror = () => reject("Error saving study history");
    request.onsuccess = () => resolve(request.result);
  });
};

export const getStudyHistory = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE_NAME], 'readonly');
      const store = transaction.objectStore(HISTORY_STORE_NAME);
      const request = store.getAll();
  
      request.onerror = () => reject("Error getting study history");
      request.onsuccess = () => {
        const history = request.result.sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(history);
      };
    });
  };

export const saveSet = async (set) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SETS_STORE_NAME);
    const request = store.add(set);

    request.onerror = () => reject("Error saving set");
    request.onsuccess = () => resolve(request.result);
  });
};

export const getSets = async (type = null) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(SETS_STORE_NAME);
    let request;

    if (type) {
      const index = store.index('type');
      request = index.getAll(type);
    } else {
      request = store.getAll();
    }

    request.onerror = () => reject("Error getting sets");
    request.onsuccess = () => resolve(request.result);
  });
};

export const getAllSets = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(SETS_STORE_NAME);
      const request = store.getAll();
  
      request.onerror = () => reject("Error getting all sets");
      request.onsuccess = () => resolve(request.result);
    });
  };

export const getSetById = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SETS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(SETS_STORE_NAME);
      const request = store.get(id);
  
      request.onerror = () => reject("Error getting set");
      request.onsuccess = () => resolve(request.result);
    });
  };

export const updateSet = async (set) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SETS_STORE_NAME);
    const request = store.put(set);

    request.onerror = () => reject("Error updating set");
    request.onsuccess = () => resolve(request.result);
  });
};

export const deleteSet = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SETS_STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject("Error deleting set");
    request.onsuccess = () => resolve(request.result);
  });
};

export const getSetTitle = async (setId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(SETS_STORE_NAME);
    const request = store.get(setId);

    request.onerror = () => reject("Error getting set title");
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.title);
      } else {
        reject("Set not found");
      }
    };
  });
};