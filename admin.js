/* js/admin.js - Logika semua halaman admin. Bagian yang jalan ditentukan oleh elemen yang ada di halaman. */
const me = Auth.guard('admin');
const $ = id => document.getElementById(id);
const DB = () => Store.load();
const today = () => new Date().toLocaleDateString('sv-SE');
const badge = (kind, key) => `<span class="badge b-${key}">${esc((kind === 'b' ? STATUS_BOOKING : STATUS_BAYAR)[key] || key)}</span>`;
const empty = (n, t) => `<tr><td colspan="${n}" class="empty">${t}</td></tr>`;

/* ===== Sidebar, modal, dan tombol umum ===== */
if (me) {
  const NAV = [['dashboard', 'Dashboard'], ['pelanggan', 'Data Pelanggan'], ['layanan', 'Layanan & Paket'], ['portofolio', 'Portofolio'], ['pemesanan', 'Pemesanan'], ['transaksi', 'Transaksi'], ['laporan', 'Laporan Keuangan']];
  const here = location.pathname.split('/').pop().replace('.html', '');
  $('sidebar').innerHTML = `<div class="side-brand">LensaKita <em>Admin</em></div>
    ${NAV.map(n => `<a href="${n[0]}.html" class="${here === n[0] ? 'on' : ''}">${n[1]}</a>`).join('')}
    <div class="side-foot"><a href="../index.html">Lihat website</a><button id="btnReset">Reset data demo</button><button id="btnOut">Logout</button></div>`;
  $('adUser').textContent = me.name;
  $('sideToggle').onclick = () => document.body.classList.toggle('side-open');
  $('btnOut').onclick = () => { Auth.logout(); location.href = '../login.html'; };
  $('btnReset').onclick = () => {
    if (!confirm('Semua data diganti kembali ke data demo awal. Lanjutkan?')) return;
    localStorage.removeItem(DB_KEY); location.reload();
  };
  const modal = $('modal');
  window.openModal = (html, w) => { $('modalBody').innerHTML = html; modal.querySelector('.modal-box').style.maxWidth = (w || 560) + 'px'; modal.classList.add('open'); };
  window.closeModal = () => modal.classList.remove('open');
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.modal-close')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

/* ===== dashboard.html ===== */
function lastMonths(n) {
  const a = [], now = new Date();
  for (let i = n - 1; i >= 0; i--) { const x = new Date(now.getFullYear(), now.getMonth() - i, 1); a.push({key: x.toLocaleDateString('sv-SE').slice(0, 7), label: x.toLocaleDateString('id-ID', {month: 'short'})}); }
  return a;
}
function barChart(el, labels, vals, fmt) {
  const W = 360, H = 190, max = Math.max(...vals, 1), bw = 36, gap = (W - labels.length * bw) / (labels.length + 1);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik batang">` + vals.map((v, i) => {
    const h = Math.round(v / max * 130), x = gap + i * (bw + gap), y = 150 - h;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="#A67B5B"/><text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#5C4033">${v ? fmt(v) : ''}</text><text x="${x + bw / 2}" y="172" text-anchor="middle" font-size="12" fill="#222">${labels[i]}</text>`;
  }).join('') + `<line x1="0" y1="150" x2="${W}" y2="150" stroke="#e6d9c6"/></svg>`;
}
if (me && $('adStats')) {
  const d = DB(), paid = paidTrx(d), rev = paid.reduce((a, t) => a + t.amount, 0);
  const user = id => (d.users.find(u => u.id === id) || {}).name, svc = id => (d.services.find(s => s.id === id) || {}).name;
  $('adStats').innerHTML = [
    [d.users.filter(u => u.role === 'user').length, 'Total pelanggan'], [d.bookings.length, 'Total pemesanan'],
    [d.bookings.filter(b => b.status === 'menunggu').length, 'Menunggu konfirmasi'], [d.bookings.filter(b => b.status === 'dikerjakan').length, 'Sedang dikerjakan'],
    [paid.length, 'Transaksi berhasil'], [rupiah(rev), 'Total pendapatan']
  ].map(s => `<div class="stat"><strong style="${String(s[0]).length > 8 ? 'font-size:1.8rem' : ''}">${s[0]}</strong><span>${s[1]}</span></div>`).join('');
  const ms = lastMonths(6), short = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'jt' : Math.round(v / 1e3) + 'rb';
  barChart($('chartRev'), ms.map(m => m.label), ms.map(m => paid.filter(t => (t.paidAt || t.createdAt).startsWith(m.key)).reduce((a, t) => a + t.amount, 0)), short);
  barChart($('chartBook'), ms.map(m => m.label), ms.map(m => d.bookings.filter(b => b.createdAt.startsWith(m.key)).length), v => v);
  $('latestTrx').innerHTML = d.transactions.slice().sort((a, b) => b.id - a.id).slice(0, 5).map(t => `<tr><td>${esc(t.trxNo)}</td><td>${esc(user(t.userId))}</td><td>${rupiah(t.amount)}</td><td>${badge('p', t.status)}</td></tr>`).join('') || empty(4, 'Belum ada transaksi.');
  $('latestBook').innerHTML = d.bookings.slice().sort((a, b) => b.id - a.id).slice(0, 5).map(b => `<tr><td>${esc(b.code)}</td><td>${esc(user(b.userId))}</td><td>${esc(svc(b.serviceId))}</td><td>${badge('b', b.status)}</td></tr>`).join('') || empty(4, 'Belum ada pemesanan.');
}

