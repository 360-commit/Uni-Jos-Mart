import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { CLOUD, firebaseConfig } from "./firebase-config.js";

const hasFirebaseConfig = !!firebaseConfig && !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.appId;
const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const ensureFirebaseRuntime = () => {
  if (!app || !auth || !db) {
    throw new Error('Firebase is not configured yet. Add your web app config to public/js/firebase-config.js and reload the page.');
  }
};

const REQ = [
  'firstName',
  'surname',
  'email',
  'phone',
  'matric',
  'faculty',
  'department',
  'permAddress',
  'state',
  'lga',
  'schoolAddress',
];

const pubOf = (user) => ({
  id: user.id,
  name: [user.firstName, user.middleName, user.surname].filter(Boolean).join(' ').trim() || 'Student',
  photo: user.photo || '',
  faculty: user.faculty || '',
  department: user.department || '',
  schoolAddress: user.schoolAddress || '',
  phone: user.phone || '',
  email: user.email || '',
  matric: user.matric || '',
  campus: user.campus || 'University of Jos',
});

const MSG = {
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-not-found': 'No account was found with that email. Check it or create an account.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/weak-password': 'Password needs 6 or more characters.',
  'auth/missing-password': 'Enter your password to continue.',
  'auth/operation-not-allowed': 'Email sign-in is currently unavailable. Please contact support.',
  'auth/configuration-not-found': 'Email sign-in is not enabled yet. Please contact support.',
  'auth/invalid-login-credentials': 'Wrong email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes.',
  'auth/network-request-failed': 'Connection problem. Check your internet and try again.',
  'auth/timeout': 'The request took too long. Check your connection and try again.',
  'auth/internal-error': 'We could not complete your request. Please try again.',
  'auth/unauthorized-domain': 'This site is not authorized for sign-in. Please contact support.',
  'auth/invalid-api-key': 'Sign-in is temporarily unavailable. Please contact support.',
  'resource-exhausted': 'Uni-Jos Mart is very busy right now. Please try again later.',
  'permission-denied': 'You are not allowed to do that.',
  unavailable: 'No connection. Check your network.',
  'failed-precondition': 'The database index is still building. Try again in a few minutes.',
};

const fail = (error) => {
  const code = error?.code || '';
  const message = MSG[code]
    || MSG[code.replace('firestore/', '')]
    || (!code ? error?.message : '')
    || 'Something went wrong. Please check your connection and try again.';

  return new Error(message);
};

// upload to Cloudinary (free, no card); stored URL is already resized and compressed
const up = async (data) => {
  if (!data || !data.startsWith('data:')) {
    return data || '';
  }

  const formData = new FormData();
  formData.append('file', data);
  formData.append('upload_preset', CLOUD.preset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD.name}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!response.ok) {
    throw new Error('Photo upload failed. Try a smaller photo.');
  }

  return (await response.json()).secure_url.replace(
    '/upload/',
    '/upload/w_600,q_auto,f_auto/',
  );
};

const words = (value) => [
  ...new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 1),
  ),
].slice(0, 30);

const cache = new Map();
const TTL = 0;
let profileCache = null;

const uid = async () => {
  ensureFirebaseRuntime();
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error('Please log in first.');
  }

  return auth.currentUser.uid;
};

const emptyProfile = (id, email = '') => ({
  id,
  email,
  firstName: '',
  middleName: '',
  surname: '',
  phone: '',
  matric: '',
  faculty: '',
  department: '',
  schoolAddress: '',
  permAddress: '',
  state: '',
  lga: '',
  photo: '',
  campus: 'University of Jos',
});

const mine = async () => {
  const id = await uid();
  if (profileCache?.id === id) return profileCache;

  try {
    const snapshot = await getDoc(doc(db, 'users', id));
    if (!snapshot.exists()) {
      const fallback = { ...emptyProfile(id, auth.currentUser?.email || ''), id };
      profileCache = fallback;
      return fallback;
    }

    profileCache = snapshot.data();
    return profileCache;
  } catch (error) {
    const fallback = { ...emptyProfile(id, auth.currentUser?.email || ''), id };
    profileCache = fallback;
    return fallback;
  }
};

