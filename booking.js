/* js/booking.js - Logika semua halaman pelanggan (user/): dashboard, booking, riwayat, profil.
   Bagian yang dijalankan ditentukan oleh elemen yang ada di halaman. */
const me = Auth.guard('user');
const $ = id => document.getElementById(id);
const todayStr = (add = 0) => { const d = new Date(); d.setDate(d.getDate() + add); return d.toLocaleDateString('sv-SE'); };
const badge = (kind, key) => `<span class="badge b-${key}">${esc((kind === 'b' ? STATUS_BOOKING : STATUS_BAYAR)[key] || key)}</span>`;

// Ambil pesanan milik pelanggan yang login, lengkap dengan transaksi, layanan, dan paket
function myOrders() {
  const db = Store.load();
  return db.bookings.filter(b => b.userId === me.id).sort((a, b) => b.id - a.id).map(b => ({
    b, t: db.transactions.find(t => t.bookingId === b.id),
    s: db.services.find(s => s.id === b.serviceId), p: db.packages.find(p => p.id === b.packageId)
  }));
}
function orderActions(r) {
  if (r.t && r.t.status === 'berhasil') return `<a class="btn btn-sm" href="struk.html?trx=${r.t.id}">Lihat Struk</a>`;
  if (r.t && r.b.status !== 'dibatalkan') return `<a class="btn btn-sm" href="pembayaran.html?trx=${r.t.id}">Bayar</a>`;
  return '';
}
function orderRows(list, withDetail) {
  if (!list.length) return `<tr><td colspan="7" class="empty">Belum ada pesanan. Pilih layanan dan buat booking pertama Anda.</td></tr>`;
  return list.map(r => `<tr>
    <td>${esc(r.b.code)}</td><td>${esc(r.s.name)}<br><small>${esc(r.p.name)}</small></td>
    <td>${fmtDate(r.b.date)}</td><td>${rupiah(r.b.total)}</td>
    <td>${badge('b', r.b.status)}</td><td>${badge('p', r.t ? r.t.status : 'belum')}</td>
    <td class="act">${withDetail ? `<button class="btn btn-sm btn-ghost" data-detail="${r.b.id}">Detail</button>` : ''}${orderActions(r)}</td></tr>`).join('');
}
const tableHead = '<thead><tr><th>Kode</th><th>Layanan</th><th>Tanggal acara</th><th>Total</th><th>Status pesanan</th><th>Pembayaran</th><th>Aksi</th></tr></thead>';