/* ===== pelanggan.html ===== */
function drawCustomers() {
  const d = DB(), paid = paidTrx(d);
  $('custBody').innerHTML = d.users.filter(u => u.role === 'user').map(u => {
    const n = d.bookings.filter(b => b.userId === u.id).length, spent = paid.filter(t => t.userId === u.id).reduce((a, t) => a + t.amount, 0);
    return `<tr><td>${esc(u.name)}<br><small>@${esc(u.username)}</small></td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${n}</td><td>${rupiah(spent)}</td>
      <td class="act"><button class="btn btn-sm btn-ghost" data-edit="${u.id}">Edit</button><button class="btn btn-sm btn-danger" data-del="${u.id}">Hapus</button></td></tr>`;
  }).join('') || empty(6, 'Belum ada pelanggan.');
}
if (me && $('custBody')) {
  drawCustomers();
  $('custBody').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) {
      const u = DB().users.find(x => x.id === +ed.dataset.edit);
      openModal(`<h2>Edit pelanggan</h2><form id="custForm" novalidate><div class="alert alert-error" id="fMsg"></div>
        <label for="cName">Nama</label><input id="cName" value="${esc(u.name)}"><label for="cEmail">Email</label><input id="cEmail" value="${esc(u.email)}">
        <label for="cPhone">WhatsApp</label><input id="cPhone" value="${esc(u.phone)}"><button class="btn" style="margin-top:18px">Simpan</button></form>`);
      $('custForm').onsubmit = ev => {
        ev.preventDefault(); let err = '';
        if ($('cName').value.trim().length < 3) err = 'Nama minimal 3 karakter.';
        else if (!/^\S+@\S+\.\S+$/.test($('cEmail').value)) err = 'Format email tidak valid.';
        else if (!/^[0-9+]{9,15}$/.test($('cPhone').value.trim())) err = 'Nomor WhatsApp tidak valid.';
        if (err) { $('fMsg').textContent = err; $('fMsg').classList.add('show'); return; }
        const d = DB(), x = d.users.find(z => z.id === u.id);
        x.name = $('cName').value.trim(); x.email = $('cEmail').value.trim(); x.phone = $('cPhone').value.trim();
        Store.save(d); closeModal(); drawCustomers(); toast('Data pelanggan disimpan.');
      };
    }
    if (del) {
      const d = DB(), id = +del.dataset.del;
      if (paidTrx(d).some(t => t.userId === id)) return toast('Tidak bisa dihapus: pelanggan punya transaksi berhasil (data keuangan harus tetap ada).', 'error');
      if (!confirm('Hapus pelanggan beserta pesanannya?')) return;
      const bk = d.bookings.filter(b => b.userId === id).map(b => b.id);
      d.transactions = d.transactions.filter(t => !bk.includes(t.bookingId)); d.bookings = d.bookings.filter(b => b.userId !== id);
      d.users = d.users.filter(u => u.id !== id); Store.save(d); drawCustomers(); toast('Pelanggan dihapus.');
    }
  });
}