async function route(path, options) {
  const [pathname, queryString] = path.split('?');
  const params = new URLSearchParams(queryString || '');
  const body = options.body || {};
  const method = options.method || 'GET';

  if (pathname === '/signup') {
    if (!body.terms) {
      throw new Error('You must accept the Terms and Privacy Policy.');
    }

    if (REQ.some((field) => !String(body[field] || '').trim())) {
      throw new Error('Fill every required field.');
    }

    const email = body.email.trim().toLowerCase();
    let credential;
    let createdAuthUser = true;
    try {
      credential = await createUserWithEmailAndPassword(auth, email, body.password);
    } catch (error) {
      if (error.code !== 'auth/email-already-in-use') throw error;
      credential = await signInWithEmailAndPassword(auth, email, body.password);
      createdAuthUser = false;
    }

    const id = credential.user.uid;

    if (!createdAuthUser) {
      let existingProfile;
      try {
        existingProfile = await getDoc(doc(db, 'users', id));
      } catch (error) {
        await signOut(auth);
        throw error;
      }

      if (existingProfile.exists()) {
        await signOut(auth);
        throw new Error('An account already exists for this email. Please log in instead.');
      }
    }

    try {
      const user = {
        id,
        middleName: (body.middleName || '').trim(),
        photo: await up(body.photo),
        campus: 'University of Jos',
        created: Date.now(),
      };

      REQ.forEach((field) => {
        user[field] = String(body[field]).trim();
      });
      user.email = user.email.toLowerCase();

      const batch = writeBatch(db);
      batch.set(
        doc(db, 'matrics', user.matric.toUpperCase().replace(/\W/g, '_')),
        { uid: id },
      );
      batch.set(doc(db, 'users', id), user);
      batch.set(doc(db, 'publicUsers', id), pubOf(user));
      await batch.commit();

      profileCache = user;
      return { token: 'fb', user };
    } catch (error) {
      throw error.code === 'permission-denied'
        ? new Error('This matriculation number is already registered.')
        : error;
    }
  }

  if (pathname === '/login') {
    const credential = await signInWithEmailAndPassword(
      auth,
      String(body.email || '').trim().toLowerCase(),
      body.password || '',
    );

    profileCache = null;
    return {
      token: 'fb',
      user: {
        id: credential.user.uid,
        email: credential.user.email,
      },
    };
  }

  if (pathname === '/me') {
    if (method === 'PUT') {
      const id = await uid();
      const user = { ...await mine() };

      for (const field of [...REQ, 'middleName']) {
        if (body[field] !== undefined && field !== 'email' && field !== 'matric') {
          user[field] = String(body[field]).trim();
        }
      }

      if (body.photo !== undefined) {
        user.photo = await up(body.photo);
      }

      if (REQ.some((field) => !user[field])) {
        throw new Error('Required fields cannot be empty.');
      }

      const batch = writeBatch(db);
      batch.set(doc(db, 'users', id), user);
      batch.set(doc(db, 'publicUsers', id), pubOf(user));
      await batch.commit();
      profileCache = user;
      cache.clear();

      return user;
    }

    return mine();
  }

  if (pathname === '/items' && method === 'GET') {
    const userId = params.get('mine') ? await uid() : 0;
    const category = params.get('cat');
    const cacheKey = path + (userId || '');
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.t < TTL) {
      cached.v.fromCache = cached.fromCache;
      return cached.v;
    }

    const constraints = [];
    const searchText = (params.get('q') || '').toLowerCase();
    const searchWords = words(searchText).sort((a, b) => b.length - a.length);

    if (userId) {
      constraints.push(where('sellerId', '==', userId));
    } else if (searchWords.length) {
      constraints.push(where('kw', 'array-contains', searchWords[0]));
    } else if (category) {
      constraints.push(where('category', '==', category));
    }

    const snapshot = await getDocs(
      query(
        collection(db, 'items'),
        ...constraints,
        orderBy('created', 'desc'),
        limit(40),
      ),
    ); // always capped

    let items = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    if (searchWords.length) {
      items = items.filter((item) => (
        searchWords.every((word) => (item.kw || []).some((keyword) => keyword.startsWith(word)))
        && (!category || item.category === category)
      ));
    }

    items.fromCache = snapshot.metadata.fromCache;
    cache.set(cacheKey, {
      t: Date.now(),
      v: items,
      fromCache: snapshot.metadata.fromCache,
    });
    return items;
  }

  if (pathname === '/items' && method === 'POST') {
    const id = await uid();

    if (
      !body.title
      || !(String(body.price) !== '' && +body.price >= 0)
      || !body.category
      || !body.proof
    ) {
      throw new Error('Title, price, category and the proof-of-ownership confirmation are required.');
    }

    const [user, images] = await Promise.all([
      mine(),
      Promise.all((body.images || []).slice(0, 4).map(up)),
    ]);
    const item = {
      sellerId: id,
      title: String(body.title).slice(0, 80),
      description: String(body.description || '').slice(0, 800),
      price: Math.round(+body.price),
      category: body.category,
      condition: body.condition || 'Used',
      pickup: String(body.pickup || '').slice(0, 100),
      images,
      image: images[0] || '',
      status: 'available',
      kw: words(body.title + ' ' + body.category + ' ' + (body.description || '')),
      created: Date.now(),
      seller: pubOf(user),
    };

    const document = await addDoc(collection(db, 'items'), item);
    cache.clear();

    return { id: document.id, ...item };
  }

  const itemMatch = pathname.match(/^\/items\/(\w+)(\/status)?$/);

  if (itemMatch) {
    const itemRef = doc(db, 'items', itemMatch[1]);

    if (method === 'GET') {
      const snapshot = await getDoc(itemRef);

      if (!snapshot.exists()) {
        throw new Error('Item not found.');
      }

      return { id: snapshot.id, ...snapshot.data() };
    }

    if (itemMatch[2]) {
      if (!['available', 'reserved', 'sold'].includes(body.status)) {
        throw new Error('Invalid status.');
      }

      await updateDoc(itemRef, {
        status: body.status,
        soldAt: body.status === 'sold' ? Date.now() : null,
      });
      cache.clear();

      return {};
    }

    if (method === 'DELETE') {
      await deleteDoc(itemRef);
      cache.clear();

      return {};
    }
  }

  throw new Error('Not found.');
}

