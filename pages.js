/* js/pages.js - Logika halaman publik: Services, Pricing, Portfolio, Contact.
   Setiap bagian hanya jalan jika elemen halamannya ada. */
const pkgCard = (p, svcId) => `
  <div class="pkg ${p.name==='Standard'?'best':''}">
    <h3>${esc(p.name)}</h3>
    <div class="price">${rupiah(p.price)}</div><small>Durasi sekitar ${p.hours} jam</small>
    <ul>${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
    <a class="btn" href="${document.body.dataset.root || ''}user/booking.html?service=${svcId}&package=${p.id}">Pesan Sekarang</a>
  </div>`;

/* ===== services.html ===== */
(function () {
  const wrap = document.getElementById('serviceList');
  if (!wrap) return;
  const db = Store.load();
  wrap.innerHTML = db.categories.map(c => `
    <h2 class="cat-title" id="${esc(c.slug)}">${esc(c.name)}</h2>
    <div class="grid g4">${db.services.filter(s => s.categoryId === c.id).map(s => `
      <article class="card">
        <img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy">
        <div class="card-body"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p>
          <div class="card-foot"><span class="price">Mulai ${rupiah(s.price)}</span>
          <button class="btn btn-sm" data-svc="${s.id}">Lihat paket</button></div>
        </div></article>`).join('')}
    </div>`).join('');

  const modal = document.getElementById('modal'), body = document.getElementById('modalBody');
  const close = () => modal.classList.remove('open');
  wrap.addEventListener('click', e => {
    const b = e.target.closest('[data-svc]'); if (!b) return;
    const s = db.services.find(x => x.id === +b.dataset.svc);
    body.innerHTML = `<div class="modal-top"><img src="${esc(s.image)}" alt="${esc(s.name)}">
      <div><h2 id="modalTitle">${esc(s.name)}</h2><p>${esc(s.desc)}</p></div></div>
      <div class="grid g3">${db.packages.filter(p => p.serviceId === s.id).map(p => pkgCard(p, s.id)).join('')}</div>`;
    modal.classList.add('open');
  });
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.modal-close')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

/* ===== pricing.html ===== */
(function () {
  const sel = document.getElementById('pricingService');
  if (!sel) return;
  const db = Store.load();
  sel.innerHTML = db.categories.map(c => `<optgroup label="${esc(c.name)}">${
    db.services.filter(s => s.categoryId === c.id).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
  const fromUrl = +new URLSearchParams(location.search).get('service');
  if (fromUrl) sel.value = fromUrl;
  const draw = () => {
    const s = db.services.find(x => x.id === +sel.value);
    document.getElementById('pricingDesc').textContent = s.desc;
    document.getElementById('pricingGrid').innerHTML = db.packages.filter(p => p.serviceId === s.id).map(p => pkgCard(p, s.id)).join('');
  };
  sel.addEventListener('change', draw); draw();
})();

/* ===== portfolio.html ===== */
(function () {
  const grid = document.getElementById('portoGrid');
  if (!grid) return;
  const db = Store.load();
  const slug = id => (db.categories.find(c => c.id === id) || {}).slug;
  // Portofolio memakai foto layanan, jadi mengubah foto di Admin > Layanan langsung terlihat di sini
  const custom = (db.portfolio || []).map(p => ({cat: p.cat, type: p.type, label: p.title, src: p.src, yt: p.yt}));
  const items = custom.concat(db.services.map(s => ({cat: slug(s.categoryId), type: 'foto', label: s.name, src: s.image})));
  const media = i => i.type !== 'video' ? `<img src="${esc(i.src)}" alt="${esc(i.label)}" loading="lazy">`
    : i.yt ? `<iframe src="https://www.youtube.com/embed/${esc(i.yt)}" title="${esc(i.label)}" loading="lazy" allowfullscreen></iframe>`
    : `<video src="${esc(i.src)}" controls preload="metadata"></video>`;
  const draw = f => {
    grid.innerHTML = items.filter(i => f === 'all' || i.cat === f || (f === 'video' && i.type === 'video')).map(i => `
      <figure class="shot">${media(i)}<span>${i.type === 'video' ? '&#9654; ' : ''}${esc(i.label)}</span></figure>`).join('');
  };
  document.getElementById('portoFilter').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    document.querySelectorAll('#portoFilter .chip').forEach(x => x.classList.toggle('on', x === c));
    draw(c.dataset.f);
  });
  draw('all');
})();

/* ===== contact.html ===== */
(function () {
  const f = document.getElementById('contactForm');
  if (!f) return;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const v = id => document.getElementById(id).value.trim();
    const msg = document.getElementById('msg');
    let err = '';
    if (v('cname').length < 3) err = 'Nama minimal 3 karakter.';
    else if (!/^\S+@\S+\.\S+$/.test(v('cemail'))) err = 'Format email tidak valid.';
    else if (v('cmessage').length < 10) err = 'Pesan minimal 10 karakter.';
    msg.className = 'alert show ' + (err ? 'alert-error' : 'alert-success');
    if (err) { msg.textContent = err; return; }
    const KEY = 'lensakita_messages_v1';
    let list = []; try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch (x) {}
    list.push({name:v('cname'), email:v('cemail'), message:v('cmessage'), createdAt:new Date().toISOString()});
    localStorage.setItem(KEY, JSON.stringify(list));
    msg.textContent = 'Pesan terkirim. Kami akan membalas lewat email Anda.';
    f.reset();
  });
})();