// Tandai menu aktif pada subnav
(function () {
  const here = location.pathname.split('/').pop();
  document.querySelectorAll('.subnav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === here));
})();

/* ===== dashboard.html ===== */
if (me && $('dashStats')) {
  const list = myOrders();
  $('greet').textContent = 'Halo, ' + me.name;
  const proses = list.filter(r => ['dikonfirmasi', 'dikerjakan'].includes(r.b.status)).length;
  const selesai = list.filter(r => r.b.status === 'selesai').length;
  $('dashStats').innerHTML = [[list.length, 'Jumlah pesanan'], [proses, 'Sedang diproses'], [selesai, 'Pesanan selesai']]
    .map(s => `<div class="stat"><strong>${s[0]}</strong><span>${s[1]}</span></div>`).join('');
  $('recentBody').innerHTML = orderRows(list.slice(0, 5), false);
}

/* ===== booking.html ===== */
if (me && $('bookingForm')) {
  const db = Store.load(), q = new URLSearchParams(location.search);
  $('bCat').innerHTML = db.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const fillServices = () => { $('bSvc').innerHTML = db.services.filter(s => s.categoryId === +$('bCat').value).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join(''); };
  const fillPackages = () => { $('bPkg').innerHTML = db.packages.filter(p => p.serviceId === +$('bSvc').value).map(p => `<option value="${p.id}">${esc(p.name)} - ${rupiah(p.price)}</option>`).join(''); };
  const drawSummary = () => {
    const s = db.services.find(x => x.id === +$('bSvc').value), p = db.packages.find(x => x.id === +$('bPkg').value);
    $('summary').innerHTML = `<img src="${esc(s.image)}" alt="${esc(s.name)}"><h3>${esc(s.name)}</h3>
      <p>Paket ${esc(p.name)} &middot; sekitar ${p.hours} jam</p><ul>${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="total"><span>Total biaya</span><strong>${rupiah(p.price)}</strong></div>`;
  };
  // Isi awal dari link (?service=ID&package=ID) bila ada
  const preSvc = db.services.find(s => s.id === +q.get('service'));
  if (preSvc) $('bCat').value = preSvc.categoryId;
  fillServices(); if (preSvc) $('bSvc').value = preSvc.id;
  fillPackages(); if (db.packages.some(p => p.id === +q.get('package') && p.serviceId === +$('bSvc').value)) $('bPkg').value = q.get('package');
  drawSummary();
  $('bCat').onchange = () => { fillServices(); fillPackages(); drawSummary(); };
  $('bSvc').onchange = () => { fillPackages(); drawSummary(); };
  $('bPkg').onchange = drawSummary;
  $('bDate').min = todayStr(1);
  $('bWa').value = (db.users.find(u => u.id === me.id) || {}).phone || '';

  $('bookingForm').addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('msg'); let err = '';
    if (!$('bDate').value || $('bDate').value < todayStr(1)) err = 'Pilih tanggal mulai besok.';
    else if (!$('bTime').value) err = 'Pilih jam pelaksanaan.';
    else if ($('bLoc').value.trim().length < 5) err = 'Isi lokasi minimal 5 karakter.';
    else if (!/^[0-9+]{9,15}$/.test($('bWa').value.trim())) err = 'Nomor WhatsApp tidak valid.';
    if (err) { msg.textContent = err; msg.className = 'alert alert-error show'; return; }

    const d = Store.load();
    const pkg = d.packages.find(p => p.id === +$('bPkg').value);   // harga diambil dari data, bukan dari form
    const id = Store.nextId(d.bookings), tid = Store.nextId(d.transactions), day = todayStr().replace(/-/g, '');
    d.bookings.push({id, code: 'BK-' + day + '-' + String(id).padStart(3, '0'), userId: me.id, serviceId: pkg.serviceId, packageId: pkg.id,
      date: $('bDate').value, time: $('bTime').value, location: $('bLoc').value.trim(), wa: $('bWa').value.trim(), notes: $('bNote').value.trim(),
      total: pkg.price, status: 'menunggu', createdAt: todayStr()});
    d.transactions.push({id: tid, trxNo: 'TRX-' + day + '-' + String(tid).padStart(3, '0'), bookingId: id, userId: me.id, amount: pkg.price,
      method: '', status: 'belum', createdAt: todayStr(), paidAt: null});
    Store.save(d);
    $('btnBook').disabled = true;
    location.href = 'riwayat.html?new=' + d.bookings[d.bookings.length - 1].code;
  });
}