/* ===== layanan.html (layanan + paket) ===== */
function drawServices() {
  const d = DB();
  $('svcBody').innerHTML = d.services.map(s => `<tr><td>${esc((d.categories.find(c => c.id === s.categoryId) || {}).name)}</td><td>${esc(s.name)}</td><td>${rupiah(s.price)}</td>
    <td>${d.packages.filter(p => p.serviceId === s.id).length}</td><td class="act"><button class="btn btn-sm btn-ghost" data-edit="${s.id}">Edit</button>
    <button class="btn btn-sm btn-ghost" data-pk="${s.id}">Paket</button><button class="btn btn-sm btn-danger" data-del="${s.id}">Hapus</button></td></tr>`).join('') || empty(5, 'Belum ada layanan.');
}
// Perkecil gambar (maks. 1000 px) lalu ubah jadi teks data agar muat di LocalStorage
function resizeImage(file, max, done) {
  if (!file.type.startsWith('image/')) return done(null, 'File harus berupa gambar (JPG/PNG/WebP).');
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      done(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => done(null, 'Gambar tidak bisa dibaca.');
    img.src = r.result;
  };
  r.readAsDataURL(file);
}
function svcForm(id) {
  const d = DB(), s = d.services.find(x => x.id === id) || {categoryId: 1, name: '', desc: '', price: '', image: ''};
  openModal(`<h2>${id ? 'Edit' : 'Tambah'} layanan</h2><form id="svcForm" novalidate><div class="alert alert-error" id="fMsg"></div>
    <label for="fCat">Kategori</label><select id="fCat">${d.categories.map(c => `<option value="${c.id}" ${c.id === s.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <label for="fName">Nama layanan</label><input id="fName" value="${esc(s.name)}"><label for="fDesc">Deskripsi</label><textarea id="fDesc" rows="3">${esc(s.desc)}</textarea>
    <label for="fPrice">Harga dasar (Rp)</label><input type="number" id="fPrice" min="1000" step="1000" value="${esc(s.price)}">
    <label for="fFile">Foto layanan</label>
    <img id="fPrev" src="${esc(s.image || '')}" alt="Pratinjau foto" style="width:100%;max-height:170px;object-fit:cover;border-radius:8px;margin-bottom:8px;${s.image ? '' : 'display:none'}">
    <input type="file" id="fFile" accept="image/*"><small style="color:#6b5d54">Pilih foto dari komputer/HP. Otomatis diperkecil.</small>
    <label for="fImg">atau alamat gambar (URL, opsional)</label><input id="fImg" placeholder="https://..." value="${s.image && s.image.startsWith('data:') ? '' : esc(s.image)}">
    <button class="btn" style="margin-top:18px">Simpan layanan</button></form>`);
  let uploadedImg = '';
  $('fFile').onchange = () => {
    const f = $('fFile').files[0]; if (!f) return;
    resizeImage(f, 1000, (data, err) => {
      if (err) { toast(err, 'error'); return; }
      uploadedImg = data; $('fPrev').src = data; $('fPrev').style.display = 'block';
    });
  };
  $('svcForm').onsubmit = ev => {
    ev.preventDefault(); const price = Math.round(+$('fPrice').value); let err = '';
    if ($('fName').value.trim().length < 3) err = 'Nama layanan minimal 3 karakter.'; else if (!(price >= 1000)) err = 'Harga minimal Rp 1.000.';
    if (err) { $('fMsg').textContent = err; $('fMsg').classList.add('show'); return; }
    const x = Store.load(); let t = x.services.find(z => z.id === id);
    if (!t) {
      t = {id: Store.nextId(x.services)}; x.services.push(t);
      [['Basic', 1, 2, ['1 fotografer', '20 file hasil edit']], ['Standard', 1.6, 4, ['1 fotografer', '50 file hasil edit', 'Cetak 2 foto 8R']], ['Premium', 2.4, 6, ['2 fotografer', '100 file hasil edit', '1 video highlight']]]
        .forEach(k => x.packages.push({id: Store.nextId(x.packages), serviceId: t.id, name: k[0], price: Math.round(price * k[1] / 1000) * 1000, hours: k[2], features: k[3]}));
    }
    Object.assign(t, {categoryId: +$('fCat').value, name: $('fName').value.trim(), desc: $('fDesc').value.trim(), price, image: uploadedImg || $('fImg').value.trim() || t.image || 'https://picsum.photos/seed/lk' + t.id + '/800/600'});
    if (!Store.save(x)) return; closeModal(); drawServices(); toast('Layanan disimpan.');
  };
}
function pkgModal(sid) {
  const d = DB(), s = d.services.find(x => x.id === sid);
  const block = p => `<div class="pk" data-id="${p.id}"><div class="row2"><div><label>Nama paket</label><input class="k-name" value="${esc(p.name)}"></div>
    <div><label>Harga (Rp)</label><input type="number" class="k-price" min="1000" step="1000" value="${esc(p.price)}"></div></div>
    <div class="row2"><div><label>Durasi (jam)</label><input type="number" class="k-hours" min="1" max="24" value="${esc(p.hours)}"></div><div></div></div>
    <label>Fasilitas (satu baris satu fasilitas)</label><textarea class="k-feat" rows="3">${esc((p.features || []).join('\n'))}</textarea>
    <div class="act"><button class="btn btn-sm" data-pksave>${p.id ? 'Simpan' : 'Tambah paket'}</button>${p.id ? '<button class="btn btn-sm btn-danger" data-pkdel>Hapus</button>' : ''}</div></div>`;
  openModal(`<h2>Paket: ${esc(s.name)}</h2><div id="pkList" data-sid="${sid}">${d.packages.filter(p => p.serviceId === sid).map(block).join('')}
    <h3 style="margin:18px 0 8px">Tambah paket baru</h3>${block({id: 0, name: '', price: '', hours: 2, features: []})}</div>`, 640);
}
if (me && $('svcBody')) {
  drawServices();
  $('btnAddSvc').onclick = () => svcForm(0);
  $('svcBody').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]'), pk = e.target.closest('[data-pk]'), del = e.target.closest('[data-del]');
    if (ed) svcForm(+ed.dataset.edit);
    if (pk) pkgModal(+pk.dataset.pk);
    if (del) {
      const d = DB(), id = +del.dataset.del;
      if (d.bookings.some(b => b.serviceId === id)) return toast('Tidak bisa dihapus: layanan sudah dipakai pada pemesanan.', 'error');
      if (!confirm('Hapus layanan beserta paketnya?')) return;
      d.services = d.services.filter(s => s.id !== id); d.packages = d.packages.filter(p => p.serviceId !== id); Store.save(d); drawServices(); toast('Layanan dihapus.');
    }
  });
  $('modalBody').addEventListener('click', e => {
    const box = e.target.closest('.pk'); if (!box || !e.target.closest('[data-pksave],[data-pkdel]')) return;
    const sid = +$('pkList').dataset.sid, id = +box.dataset.id, d = DB();
    if (e.target.closest('[data-pkdel]')) {
      if (d.bookings.some(b => b.packageId === id)) return toast('Tidak bisa dihapus: paket sudah dipakai pada pemesanan.', 'error');
      if (!confirm('Hapus paket ini?')) return;
      d.packages = d.packages.filter(p => p.id !== id); Store.save(d); pkgModal(sid); drawServices(); return;
    }
    const v = c => box.querySelector(c).value, price = Math.round(+v('.k-price')), hours = Math.round(+v('.k-hours'));
    if (v('.k-name').trim().length < 2 || !(price >= 1000) || !(hours >= 1)) return toast('Isi nama paket, harga minimal Rp 1.000, dan durasi dengan benar.', 'error');
    const data = {name: v('.k-name').trim(), price, hours, features: v('.k-feat').split('\n').map(x => x.trim()).filter(Boolean)};
    if (id) Object.assign(d.packages.find(p => p.id === id), data); else d.packages.push({id: Store.nextId(d.packages), serviceId: sid, ...data});
    Store.save(d); pkgModal(sid); drawServices(); toast('Paket disimpan.');
  });
}

/* ===== pemesanan.html ===== */
function drawBookings() {
  const d = DB(), f = $('fStatus').value;
  $('bookBody').innerHTML = d.bookings.filter(b => !f || b.status === f).sort((a, b) => b.id - a.id).map(b => {
    const t = d.transactions.find(x => x.bookingId === b.id), s = d.services.find(x => x.id === b.serviceId), p = d.packages.find(x => x.id === b.packageId), u = d.users.find(x => x.id === b.userId) || {};
    return `<tr><td>${esc(b.code)}</td><td>${esc(u.name)}</td><td>${esc(s.name)}<br><small>${esc(p.name)}</small></td><td>${fmtDate(b.date)}</td><td>${rupiah(b.total)}</td>
      <td><select data-bs="${b.id}" aria-label="Status pesanan">${Object.keys(STATUS_BOOKING).map(k => `<option value="${k}" ${k === b.status ? 'selected' : ''}>${STATUS_BOOKING[k]}</option>`).join('')}</select></td>
      <td>${badge('p', t ? t.status : 'belum')}</td><td><button class="btn btn-sm btn-ghost" data-detail="${b.id}">Detail</button></td></tr>`;
  }).join('') || empty(8, 'Tidak ada pemesanan.');
}
if (me && $('bookBody')) {
  $('fStatus').innerHTML = '<option value="">Semua status</option>' + Object.keys(STATUS_BOOKING).map(k => `<option value="${k}">${STATUS_BOOKING[k]}</option>`).join('');
  $('fStatus').onchange = drawBookings; drawBookings();
  $('bookBody').addEventListener('change', e => {
    const sel = e.target.closest('[data-bs]'); if (!sel) return;
    const d = DB(), b = d.bookings.find(x => x.id === +sel.dataset.bs), t = d.transactions.find(x => x.bookingId === b.id);
    if (sel.value === 'dibatalkan' && !confirm('Batalkan/tolak pesanan ini?' + (t && t.status === 'berhasil' ? ' Pembayaran sudah lunas, refund perlu diurus manual.' : ''))) { sel.value = b.status; return; }
    b.status = sel.value; Store.save(d); drawBookings(); toast('Status pesanan diperbarui.');
  });
  $('bookBody').addEventListener('click', e => {
    const bt = e.target.closest('[data-detail]'); if (!bt) return;
    const d = DB(), b = d.bookings.find(x => x.id === +bt.dataset.detail), u = d.users.find(x => x.id === b.userId) || {}, s = d.services.find(x => x.id === b.serviceId), p = d.packages.find(x => x.id === b.packageId);
    openModal(`<h2>${esc(b.code)}</h2><div class="detail"><dl><dt>Pelanggan</dt><dd>${esc(u.name)}</dd><dt>WhatsApp</dt><dd>${esc(b.wa)}</dd><dt>Layanan</dt><dd>${esc(s.name)} (${esc(p.name)})</dd>
      <dt>Tanggal &amp; jam</dt><dd>${fmtDate(b.date)}, ${esc(b.time)} WIB</dd><dt>Lokasi</dt><dd>${esc(b.location)}</dd><dt>Catatan</dt><dd>${esc(b.notes) || '-'}</dd><dt>Total</dt><dd>${rupiah(b.total)}</dd></dl></div>`);
  });
}

/* ===== transaksi.html ===== */
function drawTrx() {
  const d = DB(), f = $('fStatus').value;
  $('trxBody').innerHTML = d.transactions.filter(t => !f || t.status === f).sort((a, b) => b.id - a.id).map(t => {
    const b = d.bookings.find(x => x.id === t.bookingId), s = d.services.find(x => x.id === b.serviceId), u = d.users.find(x => x.id === t.userId) || {};
    return `<tr><td>${esc(t.trxNo)}</td><td>${fmtDate(t.paidAt || t.createdAt)}</td><td>${esc(u.name)}</td><td>${esc(s.name)}</td><td>${rupiah(t.amount)}</td><td>${esc(t.method) || '-'}</td>
      <td><select data-ts="${t.id}" aria-label="Status pembayaran">${Object.keys(STATUS_BAYAR).map(k => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${STATUS_BAYAR[k]}</option>`).join('')}</select></td>
      <td><a class="btn btn-sm btn-ghost" href="../user/struk.html?trx=${t.id}">Struk</a></td></tr>`;
  }).join('') || empty(8, 'Tidak ada transaksi.');
}
if (me && $('trxBody')) {
  $('fStatus').innerHTML = '<option value="">Semua status</option>' + Object.keys(STATUS_BAYAR).map(k => `<option value="${k}">${STATUS_BAYAR[k]}</option>`).join('');
  $('fStatus').onchange = drawTrx; drawTrx();
  $('trxBody').addEventListener('change', e => {
    const sel = e.target.closest('[data-ts]'); if (!sel) return;
    const d = DB(), t = d.transactions.find(x => x.id === +sel.dataset.ts), b = d.bookings.find(x => x.id === t.bookingId);
    if (sel.value === 'berhasil' && !confirm('Tandai LUNAS secara manual? Lakukan hanya jika dana sudah Anda verifikasi.')) { sel.value = t.status; return; }
    t.status = sel.value; t.amount = b.total;
    if (t.status === 'berhasil') { t.paidAt = t.paidAt || today(); t.method = t.method || 'Manual (Admin)'; } else t.paidAt = null;
    Store.save(d); drawTrx(); toast('Status pembayaran diperbarui.');
  });
}

/* ===== portofolio.html (tambah foto & video) ===== */
const ytId = u => { const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : ''; };
function drawPortfolio() {
  const d = DB();
  $('porBody').innerHTML = d.portfolio.map(p => `<tr><td>${esc(p.title)}</td><td>${p.type === 'video' ? 'Video' : 'Foto'}</td>
    <td>${esc((d.categories.find(c => c.slug === p.cat) || {}).name)}</td><td>${p.yt ? 'YouTube' : esc(p.src.startsWith('data:') ? '(foto upload)' : p.src)}</td>
    <td><button class="btn btn-sm btn-danger" data-del="${p.id}">Hapus</button></td></tr>`).join('') || empty(5, 'Belum ada item. Tambahkan foto atau video di atas.');
}
if (me && $('porForm')) {
  const d0 = DB(); let uploaded = '';
  $('pCat').innerHTML = d0.categories.map(c => `<option value="${c.slug}">${esc(c.name)}</option>`).join('');
  const syncType = () => {
    const v = $('pType').value === 'video';
    $('pFileBox').style.display = v ? 'none' : 'block';
    $('pUrlLabel').textContent = v ? 'Link YouTube atau path file video' : 'atau alamat foto (URL, opsional jika upload)';
    $('pHelp').textContent = v ? 'Contoh: https://www.youtube.com/watch?v=xxxxxxxxxxx  atau  assets/videos/promo.mp4 (file ditaruh di folder assets/videos).' : 'Foto upload otomatis diperkecil.';
  };
  $('pType').onchange = syncType; syncType(); drawPortfolio();
  $('pFile').onchange = () => {
    const f = $('pFile').files[0]; if (!f) return;
    resizeImage(f, 1400, (data, err) => { if (err) return toast(err, 'error'); uploaded = data; toast('Foto siap ditambahkan.'); });
  };
  $('porForm').onsubmit = ev => {
    ev.preventDefault();
    const type = $('pType').value, title = $('pTitle').value.trim(), url = $('pUrl').value.trim();
    let err = '', src = '', yt = '';
    if (title.length < 3) err = 'Judul minimal 3 karakter.';
    else if (type === 'foto') { src = uploaded || url; if (!src) err = 'Upload foto atau isi alamat foto.'; }
    else { yt = ytId(url); src = url; if (!yt && !/\.(mp4|webm)$/i.test(url)) err = 'Isi link YouTube atau path file .mp4/.webm.'; }
    if (err) { $('pMsg').textContent = err; $('pMsg').classList.add('show'); return; }
    $('pMsg').classList.remove('show');
    const d = DB(); d.portfolio.push({id: Store.nextId(d.portfolio), type, cat: $('pCat').value, title, src, yt});
    if (!Store.save(d)) return;
    uploaded = ''; $('porForm').reset(); syncType(); drawPortfolio(); toast('Ditambahkan ke portofolio.');
  };
  $('porBody').addEventListener('click', e => {
    const b = e.target.closest('[data-del]'); if (!b || !confirm('Hapus item ini dari portofolio?')) return;
    const d = DB(); d.portfolio = d.portfolio.filter(p => p.id !== +b.dataset.del); Store.save(d); drawPortfolio();
  });
}
