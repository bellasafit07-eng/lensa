/* js/main.js - Navbar & footer bersama, menu mobile, toast, dan konten halaman Home.
   Setiap halaman memakai <body data-root=""> (folder utama) atau data-root="../" (admin/ dan user/). */
(function () {
  const root = document.body.dataset.root || '';
  const u = Auth.current();
  const dash = u ? root + (u.role === 'admin' ? 'admin/dashboard.html' : 'user/dashboard.html') : '';
  const here = location.pathname.split('/').pop() || 'index.html';
  const links = [['index.html','Home'],['about.html','About'],['services.html','Services'],['portfolio.html','Portfolio'],['pricing.html','Pricing'],['contact.html','Contact']];

  const header = document.getElementById('site-header');
  if (header) header.innerHTML = `
    <div class="container nav">
      <a class="brand" href="${root}index.html"><span class="brand-mark">L</span>LensaKita <em>Studio</em></a>
      <button class="nav-toggle" id="navToggle" aria-label="Buka menu" aria-expanded="false">&#9776;</button>
      <nav class="menu" id="menu">
        ${links.map(l => `<a href="${root}${l[0]}" class="${here===l[0]?'active':''}">${l[1]}</a>`).join('')}
        ${u ? `<a class="btn btn-sm" href="${dash}">Dashboard</a><button class="btn btn-sm btn-ghost" id="btnLogout">Logout</button>`
            : `<a class="btn btn-sm btn-ghost" href="${root}login.html">Login</a><a class="btn btn-sm" href="${root}register.html">Register</a>`}
      </nav>
    </div>`;

  const footer = document.getElementById('site-footer');
  if (footer) footer.innerHTML = `
    <div class="container foot">
      <div><strong class="brand-foot">LensaKita Studio</strong><p>Capture Your Best Moments</p></div>
      <div><p>Jl. Cahaya No. 12, Jakarta Selatan</p><p>halo@lensakita.test &middot; 0812-0000-1234</p></div>
      <div><p>Instagram @lensakita.studio</p><p>&copy; ${new Date().getFullYear()} LensaKita Studio</p></div>
    </div>`;

  const tg = document.getElementById('navToggle');
  if (tg) tg.addEventListener('click', () => {
    const open = document.getElementById('menu').classList.toggle('open');
    tg.setAttribute('aria-expanded', open);
  });
  const lo = document.getElementById('btnLogout');
  if (lo) lo.addEventListener('click', () => { Auth.logout(); location.href = root + 'login.html'; });
})();

function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ===== Khusus halaman Home ===== */
(function () {
  const box = document.getElementById('featuredServices');
  if (!box) return;
  const db = Store.load();
  box.innerHTML = db.categories.map(c => {
    const svcs = db.services.filter(s => s.categoryId === c.id);
    const s = svcs[0];
    const min = Math.min(...svcs.map(x => x.price));
    return `<article class="card">
      <img src="${esc(s.image)}" alt="${esc(c.name)}" loading="lazy">
      <div class="card-body">
        <h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p>
        <div class="card-foot"><span class="price">Mulai ${rupiah(min)}</span>
        <a class="btn btn-sm" href="services.html#${esc(c.slug)}">Lihat layanan</a></div>
      </div></article>`;
  }).join('');
  const port = document.getElementById('portfolioGrid');
  if (port) port.innerHTML = db.services.filter((s, i) => [0,2,5,8,11,14].includes(i)).map(s => `<figure><img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy"></figure>`).join('');
})();

/* Jika sebuah gambar gagal dimuat (alamat salah / file tidak ada), tampilkan placeholder, bukan gambar rusak */
const IMG_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#F5EFE6"/><text x="50%" y="50%" fill="#A67B5B" font-size="32" font-family="sans-serif" text-anchor="middle">Foto belum tersedia</text></svg>');
document.addEventListener('error', e => {
  const i = e.target;
  if (i.tagName === 'IMG' && !i.dataset.fb) { i.dataset.fb = '1'; i.src = IMG_FALLBACK; }
}, true);
