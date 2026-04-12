import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
  addDoc,
  collection,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const prayerCollection = collection(db, 'prayerWall');

const CATEGORY_MAP = {
  healing: '치유',
  family: '가정',
  faith: '신앙',
  life: '일상',
  recovery: '회복',
  thanks: '감사',
  '치유': '치유',
  '가정': '가정',
  '신앙': '신앙',
  '일상': '일상',
  '회복': '회복',
  '감사': '감사',
};

export function normalizeCategory(value) {
  return CATEGORY_MAP[value] || '회복';
}

export async function createPrayerPost({ nickname, content, category }) {
  const safeNickname = (nickname || '').trim().slice(0, 18);
  const safeContent = (content || '').trim().slice(0, 280);

  if (!safeNickname || !safeContent) {
    throw new Error('닉네임과 기도제목을 입력해주세요.');
  }

  await addDoc(prayerCollection, {
    nickname: safeNickname,
    content: safeContent,
    category: normalizeCategory(category),
    createdAt: Date.now(),
  });
}

export function subscribePrayerPosts(onUpdate, onError) {
  const prayerQuery = query(prayerCollection, orderBy('createdAt', 'desc'), limit(24));
  return onSnapshot(
    prayerQuery,
    (snapshot) => {
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(posts);
    },
    onError
  );
}

export function formatPrayerDate(value) {
  if (!value) {
    return '방금';
  }

  const date = typeof value === 'number' ? new Date(value) : new Date(Number(value));
  if (Number.isNaN(date.getTime())) {
    return '방금';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(date);
}
