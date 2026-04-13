import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  runTransaction,
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const VISITOR_TIMEZONE = 'Asia/Seoul';
const VISITOR_STORAGE_PREFIX = '191-visitor-';

function getTodayDateKey() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VISITOR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getStorageItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage failures and continue with Firestore-only tracking.
  }
}

export async function trackTodayVisitor() {
  const dateKey = getTodayDateKey();
  const storageKey = `${VISITOR_STORAGE_PREFIX}${dateKey}`;
  const visitorDocRef = doc(db, 'dailyVisitors', dateKey);
  const hasTrackedToday = getStorageItem(storageKey) === '1';

  if (!hasTrackedToday) {
    try {
      const total = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(visitorDocRef);
        const currentTotal = snapshot.exists() ? Number(snapshot.data().total || 0) : 0;
        const nextTotal = currentTotal + 1;

        transaction.set(visitorDocRef, {
          dateKey,
          total: nextTotal,
          updatedAt: Date.now(),
        }, { merge: true });

        return nextTotal;
      });

      setStorageItem(storageKey, '1');
      return total;
    } catch (error) {
      console.warn('today visitor tracking failed', error);
    }
  }

  try {
    const snapshot = await getDoc(visitorDocRef);
    if (snapshot.exists()) {
      return Number(snapshot.data().total || 0);
    }
  } catch (error) {
    console.warn('today visitor fetch failed', error);
  }

  return 0;
}

export function subscribeTodayVisitors(onUpdate) {
  const dateKey = getTodayDateKey();
  const visitorDocRef = doc(db, 'dailyVisitors', dateKey);

  return onSnapshot(visitorDocRef, (snapshot) => {
    const total = snapshot.exists() ? Number(snapshot.data().total || 0) : 0;
    onUpdate(Number.isFinite(total) ? total : 0);
  });
}
