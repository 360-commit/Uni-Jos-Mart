// First-visit walkthrough — 3D-animated SVG illustrations, UNIJOS logo, full text visible
// Edit slide text in D[].t (title) and D[].p (paragraph)

/* ── 3D-animated SVG helpers ─────────────────────────────────────── */
const O='#F07230',OL='#FEF0E6',W='#FFFFFF',INK='#1A1008';

// Slide 1 — Welcome: floating marketplace building with UNIJOS shield
const s1=`
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
  <defs>
    <radialGradient id="g1" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#FEF0E6"/>
      <stop offset="100%" stop-color="#FDDCC4"/>
    </radialGradient>
    <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${O}"/>
      <stop offset="100%" stop-color="#C85010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="url(#g1)" rx="20"/>
  <!-- animated group -->
  <g style="animation:float 3.5s ease-in-out infinite;transform-origin:120px 130px">
    <!-- building body -->
    <rect x="60" y="110" width="120" height="90" rx="6" fill="${W}" stroke="${O}" stroke-width="2"/>
    <!-- roof -->
    <polygon points="50,110 120,64 190,110" fill="url(#roof)"/>
    <polygon points="50,110 120,64 190,110" fill="none" stroke="#C85010" stroke-width="1.5"/>
    <!-- windows -->
    <rect x="78" y="125" width="24" height="22" rx="4" fill="${OL}" stroke="${O}" stroke-width="1.5"/>
    <rect x="138" y="125" width="24" height="22" rx="4" fill="${OL}" stroke="${O}" stroke-width="1.5"/>
    <!-- door -->
    <rect x="103" y="147" width="34" height="53" rx="5" fill="${O}"/>
    <circle cx="130" cy="174" r="3" fill="${W}"/>
    <!-- sign -->
    <rect x="76" y="92" width="88" height="18" rx="4" fill="${O}"/>
    <text x="120" y="104.5" text-anchor="middle" font-size="9" font-weight="700"
      font-family="Outfit,sans-serif" fill="${W}">UNI-JOS MART</text>
  </g>
  <!-- floating ₦ coins -->
  <g style="animation:float 2.8s .4s ease-in-out infinite;transform-origin:44px 80px">
    <circle cx="44" cy="80" r="16" fill="${O}" opacity=".9"/>
    <text x="44" y="86" text-anchor="middle" font-size="16" font-weight="800"
      font-family="Outfit,sans-serif" fill="${W}">₦</text>
  </g>
  <g style="animation:float 3.2s .8s ease-in-out infinite;transform-origin:198px 70px">
    <circle cx="198" cy="70" r="12" fill="${O}" opacity=".7"/>
    <text x="198" y="75" text-anchor="middle" font-size="12" font-weight="800"
      font-family="Outfit,sans-serif" fill="${W}">₦</text>
  </g>
  <style>@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}</style>
</svg>`;

// Slide 2 — Buy & Sell: 3D-ish phone showing a product listing
const s2=`
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
  <defs>
    <linearGradient id="phone" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3D2E1E"/>
      <stop offset="100%" stop-color="#1A1008"/>
    </linearGradient>
    <linearGradient id="scrn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF8F3"/>
      <stop offset="100%" stop-color="#FEF0E6"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="${OL}" rx="20"/>
  <g style="animation:float 3.5s ease-in-out infinite;transform-origin:120px 120px">
    <!-- phone body with 3D feel (side shadow) -->
    <rect x="68" y="28" width="104" height="184" rx="16" fill="url(#phone)"/>
    <rect x="74" y="34" width="92" height="172" rx="12" fill="url(#scrn)"/>
    <!-- status bar -->
    <rect x="74" y="34" width="92" height="18" rx="12" fill="${O}" fill-opacity=".15"/>
    <!-- product image area -->
    <rect x="82" y="60" width="76" height="64" rx="8" fill="${W}" stroke="${O}" stroke-width="1.5"/>
    <!-- shirt icon inside product area -->
    <path d="M106 72l-10 8h7v28h24V80h7l-10-8" fill="${O}" opacity=".8"/>
    <!-- price tag -->
    <rect x="82" y="132" width="76" height="20" rx="6" fill="${O}"/>
    <text x="120" y="146" text-anchor="middle" font-size="11" font-weight="700"
      font-family="Outfit,sans-serif" fill="${W}">₦4,500</text>
    <!-- CTA button -->
    <rect x="88" y="160" width="64" height="20" rx="10" fill="${O}"/>
    <text x="120" y="174" text-anchor="middle" font-size="10" font-weight="600"
      font-family="Outfit,sans-serif" fill="${W}">Message Seller</text>
    <!-- notch -->
    <rect x="100" y="34" width="40" height="8" rx="4" fill="#1A1008" opacity=".5"/>
  </g>
  <!-- floating tag -->
  <g style="animation:float 2.6s .6s ease-in-out infinite;transform-origin:38px 80px">
    <rect x="16" y="64" width="44" height="32" rx="8" fill="${W}"
      stroke="${O}" stroke-width="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,.1))"/>
    <text x="38" y="76" text-anchor="middle" font-size="8" font-weight="600"
      font-family="Outfit,sans-serif" fill="${INK}">SELL</text>
    <text x="38" y="88" text-anchor="middle" font-size="9" font-weight="700"
      font-family="Outfit,sans-serif" fill="${O}">Anything</text>
  </g>
  <style>@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}</style>
</svg>`;