window.api = async (path, options = {}) => {
  try {
    return await route(path, options);
  } catch (error) {
    throw fail(error);
  }
};

let last = 0;

window.fb = {
  out: async () => {
    profileCache = null;
    await signOut(auth);
  },

  async chatOpen(itemId, buyer) {
    const userId = await uid();
    const itemSnapshot = await getDoc(doc(db, 'items', itemId));

    if (!itemSnapshot.exists()) {
      throw new Error('Item not found.');
    }

    const item = itemSnapshot.data();
    const chatId = itemId + '_' + buyer;
    const chatRef = doc(db, 'chats', chatId);

    if (userId === buyer) {
      if (buyer === item.sellerId) {
        throw new Error('This is your own item.');
      }

      await setDoc(
        chatRef,
        { participants: [buyer, item.sellerId], itemId, title: item.title },
        { merge: true },
      );
    }

    const chatSnapshot = await getDoc(chatRef);
    if (!chatSnapshot.exists()) {
      throw new Error('This conversation has not been started by the buyer yet.');
    }

    const chat = chatSnapshot.data();
    if (
      chat.itemId !== itemId
      || !Array.isArray(chat.participants)
      || !chat.participants.includes(userId)
    ) {
      throw new Error('You do not have access to this conversation.');
    }

    const review = await getDoc(doc(db, 'reviews', chatId));

    return {
      id: chatId,
      title: item.title,
      itemId,
      done: !!chat.done,
      buyer,
      sellerId: item.sellerId,
      reviewed: review.exists(),
    };
  },

  async send(id, text, image) {
    if (Date.now() - last < 1000) {
      throw new Error('Slow down a little.');
    }

    const userId = await uid();
    const message = text.slice(0, 500);
    const uploadedImage = image ? await up(image) : '';
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'chats', id, 'messages')), {
      from: userId,
      text: message,
      img: uploadedImage,
      t: Date.now(),
    });
    batch.update(doc(db, 'chats', id), {
      lastMsg: (message || 'Photo').slice(0, 60),
      lastFrom: userId,
      updated: Date.now(),
    });
    await batch.commit();
    last = Date.now();
  },

  watch: (id, callback) => onSnapshot(
    query(
      collection(db, 'chats', id, 'messages'),
      orderBy('t', 'desc'),
      limit(60),
    ),
    (snapshot) => callback(snapshot.docs.map((document) => document.data()).reverse()),
    (error) => callback([], fail(error)),
  ),

  async inbox() {
    const userId = await uid();
    const snapshot = await getDocs(
      query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        limit(50),
      ),
    );

    return snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort((a, b) => (b.updated || 0) - (a.updated || 0));
  },

  watchItems(filters = {}, callback) {
    const searchText = String(filters.q || '').trim().toLowerCase();
    const searchWords = words(searchText).sort((a, b) => b.length - a.length);
    const constraints = [];

    if (searchWords.length) {
      constraints.push(where('kw', 'array-contains', searchWords[0]));
    } else if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }

    return onSnapshot(
      query(
        collection(db, 'items'),
        ...constraints,
        orderBy('created', 'desc'),
        limit(40),
      ),
      (snapshot) => {
        let items = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

        if (searchWords.length) {
          items = items.filter((item) => (
            searchWords.every((word) => (item.kw || []).some((keyword) => keyword.startsWith(word)))
            && (!filters.category || item.category === filters.category)
          ));
        }

        callback(items, null);
      },
      (error) => callback([], fail(error)),
    );
  },
};

