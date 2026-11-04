import { trackScreen } from "./analytics.js";

const $ = (s) => document.querySelector(s);
let tk = localStorage.tk || '';
let me = null;
let profileReady = false;
let profileLoadFailed = false;
let afterAuth = () => '#/';
let recentListing = null;
let liveFeedUnsub = 0;

const P = {
  home: '<path d="M3 11l9-8 9 8v10H3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  pin: '<path d="M12 22s7-7 7-12a7 7 0 00-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  phone: '<path d="M5 4h4l2 5-2 1a11 11 0 005 5l1-2 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z"/>',
  heart: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z"/>',
  chat: '<path d="M4 4h16v12H8l-4 4z"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
};

const ic = (n) => `<svg class="ic" viewBox="0 0 24 24">${P[n]}</svg>`;
const naira = (n) => +n ? '₦' + Number(n).toLocaleString('en-NG') : 'Free';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[c]));

const FRIENDLY = {
  'Please log in first.': 'You need to log in to do that.',
  'Item not found.': 'This item is no longer available.',
  'Not found.': 'Page not found. Try going back home.',
  'Photo upload failed. Try a smaller photo.': 'Your photo could not be uploaded. Please try a smaller image (under 5 MB).',
  'Slow down a little.': 'You are sending messages too fast. Please wait a moment.',
  'Required fields cannot be empty.': 'Please fill in all required fields before saving.',
  'This matriculation number is already registered.': 'That matric number already has an account. Try logging in instead.',
  'This is your own item.': 'You cannot message yourself about your own listing.',
};

const friendly = (m) => FRIENDLY[m] || m || 'Something went wrong. Please try again.';
const toast = (m, type = '') => {
  const t = $('#toast');
  t.textContent = friendly(m);
  t.className = type;
  t.setAttribute('role', type === 'error' ? 'alert' : 'status');
  t.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  t.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.style.display = 'none'), 3800);
};