// Slide 3 — Chat & Meet: two phones exchanging messages
const s3=`
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
  <defs>
    <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FEF0E6"/>
      <stop offset="100%" stop-color="#FDDCC4"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="url(#bg3)" rx="20"/>
  <!-- left bubble group -->
  <g style="animation:float 3s ease-in-out infinite;transform-origin:72px 120px">
    <rect x="20" y="60" width="104" height="130" rx="14" fill="#3D2E1E"/>
    <rect x="26" y="66" width="92" height="118" rx="10" fill="#FFF8F3"/>
    <!-- chat messages -->
    <rect x="34" y="78" width="58" height="18" rx="9" fill="${O}"/>
    <text x="63" y="91" text-anchor="middle" font-size="8.5" fill="${W}" font-family="Outfit,sans-serif">Hi, is it available?</text>
    <rect x="50" y="104" width="58" height="18" rx="9" fill="#EBEBEB"/>
    <text x="79" y="117" text-anchor="middle" font-size="8.5" fill="${INK}" font-family="Outfit,sans-serif">Yes, meet at library</text>
    <rect x="34" y="130" width="44" height="18" rx="9" fill="${O}"/>
    <text x="56" y="143" text-anchor="middle" font-size="8.5" fill="${W}" font-family="Outfit,sans-serif">Great! 3pm?</text>
    <rect x="58" y="156" width="56" height="18" rx="9" fill="#EBEBEB"/>
    <text x="86" y="169" text-anchor="middle" font-size="8.5" fill="${INK}" font-family="Outfit,sans-serif">Deal! See you 👍</text>
  </g>
  <!-- pin icon -->
  <g style="animation:float 2.6s .5s ease-in-out infinite;transform-origin:188px 90px">
    <circle cx="188" cy="90" r="26" fill="${O}" opacity=".15"/>
    <circle cx="188" cy="90" r="18" fill="${O}"/>
    <path d="M188 80a8 8 0 010 16 8 8 0 010-16zm0 20v8" stroke="${W}" stroke-width="2.5"
      stroke-linecap="round" fill="none"/>
    <circle cx="188" cy="87" r="2.5" fill="${W}"/>
  </g>
  <style>@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}</style>
</svg>`;

// Slide 4 — Safety & Trust: shield with checkmark, star rating
const s4=`
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
  <defs>
    <linearGradient id="bg4" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF8F3"/>
      <stop offset="100%" stop-color="${OL}"/>
    </linearGradient>
    <linearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${O}"/>
      <stop offset="100%" stop-color="#C85010"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="url(#bg4)" rx="20"/>
  <!-- main shield -->
  <g style="animation:float 3.5s ease-in-out infinite;transform-origin:120px 120px">
    <path d="M120 36l60 22v44c0 36-28 58-60 72-32-14-60-36-60-72V58z" fill="url(#shield)"/>
    <path d="M120 48l48 18v36c0 28-22 46-48 58-26-12-48-30-48-58V66z" fill="none" stroke="${W}" stroke-width="2" stroke-opacity=".4"/>
    <!-- checkmark -->
    <path d="M96 118l18 18 32-34" stroke="${W}" stroke-width="7" stroke-linecap="round"
      stroke-linejoin="round" fill="none"/>
  </g>
  <!-- star row -->
  <g style="animation:float 2.8s .4s ease-in-out infinite;transform-origin:120px 192px">
    <rect x="60" y="180" width="120" height="32" rx="16" fill="${W}"
      filter="drop-shadow(0 4px 12px rgba(0,0,0,.08))"/>
    <!-- 5 stars -->
    ${[0,1,2,3,4].map(n=>`<text x="${76+n*22}" y="202" font-size="16"
      fill="${n<4?O:'#DDDDD0'}" font-family="Outfit,sans-serif">★</text>`).join('')}
  </g>
  <!-- receipt icon top-right -->
  <g style="animation:float 3s .7s ease-in-out infinite;transform-origin:196px 60px">
    <rect x="172" y="40" width="48" height="40" rx="8" fill="${W}"
      stroke="${O}" stroke-width="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,.08))"/>
    <path d="M180 54h32M180 62h24M180 70h18" stroke="${O}" stroke-width="2" stroke-linecap="round"/>
  </g>
  <style>@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}</style>
</svg>`;