/* ===== riwayat.html ===== */
if (me && $('histBody')) {
  const draw = () => {
    const f = $('filterStatus').value;
    $('histBody').innerHTML = orderRows(myOrders().filter(r => !f || r.b.status === f), true);
  };
  $('filterStatus').innerHTML = '<option value="">Semua status</option>' + Object.keys(STATUS_BOOKING).map(k => `<option value="${k}">${STATUS_BOOKING[k]}</option>`).join('');
  $('filterStatus').onchange = draw; draw();
  const nw = new URLSearchParams(location.search).get('new');
  const pay = new URLSearchParams(location.search).get('pay');
  if (pay) toast({pending:'Pembayaran pending. Selesaikan pembayaran lewat tombol Bayar.', gagal:'Pembayaran gagal. Silakan coba lagi.', kedaluwarsa:'Pembayaran kedaluwarsa. Silakan coba lagi.'}[pay] || 'Status pembayaran diperbarui.', pay === 'pending' ? '' : 'error');
  if (nw) toast('Booking ' + nw + ' berhasil dibuat. Klik Bayar untuk melanjutkan.');

  const modal = $('modal'), body = $('modalBody');
  $('histBody').addEventListener('click', e => {
    const b = e.target.closest('[data-detail]'); if (!b) return;
    const r = myOrders().find(x => x.b.id === +b.dataset.detail);
    const canCancel = r.b.status === 'menunggu' && !(r.t && r.t.status === 'berhasil');
    body.innerHTML = `<h2 id="modalTitle">Detail ${esc(r.b.code)}</h2><div class="detail"><dl>
      <dt>Layanan</dt><dd>${esc(r.s.name)}</dd><dt>Paket</dt><dd>${esc(r.p.name)}</dd>
      <dt>Tanggal &amp; jam</dt><dd>${fmtDate(r.b.date)}, ${esc(r.b.time)} WIB</dd><dt>Lokasi</dt><dd>${esc(r.b.location)}</dd>
      <dt>WhatsApp</dt><dd>${esc(r.b.wa)}</dd><dt>Catatan</dt><dd>${esc(r.b.notes) || '-'}</dd>
      <dt>Total</dt><dd>${rupiah(r.b.total)}</dd><dt>Status pesanan</dt><dd>${badge('b', r.b.status)}</dd>
      <dt>Pembayaran</dt><dd>${badge('p', r.t ? r.t.status : 'belum')}</dd></dl></div>
      <div class="act" style="margin-top:20px;display:flex;gap:8px">${orderActions(r)}
      ${canCancel ? `<button class="btn btn-sm btn-ghost" data-cancel="${r.b.id}">Batalkan pesanan</button>` : ''}</div>`;
    modal.classList.add('open');
  });
  body.addEventListener('click', e => {
    const c = e.target.closest('[data-cancel]'); if (!c || !confirm('Batalkan pesanan ini?')) return;
    const d = Store.load(), bk = d.bookings.find(x => x.id === +c.dataset.cancel && x.userId === me.id);
    if (bk && bk.status === 'menunggu') { bk.status = 'dibatalkan'; Store.save(d); toast('Pesanan dibatalkan.'); }
    modal.classList.remove('open'); draw();
  });
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.modal-close')) modal.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });
}

/* ===== profil.html ===== */
if (me && $('profileForm')) {
  const user = () => Store.load().users.find(u => u.id === me.id);
  const u0 = user();
  $('pName').value = u0.name; $('pEmail').value = u0.email; $('pPhone').value = u0.phone || ''; $('pUser').value = u0.username;
  const show = (id, text, ok) => { const m = $(id); m.textContent = text; m.className = 'alert show ' + (ok ? 'alert-success' : 'alert-error'); };

  $('profileForm').addEventListener('submit', e => {
    e.preventDefault();
    if ($('pName').value.trim().length < 3) return show('msgProfile', 'Nama minimal 3 karakter.');
    if (!/^\S+@\S+\.\S+$/.test($('pEmail').value)) return show('msgProfile', 'Format email tidak valid.');
    if (!/^[0-9+]{9,15}$/.test($('pPhone').value.trim())) return show('msgProfile', 'Nomor WhatsApp tidak valid.');
    const d = Store.load(), u = d.users.find(x => x.id === me.id);
    u.name = $('pName').value.trim(); u.email = $('pEmail').value.trim(); u.phone = $('pPhone').value.trim();
    Store.save(d);
    localStorage.setItem(SESSION_KEY, JSON.stringify({...Auth.current(), name: u.name}));
    show('msgProfile', 'Profil berhasil disimpan.', true);
  });
  $('passForm').addEventListener('submit', e => {
    e.preventDefault();
    const d = Store.load(), u = d.users.find(x => x.id === me.id);
    if ($('oldPass').value !== u.password) return show('msgPass', 'Password lama salah.');
    if ($('newPass').value.length < 6) return show('msgPass', 'Password baru minimal 6 karakter.');
    if ($('newPass').value !== $('newPass2').value) return show('msgPass', 'Konfirmasi password tidak cocok.');
    u.password = $('newPass').value; Store.save(d); $('passForm').reset();
    show('msgPass', 'Password berhasil diganti.', true);
  });
}