function setFormLoading(form, loading, message) {
  const button = form.querySelector('button[type="submit"], button:not([type])');
  if (!button) return;

  if (loading) {
    button.dataset.label = button.textContent.trim();
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${message}</span>`;
    form.setAttribute('aria-busy', 'true');
    button.dataset.loadingTimer = setTimeout(() => {
      if (button.isConnected && button.disabled) {
        button.lastElementChild.textContent = 'Still working… please keep this page open.';
      }
    }, 8000);
  } else {
    clearTimeout(Number(button.dataset.loadingTimer));
    delete button.dataset.loadingTimer;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.textContent = button.dataset.label || button.textContent;
    delete button.dataset.label;
    form.removeAttribute('aria-busy');
  }
}

const authError = (error) => {
  const message = friendly(error?.message);
  return message === 'Something went wrong. Please try again.'
    ? 'We could not complete that request. Check your connection and try again.'
    : message;
};

const CATS = [
  'Books and Notes',
  'Electronics',
  'Fashion',
  'Hostel Items',
  'Food and Drinks',
  'Services',
  'Free / Giveaway',
  'Others',
];
const MEET = [
  'Library steps',
  'Faculty gate',
  'Main gate',
  'Cafeteria',
  'Student union building',
  'Hostel gate',
  'Arrange in chat',
];
const FAC = [
  'Agriculture',
  'Arts',
  'Education',
  'Engineering',
  'Environmental Sciences',
  'Law',
  'Management Sciences',
  'Medical Sciences',
  'Natural Sciences',
  'Pharmaceutical Sciences',
  'Social Sciences',
  'Veterinary Medicine',
];
const STATES = 'Abia,Adamawa,Akwa Ibom,Anambra,Bauchi,Bayelsa,Benue,Borno,Cross River,Delta,Ebonyi,Edo,Ekiti,Enugu,FCT Abuja,Gombe,Imo,Jigawa,Kaduna,Kano,Katsina,Kebbi,Kogi,Kwara,Lagos,Nasarawa,Niger,Ogun,Ondo,Osun,Oyo,Plateau,Rivers,Sokoto,Taraba,Yobe,Zamfara'.split(',');

const shrink = (f) => new Promise((ok, fail) => {
  const r = new FileReader();
  r.onerror = () => fail(new Error('Could not read this photo.'));
  r.onload = () => {
    const i = new Image();
    i.onerror = () => fail(new Error('This photo could not be opened.'));
    i.onload = () => {
      if (!i.width || !i.height) return fail(new Error('This photo has invalid dimensions.'));
      const k = Math.min(1, 700 / Math.max(i.width, i.height));
      const c = document.createElement('canvas');
      c.width = i.width * k;
      c.height = i.height * k;
      const context = c.getContext('2d');
      if (!context) return fail(new Error('Could not prepare this photo.'));
      context.drawImage(i, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', 0.72));
    };
    i.src = r.result;
  };
  r.readAsDataURL(f);
});

const bg = (u) => (u ? `style="background-image:url(${u})"` : '');
const wa = (p) => '234' + String(p).replace(/\D/g, '').replace(/^0/, '');

const nav = () => {
  const L = [
    ['#/', 'home', 'Home'],
    ['#/sell', 'plus', 'Sell'],
    ['#/mine', 'box', 'Mine'],
    ['#/inbox', 'chat', 'Chats'],
    ['#/saved', 'heart', 'Saved'],
    [me ? '#/profile' : '#/login', 'user', me ? 'Profile' : 'Log in'],
  ];
  const h = location.hash || '#/';

  $('#tab').innerHTML = L.map((l) => (
    `<a href="${l[0]}" class="${h === l[0] ? 'on' : ''}">`
    + `${ic(l[1])}${l[2]}`
    + `${l[2] === 'Chats' && unread ? `<i class="bd">${unread}</i>` : ''}</a>`
  )).join('');
  $('#dnav').innerHTML = L.map((l) => (
    `<a href="${l[0]}">${l[2]}${l[2] === 'Chats' && unread ? ` (${unread})` : ''}</a>`
  )).join('') + (me
    ? '<a href="#/" id="lo">Log out</a>'
    : '<a href="#/signup">Sign up</a>');

  const lo = $('#lo');
  if (lo) {
    lo.onclick = () => {
      adm = undefined;
      if (stopBadge) {
        stopBadge();
        stopBadge = 0;
      }
      unread = 0;
      inboxL = 0;
      document.title = 'Uni-Jos Mart';
      fb.out();
      tk = '';
      localStorage.tk = '';
      me = null;
      profileReady = false;
      profileLoadFailed = false;
      nav();
    };
  }
};

const card = (i) => (
  `<a class="card ${i.status === 'sold' ? 'sold' : ''}" href="#/item/${i.id}">`
  + `<div class="im" ${bg(i.image)}>${i.image ? '' : ic('box')}</div>`
  + `${i.status !== 'available' ? `<span class="badge ${i.status}">${i.status === 'sold' ? 'SOLD' : 'RESERVED'}</span>` : ''}`
  + `<div class="in"><h3>${esc(i.title)}</h3><div class="price">${naira(i.price)}</div>`
  + `<div class="mu">${esc(i.category)}</div></div></a>`
);

const tilt = () => document.querySelectorAll('.card').forEach((c) => {
  c.onpointermove = (e) => {
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  };
  c.onpointerleave = () => (c.style.transform = '');
});

let cat = '';
let qs = '';

async function home() {
  $('#app').innerHTML = `<section class="hero">
    <div>
      <h1><span>Buy. Sell.</span>Uni-Jos Mart</h1>
      <p>The student marketplace for the University of Jos. List what you no longer need, find what you do, and meet on campus.</p>
      <div class="acts"><a class="btn" href="#/sell">${ic('plus')} Sell an item</a></div>
    </div>
    <div class="stage"><div class="iso"><i></i><i></i><i></i></div></div>
  </section>
  <section class="panel">
    <h2>How to <span>get started</span></h2>
    <div class="how-grid">
      <div><h3>Buy</h3><p>Browse or search listings, open an item, then choose <b>Chat with seller</b> to ask questions and agree on a campus meeting. Inspect the item before paying.</p></div>
      <div><h3>Sell</h3><p>Choose <b>Sell an item</b>, upload up to four photos, fill in the item details and price, then publish your listing.</p></div>
    </div>
  </section>
  <form class="search" id="sf">
    <input id="q" placeholder="Search books, phones, hostel items" value="${esc(qs)}">
    <button>${ic('search')}</button>
  </form>
  <div class="chips">${['', ...CATS].map((c) => (
    `<button class="chip ${c === cat ? 'on' : ''}" data-c="${c}">${c || 'All'}</button>`
  )).join('')}</div>
  <div class="grid" id="g"></div>`;

  $('#sf').onsubmit = (e) => {
    e.preventDefault();
    qs = $('#q').value;
    home();
  };
  document.querySelectorAll('.chip').forEach((b) => {
    b.onclick = () => {
      cat = b.dataset.c;
      home();
    };
  });

  const grid = $('#g');
  const showRecent = recentListing && !cat && !qs;
  const renderFeed = (items, offline = false) => {
    if (!grid.isConnected) return;
    const list = showRecent
      ? [recentListing, ...items.filter((item) => item.id !== recentListing.id)]
      : items;
    grid.innerHTML = list.length
      ? list.map(card).join('')
      : offline
        ? '<div class="panel"><p>No saved listings are available. Connect to the internet to load the marketplace.</p></div>'
        : '<div class="panel"><h2>Nothing here yet</h2><p>Be the first to list an item in this category.</p></div>';
    if (offline) {
      grid.insertAdjacentHTML('beforeend', `<div class="panel">
        <p>Showing saved listings. This offline list may not include listings from other students.</p>
        <button id="rf">Try loading all listings</button>
      </div>`);
      $('#rf').onclick = home;
    }
    tilt();
  };

  if (liveFeedUnsub) {
    liveFeedUnsub();
    liveFeedUnsub = 0;
  }

  grid.innerHTML = showRecent
    ? `${card(recentListing)}<div class="feed-loading" role="status"><span class="spinner" aria-hidden="true"></span> Refreshing the feed…</div>`
    : '<div class="feed-loading" role="status"><span class="spinner" aria-hidden="true"></span> Loading listings…</div>';

  liveFeedUnsub = fb.watchItems({ category: cat, q: qs }, (items, error) => {
    if (error) {
      grid.innerHTML = `${showRecent ? card(recentListing) : ''}<div class="panel">
        <p>${showRecent
          ? 'Your listing is published, but we could not load the rest of the student marketplace.'
          : 'We could not load listings from the student marketplace.'} ${esc(error.message)}</p>
        <button id="rf">Try again</button>
      </div>`;
      $('#rf').onclick = home;
      tilt();
      return;
    }

    const safeItems = Array.isArray(items) ? items : [];
    if (showRecent && !safeItems.some((item) => item.id === recentListing?.id) && recentListing) {
      safeItems.unshift(recentListing);
    }
    renderFeed(safeItems, false);
  });

  try {
    const L = await api(`/items?cat=${encodeURIComponent(cat)}&q=${encodeURIComponent(qs)}`);
    if (Array.isArray(L)) {
      const safeItems = L.filter((item) => item && item.id);
      renderFeed(safeItems, !!L.fromCache);
    }
  } catch (error) {
    if (!grid.isConnected) return;
    grid.innerHTML = `${showRecent ? card(recentListing) : ''}<div class="panel">
      <p>${showRecent
        ? 'Your listing is published, but we could not load the rest of the student marketplace.'
        : 'We could not load listings from the student marketplace.'} ${esc(error.message)}</p>
      <button id="rf">Try again</button>
    </div>`;
    $('#rf').onclick = home;
  }
}

async function mine() {
  if (!me) return (location.hash = '#/login');

  const L = await api('/items?mine=1');
  $('#app').innerHTML = `<div class="panel">
    <h2>My <span>listings</span></h2>
    <p>Only listings you created appear here. <a href="#/">Browse all student listings</a>. Mark your items as reserved or sold from the item page.</p>
  </div>
  <div class="grid">${L.map(card).join('') || '<div class="panel">You have not listed anything. Tap Sell to start.</div>'}</div>`;
  tilt();
}

async function item(id) {
  const i = await api('/items/' + id);
  const s = i.seller || {};
  const mineIt = me && me.id === i.sellerId;

  $('#app').innerHTML = `<div class="detail">
    <div>
      <div class="big" id="bg" ${bg(i.image)}></div>
      <div class="acts">${(i.images || []).length > 1
        ? i.images.map((u) => `<div class="photo th" style="cursor:pointer;width:64px;height:64px;background-image:url(${u})" data-u="${u}"></div>`).join('')
        : ''}</div>
    </div>
    <div>
      <h1 style="font-size:34px">${esc(i.title)}</h1>
      <div class="price" style="font-size:32px">${naira(i.price)}</div>
      <p class="mu">${esc(i.category)} | ${esc(i.condition)} | ${i.status === 'sold' ? 'Sold' : i.status === 'reserved' ? 'Reserved' : 'Available'}</p>
      <p style="margin:12px 0">${esc(i.description)}</p>
      ${i.pickup ? `<p>${ic('pin')} Meet at: ${esc(i.pickup)}</p>` : ''}
      <div class="panel" style="box-shadow:none;margin-top:12px">
        <div class="seller">
          <div class="photo" ${bg(s.photo)}>${s.photo ? '' : ic('user')}</div>
          <div>
            <b>${esc(s.name)}</b> <span id="vb"></span>
            <div class="mu">${esc(s.faculty)}, ${esc(s.department)}</div>
            <div class="mu">${ic('pin')} ${esc(s.schoolAddress)}</div>
          </div>
        </div>
      </div>
      ${mineIt
        ? `<div class="acts">${['available', 'reserved', 'sold'].map((x) => `<button class="alt" data-s="${x}">Mark ${x}</button>`).join('')}<button class="danger" id="del">Delete</button></div>`
        : i.status === 'available' && s.phone
          ? `<div class="acts">
              <a class="btn" href="https://wa.me/${wa(s.phone)}">${ic('phone')} WhatsApp seller</a>
              <a class="btn alt" href="tel:${esc(s.phone)}">Call</a>
              <a class="btn alt" id="chat-seller" href="${me ? `#/chat/${i.id}_${me.id}` : '#/login'}">${ic('chat')} Chat with seller</a>
            </div>`
          : i.status === 'available'
            ? `<div class="acts"><a class="btn alt" id="chat-seller" href="${me ? `#/chat/${i.id}_${me.id}` : '#/login'}">${ic('chat')} Chat with seller</a></div>`
            : ''}
      <div class="acts">
        <button class="alt" id="sv">Save</button>
        <a class="btn alt" href="#/seller/${i.sellerId}">Seller reviews</a>
        <button class="alt" id="rp">Report</button>
      </div>
      <div class="warn" style="margin-top:14px">${ic('shield')} Ask the seller for a receipt or proof of ownership. Do not pay before you see the item. Stolen items are reported to the authorities.</div>
    </div>
  </div>`;

  document.querySelectorAll('[data-s]').forEach((b) => {
    b.onclick = async () => {
      await api(`/items/${id}/status`, {
        method: 'PUT',
        body: { status: b.dataset.s },
      });
      toast('Item marked ' + b.dataset.s);
      item(id);
    };
  });

  hook(i);
  const chatSeller = $('#chat-seller');
  if (chatSeller && !me) {
    chatSeller.onclick = () => {
      afterAuth = (user) => `#/chat/${i.id}_${user.id}`;
    };
  }
  const d = $('#del');
  if (d) {
    d.onclick = async () => {
      if (confirm('Delete this listing?')) {
        await api('/items/' + id, { method: 'DELETE' });
        location.hash = '#/mine';
      }
    };
  }
}

const fld = (n, l, v = '', t = 'text', r = 1) => (
  t === 'password'
    ? `<div class="password-field"><label for="${n}">${l}</label><div class="password-input"><input id="${n}" name="${n}" type="password" value="${esc(v)}" ${r ? 'required' : ''}><button class="password-toggle" type="button" aria-label="Show password" aria-pressed="false">Show</button></div></div>`
    : `<div><label>${l}</label><input name="${n}" type="${t}" value="${esc(v)}" ${r ? 'required' : ''}></div>`
);

function wirePasswordToggle() {
  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.onclick = () => {
      const input = button.parentElement.querySelector('input');
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.textContent = visible ? 'Hide' : 'Show';
      button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} password`);
      button.setAttribute('aria-pressed', String(visible));
    };
  });
}
const sel = (n, l, a, v = '') => (
  `<div><label>${l}</label><select name="${n}" required><option value="">Select</option>${a.map((x) => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`
);

function profile(signup) {
  const u = signup ? {} : me;
  if (!signup && !me) return (location.hash = '#/login');
  if (!signup && !profileReady) {
    $('#app').innerHTML = profileLoadFailed
      ? '<div class="panel"><h2>Profile not loaded</h2><p>Your profile is taking longer to load. Check your connection and try again.</p><button id="pr">Try again</button></div>'
      : '<div class="panel"><h2>Loading your profile…</h2><div class="feed-loading" role="status"><span class="spinner" aria-hidden="true"></span> Please wait a moment.</div></div>';
    const retry = $('#pr');
    if (retry) retry.onclick = () => loadProfile(me.id);
    return;
  }
  let ph = u.photo || '';

  $('#app').innerHTML = `<div class="panel">
    <h2>${signup ? 'Create <span>account' : 'My <span>profile'}</span></h2>
    <p>${signup ? 'Everyone who signs up can buy and sell.' : 'Buyers see only your name, surname, faculty, department and school address.'}</p>
    <form id="pf">
      <div class="seller">
        <div class="photo" id="ph" ${bg(ph)}>${ph ? '' : ic('cam')}</div>
        <div><label>Profile picture</label><input type="file" id="pi" accept="image/*"></div>
      </div>
      <div class="row">${fld('firstName', 'First name', u.firstName)}${fld('surname', 'Surname', u.surname)}</div>
      ${fld('middleName', 'Middle name (optional)', u.middleName, 'text', 0)}
      <div class="row">${fld('phone', 'Phone number (WhatsApp)', u.phone, 'tel')}${fld('email', 'Email', u.email, 'email')}</div>
      ${signup ? fld('password', 'Password (6+ characters)', '', 'password') : ''}
      <div class="row">${sel('faculty', 'Faculty', FAC, u.faculty)}${fld('department', 'Department', u.department)}</div>
      ${fld('matric', 'Matriculation number', u.matric)}
      ${fld('schoolAddress', 'School address (hostel or lodge in Jos)', u.schoolAddress)}
      ${fld('permAddress', 'Permanent home address', u.permAddress)}
      <div class="row">${sel('state', 'State of origin', STATES, u.state)}${fld('lga', 'Local government of origin', u.lga)}</div>
      ${signup ? `<label class="chk"><input type="checkbox" name="terms" required><span>I agree to the <a href="terms.html#terms" target="_blank">Terms and Conditions</a> and <a href="terms.html#privacy" target="_blank">Privacy Policy</a>. I will not sell stolen items.</span></label>` : ''}
      <p class="err" id="er"></p>
      <button>${signup ? 'Create account' : 'Save profile'}</button>
    </form>
  </div>
  ${signup ? '<p>Already registered? <a href="#/login">Log in</a></p>' : ''}`;

  if (!signup) {
    $('#pf').email.readOnly = 1;
    $('#pf').matric.readOnly = 1;
  }

  $('#pi').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      ph = await shrink(file);
      $('#ph').style.backgroundImage = `url(${ph})`;
      $('#ph').innerHTML = '';
    } catch (error) {
      toast('Could not prepare that profile photo. Choose another image or try a smaller one.', 'error');
      console.error('Could not prepare profile photo.', error);
    }
  };

  $('#pf').onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    b.photo = ph;
    b.terms = !!b.terms;
    const form = e.currentTarget;
    $('#er').textContent = '';
    setFormLoading(form, true, signup ? 'Creating your account…' : 'Saving your profile…');

    try {
      if (signup) {
        const r = await api('/signup', { method: 'POST', body: b });
        tk = r.token;
        localStorage.tk = tk;
        me = r.user;
        profileReady = true;
        profileLoadFailed = false;
        const destination = afterAuth(me);
        afterAuth = () => '#/';
        location.hash = destination;
        toast('👋 Welcome to Uni-Jos Mart! You can now buy and sell.', 'success');
      } else {
        me = await api('/me', { method: 'PUT', body: b });
        profileReady = true;
        profileLoadFailed = false;
        toast('✅ Profile saved successfully!', 'success');
      }
      nav();
    } catch (x) {
      const message = authError(x);
      $('#er').textContent = message;
      toast(message, 'error');
    } finally {
      setFormLoading(form, false);
    }
  };
  wirePasswordToggle();
}

function login() {
  $('#app').innerHTML = `<div class="panel">
    <h2>Log <span>in</span></h2>
    <form id="lf">
      ${fld('email', 'Email', '', 'email')}
      ${fld('password', 'Password', '', 'password')}
      <p class="mu">Log in to continue to your listing, chat, or other selected action.</p>
      <p class="err" id="er"></p>
      <button>Log in</button>
    </form>
    <p style="margin-top:12px">New here? <a href="#/signup">Create an account</a></p>
  </div>`;

  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    $('#er').textContent = '';
    setFormLoading(form, true, 'Signing you in…');
    try {
      const r = await api('/login', {
        method: 'POST',
        body: Object.fromEntries(new FormData(e.target)),
      });
      tk = r.token;
      localStorage.tk = tk;
      me = r.user;
      profileReady = true;
      profileLoadFailed = false;
      const destination = afterAuth(me);
      afterAuth = () => '#/';
      location.hash = destination;
      toast('✅ Logged in! Welcome back.', 'success');
      nav();
      loadProfile(r.user.id);
    } catch (x) {
      const message = authError(x);
      $('#er').textContent = message;
      toast(message, 'error');
    } finally {
      setFormLoading(form, false);
    }
  };
  wirePasswordToggle();
}

function loadProfile(id) {
  profileLoadFailed = false;
  api('/me').then((user) => {
    if (!me || me.id !== id || user.id !== id) return;
    me = user;
    profileReady = true;
    nav();
    if (location.hash === '#/profile') profile(0);
  }).catch((error) => {
    if (me?.id !== id) return;
    me = {
      ...me,
      id,
      email: me.email || '',
      firstName: me.firstName || '',
      surname: me.surname || '',
    };
    profileReady = true;
    profileLoadFailed = false;
    nav();
    const offline = /No connection|network|offline|Failed to fetch|fetch failed/i.test(error?.message || '');
    if (!offline) {
      console.error('Could not load the signed-in user profile.', error);
    }
    if (location.hash === '#/profile') {
      profile(0);
    }
  });
}

function sell() {
  if (!me) {
    afterAuth = () => '#/sell';
    location.hash = '#/login';
    return;
  }

  let im = [];
  let preparingPhotos = false;
  $('#app').innerHTML = `<div class="panel">
    <h2>Sell <span>an item</span></h2>
    <form id="sf2">
      <div class="seller">
        <div class="photo" id="ph">${ic('cam')}</div>
        <div>
          <label for="pi">Item photos (up to 4, required)</label>
          <input type="file" id="pi" accept="image/*" multiple>
          <p class="mu" id="photo-help">Choose clear photos. Images are resized automatically.</p>
        </div>
      </div>
      <div class="acts" id="photo-preview"></div>
      ${fld('title', 'Item name')}
      <div class="row">${fld('price', 'Price in Naira', '', 'number')}${sel('category', 'Category', CATS)}</div>
      <div class="row">${sel('condition', 'Condition', ['New', 'Like new', 'Used', 'Fairly used'])}${sel('pickup', 'Meeting point on campus', MEET)}</div>
      <div><label>Description</label><textarea name="description" rows="4"></textarea></div>
      <label class="chk"><input type="checkbox" name="proof" required><span>This item belongs to me or I have the right to sell it, and I can show a receipt or proof of ownership. I understand stolen items are reported to the authorities.</span></label>
      <p class="err" id="er"></p>
      <button>Publish listing</button>
    </form>
  </div>`;

  $('#pi').onchange = async (e) => {
    const files = [...e.target.files];
    if (files.length > 4) {
      e.target.value = '';
      im = [];
      $('#ph').style.backgroundImage = '';
      $('#ph').innerHTML = ic('cam');
      $('#photo-preview').innerHTML = '';
      $('#photo-help').textContent = 'Choose no more than 4 photos.';
      return;
    }

    preparingPhotos = files.length > 0;
    if (preparingPhotos) setFormLoading($('#sf2'), true, 'Preparing photos…');
    $('#photo-help').textContent = files.length ? 'Preparing your photos…' : 'Choose clear photos. Images are resized automatically.';
    try {
      im = await Promise.all(files.map(shrink));
      $('#ph').style.backgroundImage = im.length ? `url(${im[0]})` : '';
      $('#ph').innerHTML = im.length ? '' : ic('cam');
      $('#photo-help').textContent = `${im.length} photo${im.length === 1 ? '' : 's'} ready to publish.`;
      $('#photo-preview').innerHTML = im.slice(1).map((photo, index) => (
        `<div class="photo preview" style="width:64px;height:64px;background-image:url(${photo})" aria-label="Photo ${index + 2}"></div>`
      )).join('');
    } catch (error) {
      im = [];
      $('#photo-help').textContent = 'Could not prepare those photos. Choose them again or try smaller images.';
      toast('Could not prepare those photos. Choose them again or try smaller images.', 'error');
      console.error('Could not prepare listing photos.', error);
    } finally {
      if (preparingPhotos) {
        preparingPhotos = false;
        setFormLoading($('#sf2'), false);
      }
    }
  };

  $('#sf2').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.dataset.submitting === 'true') return;
    if (preparingPhotos) {
      $('#er').textContent = 'Please wait while your photos are prepared.';
      return;
    }

    const b = Object.fromEntries(new FormData(form));
    b.images = im;
    b.proof = !!b.proof;

    if (!im.length) {
      $('#er').textContent = 'Please add at least one photo of your item.';
      return;
    }

    form.dataset.submitting = 'true';
    $('#er').textContent = '';
    setFormLoading(form, true, 'Publishing your listing…');
    try {
      const i = await api('/items', { method: 'POST', body: b });
      recentListing = i;
      cat = '';
      qs = '';
      toast('🎉 Your listing was published successfully and is now in the feed.', 'success');
      location.hash = '#/';
    } catch (x) {
      const message = friendly(x.message);
      $('#er').textContent = message;
      toast(message, 'error');
    } finally {
      delete form.dataset.submitting;
      setFormLoading(form, false);
    }
  };
}

let unsub;

async function inbox() {
  if (!me) return (location.hash = '#/login');

  const L = inboxL || (inboxError ? [] : await fb.inbox());
  $('#app').innerHTML = `<div class="panel">
    <h2>Chats</h2>
    ${inboxError ? `<p role="alert">Your chats could not be loaded. ${esc(inboxError)}</p><button id="retry-inbox">Try again</button>` : ''}
    ${L.map((c) => `<p>
      <a href="#/chat/${c.id}"><b>${esc(c.title)}</b></a>${isNew(c) ? ' <span class="vb">New</span>' : ''}<br>
      <span class="mu">${esc(c.lastMsg || 'No messages yet')}</span>
    </p>`).join('') || (inboxError ? '' : '<p>No conversations yet. Open an item and tap Message.</p>')}
  </div>`;
  const retry = $('#retry-inbox');
  if (retry) retry.onclick = () => {
    inboxError = '';
    stopBadge = 0;
    route();
  };
}

async function chat(id) {
  if (unsub) {
    unsub();
    unsub = 0;
  }
  if (!me) {
    const [itemId] = id.split('_');
    afterAuth = (user) => `#/chat/${itemId}_${user.id}`;
    location.hash = '#/login';
    return;
  }

  const c = await fb.chatOpen(...id.split('_'));
  $('#app').innerHTML = `<div class="panel">
    <h2>${esc(c.title)}</h2>
    <div class="warn">Meet on campus and ask for a receipt before paying.</div>
    <p id="chat-status" class="mu" role="status">Connecting to this chat…</p>
    <button id="chat-retry" type="button" hidden>Reconnect</button>
    <div id="ms" style="height:50vh;overflow:auto;margin:14px 0"></div>
    <div id="ex"></div>
    <p><button class="alt" id="rc">Report this chat</button></p>
    <form id="mf" style="grid-template-columns:1fr auto auto">
      <input name="t" maxlength="500" placeholder="Type a message" autocomplete="off">
      <button class="alt" type="button" id="cb">Photo</button>
      <button>Send</button>
    </form>
    <input type="file" id="ci" accept="image/*" hidden>
  </div>`;

  const ex = $('#ex');
  if (me.id === c.sellerId && !c.done) {
    ex.innerHTML = '<button id="dn">Deal done: mark sold</button>';
    $('#dn').onclick = async () => {
      try {
        await fb.done(id, c.itemId);
        toast('Marked sold. The buyer can now rate you.');
        chat(id);
      } catch (x) {
        toast(x.message);
      }
    };
  } else if (me.id === c.buyer && c.done && !c.reviewed) {
    ex.innerHTML = `<form id="rv">
      <label>Rate this seller (5 is best)</label>
      <select name="s">${[5, 4, 3, 2, 1].map((n) => `<option>${n}</option>`).join('')}</select>
      <input name="t" maxlength="200" placeholder="Short comment (optional)">
      <button>Submit review</button>
    </form>`;
    $('#rv').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await fb.review(id, c, +e.target.s.value, e.target.t.value);
        toast('Review sent');
        chat(id);
      } catch (x) {
        toast(x.message);
      }
    };
  }

  $('#cb').onclick = () => $('#ci').click();
  $('#ci').onchange = async (e) => {
    try {
      if (e.target.files[0]) {
        await fb.send(id, '', await shrink(e.target.files[0]));
      }
    } catch (x) {
      toast(x.message);
    }
    e.target.value = '';
  };

  $('#rc').onclick = async () => {
    const r = prompt('What is wrong with this chat? (scam, harassment, stolen item, spam)');
    if (r) {
      try {
        await fb.report('chat', id, r);
        toast('Report sent. Thank you.');
      } catch {
        toast('You already reported this.');
      }
    }
  };

  let currentMessages = [];
  const pendingMessages = new Map();
  const renderMessages = (list = []) => {
    const status = $('#chat-status');
    const messages = $('#ms');
    const retry = $('#chat-retry');
    if (!status || !messages) return;
    const pending = pendingMessages.get(id) || [];
    const merged = [...pending, ...list]
      .filter((message, index, all) => {
        const key = message.localId || `${message.from}:${message.t}:${message.text}:${message.img || ''}`;
        return index === all.findIndex((entry) => (
          (entry.localId || `${entry.from}:${entry.t}:${entry.text}:${entry.img || ''}`) === key
        ));
      })
      .sort((a, b) => (a.t || 0) - (b.t || 0));

    messages.innerHTML = merged.map((m) => `<p style="text-align:${m.from === me.id ? 'right' : 'left'}">
      <span style="display:inline-block;padding:8px 12px;background:${m.from === me.id ? 'var(--sun)' : '#e8ede9'}">
        ${esc(m.text)}${m.img ? `<img src="${m.img}" alt="Photo sent in chat" style="display:block;max-width:220px">` : ''}
      </span>
    </p>`).join('');
    messages.scrollTop = 1e9;
    if (retry) retry.hidden = true;
    status.textContent = '';
    if (merged.length && merged[merged.length - 1].from !== me.id) fb.seen(id);
  };

  const showMessages = (L, error) => {
    const status = $('#chat-status');
    const retry = $('#chat-retry');
    if (!status) return;
    if (error) {
      console.error('Could not load chat messages.', error);
      status.textContent = `Messages could not be loaded. ${friendly(error.message)}`;
      if (retry) retry.hidden = false;
      return;
    }
    currentMessages = L;
    renderMessages(L);
  };

  unsub = fb.watch(id, showMessages);
  $('#chat-retry').onclick = () => {
    if (unsub) unsub();
    $('#chat-status').textContent = 'Reconnecting to this chat…';
    unsub = fb.watch(id, showMessages);
  };

  $('#mf').onsubmit = async (e) => {
    e.preventDefault();
    const t = e.target.t.value.trim();
    if (!t) return;
    const form = e.currentTarget;
    const optimistic = {
      from: me.id,
      text: t,
      img: '',
      t: Date.now(),
      localId: `local-${Date.now()}`,
    };

    const existing = pendingMessages.get(id) || [];
    pendingMessages.set(id, [...existing, optimistic]);
    renderMessages(currentMessages);
    setFormLoading(form, true, 'Sending…');

    try {
      await fb.send(id, t);
      e.target.t.value = '';
      const active = pendingMessages.get(id) || [];
      pendingMessages.set(id, active.filter((message) => message.localId !== optimistic.localId));
      renderMessages(currentMessages);
    } catch (x) {
      const active = pendingMessages.get(id) || [];
      pendingMessages.set(id, active.filter((message) => message.localId !== optimistic.localId));
      renderMessages(currentMessages);
      toast(x.message, 'error');
    } finally {
      setFormLoading(form, false);
    }
  };
}

const VB = '<span class="vb">' + ic('shield') + ' Verified student</span>';
let adm;
let unread = 0;
let inboxL = 0;
let inboxError = '';
let stopBadge = 0;

const isNew = (c) => c.lastFrom && me && c.lastFrom !== me.id
  && (c.updated || 0) > ((c.seen || {})[me.id] || 0);

function hook(i) {
  const sv = $('#sv');
  fb.verified(i.sellerId)
    .then((v) => {
      if (v) $('#vb').innerHTML = VB;
    })
    .catch(() => {});
  document.querySelectorAll('.th').forEach((t) => {
    t.onclick = () => ($('#bg').style.backgroundImage = `url(${t.dataset.u})`);
  });

  if (!me) {
    sv.style.display = 'none';
  } else {
    const set = (v) => (sv.textContent = v ? 'Saved' : 'Save');
    fb.isSaved(i.id).then(set).catch(() => {});
    sv.onclick = async () => {
      try {
        set(await fb.toggleSave(i));
      } catch (x) {
        toast(x.message);
      }
    };
  }

  $('#rp').onclick = async () => {
    if (!me) return (location.hash = '#/login');

    const r = prompt('Why are you reporting this listing? (stolen item, scam, spam, abuse)');
    if (r) {
      try {
        await fb.report('item', i.id, r);
        toast('Report sent. Thank you.');
      } catch {
        toast('You already reported this.');
      }
    }
  };
}

async function saved() {
  if (!me) return (location.hash = '#/login');

  const L = await fb.saved();
  $('#app').innerHTML = `<div class="panel">
    <h2>Saved <span>items</span></h2>
    <p>Items you saved to check later.</p>
  </div>
  <div class="grid">${L.map(card).join('') || '<div class="panel">Nothing saved yet. Open an item and tap Save.</div>'}</div>`;
  tilt();
}

async function seller(id) {
  adm ??= me ? await fb.isAdmin() : false;
  const r = await fb.reviews(id);
  const ver = await fb.verified(id);
  const pv = adm ? await fb.priv(id) : 0;
  const n = r.list.length;
  const a = n ? (r.list.reduce((t, x) => t + x.stars, 0) / n).toFixed(1) : 0;

  $('#app').innerHTML = `<div class="panel">
    <div class="seller">
      <div class="photo" ${bg(r.u.photo)}>${r.u.photo ? '' : ic('user')}</div>
      <div>
        <h2>${esc(r.u.name)}</h2>
        ${ver ? VB : ''}
        <div class="mu">${esc(r.u.faculty)}, ${esc(r.u.department)}</div>
        <div class="price">${n ? a + ' / 5 from ' + n + ' review' + (n > 1 ? 's' : '') : 'No reviews yet'}</div>
      </div>
    </div>
    ${adm && pv ? `<div class="warn" style="margin-top:12px">Admin view. Matric: ${esc(pv.matric)} | Email: ${esc(pv.email)}<br><button class="alt" id="vt">${ver ? 'Remove badge' : 'Give verified badge'}</button></div>` : ''}
  </div>
  ${r.list.map((x) => `<div class="panel" style="box-shadow:none"><b>${x.stars} / 5</b><p>${esc(x.text)}</p></div>`).join('')}`;

  if (adm && pv) {
    $('#vt').onclick = async () => {
      try {
        await fb.setVerified(id, !ver);
        toast('Updated');
        seller(id);
      } catch (x) {
        toast(x.message);
      }
    };
  }
}

async function admin() {
  adm ??= me ? await fb.isAdmin() : false;
  if (!adm) {
    $('#app').innerHTML = '<div class="panel"><h2>Not allowed</h2><p>This page is for Uni-Jos Mart admins.</p></div>';
    return;
  }

  const L = await fb.reports();
  $('#app').innerHTML = `<div class="panel"><h2>Reports</h2><p>Newest 30.</p></div>
    ${L.map((r) => `<div class="panel" style="box-shadow:none">
      <b>${esc(r.type)}</b>: ${esc(r.reason)}
      <div class="acts">
        ${r.type === 'item' ? `<a class="btn alt" href="#/item/${r.ref}">Open item</a><button class="danger" data-di="${r.ref}">Delete item</button>` : ''}
        <button class="alt" data-dr="${r.id}">Dismiss</button>
      </div>
    </div>`).join('') || '<div class="panel">No reports.</div>'}`;

  document.querySelectorAll('[data-di]').forEach((b) => {
    b.onclick = async () => {
      if (confirm('Delete this item?')) {
        await fb.delItem(b.dataset.di);
        toast('Item deleted');
      }
    };
  });
  document.querySelectorAll('[data-dr]').forEach((b) => {
    b.onclick = async () => {
      await fb.delReport(b.dataset.dr);
      admin();
    };
  });
}

async function route() {
  if (unsub) {
    unsub();
    unsub = 0;
  }
  if (me && !stopBadge) {
    stopBadge = fb.watchInbox((L, error) => {
      if (error) {
        console.error('Could not load the chat list.', error);
        inboxError = error.message;
        stopBadge = 0;
        if (location.hash === '#/inbox') inbox();
        return;
      }
      inboxError = '';
      inboxL = L;
      unread = L.filter(isNew).length;
      document.title = (unread ? '(' + unread + ') ' : '') + 'Uni-Jos Mart';
      nav();
      if (location.hash === '#/inbox') inbox();
    });
  }

  nav();
  const k = (location.hash || '').match(/^#\/chat\/(\w+)$/);
  const h = (location.hash || '#/').slice(1);
  const m = h.match(/^\/item\/(\w+)/);
  const screen = h.startsWith('/item/') ? 'item'
    : h.startsWith('/seller/') ? 'seller'
      : h.startsWith('/chat/') ? 'chat'
        : ['inbox', 'saved', 'admin', 'sell', 'mine', 'profile', 'signup', 'login']
          .find((name) => h === '/' + name) || 'home';
  trackScreen(screen).catch((error) => {
    console.error("Firebase Analytics could not record a screen view.", error);
  });
  window.scrollTo(0, 0);

  try {
    if (k) await chat(k[1]);
    else if (h === '/inbox') await inbox();
    else if (h === '/saved') await saved();
    else if (h === '/admin') await admin();
    else if (h.startsWith('/seller/')) await seller(h.slice(8));
    else if (m) await item(m[1]);
    else if (h === '/sell') sell();
    else if (h === '/mine') await mine();
    else if (h === '/profile') profile(0);
    else if (h === '/signup') profile(1);
    else if (h === '/login') login();
    else await home();
  } catch (e) {
    $('#app').innerHTML = `<div class="panel"><h2>Something went wrong</h2><p>${esc(e.message)}</p></div>`;
  }
}

addEventListener('hashchange', route);
(async () => {
  if (tk) {
    try {
      me = await api('/me');
      profileReady = true;
    } catch {
      tk = '';
      localStorage.tk = '';
    }
  }
  route();
})();