Object.assign(window.fb, {
  watchInbox(callback) {
    return onSnapshot(
      query(
        collection(db, 'chats'),
        where('participants', 'array-contains', auth.currentUser.uid),
        orderBy('updated', 'desc'),
        limit(20),
      ),
      (snapshot) => callback(snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }))),
      (error) => callback([], fail(error)),
    );
  },

  async seen(id) {
    await updateDoc(
      doc(db, 'chats', id),
      { ['seen.' + auth.currentUser.uid]: Date.now() },
    ).catch(() => {});
  },

  async isAdmin() {
    try {
      return (await getDoc(doc(db, 'admins', await uid()))).exists();
    } catch {
      return false;
    }
  },

  async verified(sellerId) {
    return (await getDoc(doc(db, 'verified', sellerId))).exists();
  },

  async setVerified(sellerId, verified) {
    const reference = doc(db, 'verified', sellerId);
    verified
      ? await setDoc(reference, { t: Date.now() })
      : await deleteDoc(reference);
  },

  async priv(sellerId) {
    return (await getDoc(doc(db, 'users', sellerId))).data();
  },

  async reports() {
    const snapshot = await getDocs(
      query(collection(db, 'reports'), orderBy('t', 'desc'), limit(30)),
    );

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));
  },

  async delReport(id) {
    await deleteDoc(doc(db, 'reports', id));
  },

  async delItem(id) {
    await deleteDoc(doc(db, 'items', id));
    cache.clear();
  },

  async isSaved(id) {
    return (await getDoc(doc(db, 'users', await uid(), 'saved', id))).exists();
  },

  async toggleSave(item) {
    const reference = doc(db, 'users', await uid(), 'saved', item.id);

    if ((await getDoc(reference)).exists()) {
      await deleteDoc(reference);
      return false;
    }

    await setDoc(reference, {
      title: item.title,
      price: item.price,
      image: item.image || '',
      category: item.category,
      status: item.status,
      t: Date.now(),
    });

    return true;
  },

  async saved() {
    const snapshot = await getDocs(
      query(collection(db, 'users', await uid(), 'saved'), limit(40)),
    );

    return snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort((a, b) => b.t - a.t);
  },

  async done(id, itemId) {
    await updateDoc(doc(db, 'chats', id), { done: true });
    await updateDoc(doc(db, 'items', itemId), {
      status: 'sold',
      soldAt: Date.now(),
    });
    cache.clear();
  },

  async review(id, chat, stars, text) {
    await setDoc(doc(db, 'reviews', id), {
      sellerId: chat.sellerId,
      buyerId: chat.buyer,
      itemId: chat.itemId,
      stars,
      text: String(text || '').slice(0, 200),
      t: Date.now(),
    });
  },

  async reviews(sellerId) {
    const user = (await getDoc(doc(db, 'publicUsers', sellerId))).data() || {
      name: 'Seller',
    };
    const snapshot = await getDocs(
      query(
        collection(db, 'reviews'),
        where('sellerId', '==', sellerId),
        limit(20),
      ),
    );

    return {
      u: user,
      list: snapshot.docs
        .map((document) => document.data())
        .sort((a, b) => b.t - a.t),
    };
  },

  async report(type, reference, reason) {
    const userId = await uid();

    await setDoc(doc(db, 'reports', userId + '_' + reference), {
      by: userId,
      type,
      ref: reference,
      reason: String(reason).slice(0, 300),
      t: Date.now(),
    });
  },
});