/* ── Slide data ───────────────────────────────────────────────────── */
const D=[
 {t:'Welcome to Uni-Jos Mart',
  p:'The official student marketplace for the University of Jos. Buy what you need and sell what you no longer use — safely, right on campus.',
  a:s1},
 {t:'Buy and sell in minutes',
  p:'Every student who signs up can buy and sell. List an item in under a minute, set your price in Naira, and even give things away for free.',
  a:s2},
 {t:'Chat, search and meet',
  p:'Search for any item, save favourites, and message sellers right inside the app. Then meet at a safe campus spot to inspect before you pay.',
  a:s3},
 {t:'Safe, trusted, and fair',
  p:'Always ask for a receipt before paying. Stolen items are reported to the authorities. Rate every deal and report anything suspicious — we have your back.',
  a:s4}
];

/* ── Intro engine ─────────────────────────────────────────────────── */
let i=0,el;
const close=go=>{localStorage.intro=1;el&&el.remove();el=0;document.body.style.overflow='';if(go)location.hash=go};

function acts(){
  const last=i===D.length-1,a=el.querySelector('.ia');
  a.innerHTML=last
    ?(localStorage.tk
      ?'<button data-g="#/">Start browsing</button>'
      :'<button data-g="#/signup">Create account</button><button class="gh" data-g="#/login">Log in</button><button class="gh" data-g="#/">Just browse</button>')
    :`<button data-n="1">Next</button>${i?'<button class="gh" data-n="-1">Back</button>':''}`;
  el.querySelector('.dots').innerHTML=D.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('');
  el.style.setProperty('--i',i);
  const b=a.querySelector('button');b&&b.focus();
}

function open(){
  if(el)return;i=0;
  el=document.createElement('div');
  el.id='intro';
  el.setAttribute('role','dialog');
  el.setAttribute('aria-label','Welcome to Uni-Jos Mart');
  el.innerHTML=`
    <div class="bar">
      <b class="logo">
        <img src="unijos-logo.jpg" alt="UNIJOS" style="width:30px;height:30px;object-fit:contain;border-radius:6px">
        Uni-Jos <b>Mart</b>
      </b>
      <button class="gh" data-g="">Skip</button>
    </div>
    <div class="trk">
      ${D.map(d=>`
        <div>
          <div class="avc"><div class="ill-wrap">${d.a}</div></div>
          <h2>${d.t}</h2>
          <p>${d.p}</p>
        </div>`).join('')}
    </div>
    <div class="dots"></div>
    <div class="ia"></div>`;

  document.body.append(el);
  document.body.style.overflow='hidden';
  acts();

  el.onclick=e=>{
    const b=e.target.closest('button');
    if(!b)return;
    if(b.dataset.n){i=Math.max(0,Math.min(D.length-1,i+ +b.dataset.n));acts()}
    else close(b.dataset.g)
  };

  // swipe support
  let x0;
  el.ontouchstart=e=>x0=e.touches[0].clientX;
  el.ontouchend=e=>{
    const d=e.changedTouches[0].clientX-x0;
    if(Math.abs(d)>50){i=Math.max(0,Math.min(D.length-1,i+(d<0?1:-1)));acts()}
  };
}

addEventListener('keydown',e=>{
  if(!el)return;
  if(e.key==='Escape')close();
  if(e.key==='ArrowRight'&&i<D.length-1){i++;acts()}
  if(e.key==='ArrowLeft'&&i){i--;acts()}
});

const hw=document.getElementById('hw');
if(hw)hw.onclick=e=>{e.preventDefault();open()};
if(!localStorage.intro&&!localStorage.tk)open();
