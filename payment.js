/* js/payment.js - Simulasi pembayaran (pembayaran.html) dan struk (struk.html).
   PENTING: ini SIMULASI di browser, bukan transaksi Midtrans sungguhan.
   Pada sistem asli, status pembayaran hanya boleh diubah oleh backend setelah notifikasi Midtrans terverifikasi. */
const $ = id => document.getElementById(id);
const me = Auth.current();
if (!me) location.replace('../login.html');
const today = () => new Date().toLocaleDateString('sv-SE');

// Ambil data transaksi dari ?trx=ID, pastikan pelanggan hanya bisa melihat miliknya (admin boleh semua)
function getCtx() {
  const id = +new URLSearchParams(location.search).get('trx');
  const db = Store.load();
  const t = db.transactions.find(x => x.id === id);
  if (!t || (me.role !== 'admin' && t.userId !== me.id)) return null;
  const b = db.bookings.find(x => x.id === t.bookingId);
  const s = db.services.find(x => x.id === b.serviceId);
  return {t, b, s, p: db.packages.find(x => x.id === b.packageId), c: db.categories.find(x => x.id === s.categoryId), cu: db.users.find(x => x.id === t.userId)};
}
const badge = key => `<span class="badge b-${key}">${esc(STATUS_BAYAR[key] || key)}</span>`;
const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;

/* ===== pembayaran.html ===== */
if (me && $('payBox')) {
  const METHODS = ['Transfer Bank (BCA VA)', 'Transfer Bank (BNI VA)', 'GoPay', 'QRIS', 'Kartu Kredit (Sandbox)'];
  const ctx = getCtx();
  if (me.role === 'admin') location.replace('../admin/dashboard.html');
  else if (!ctx) $('payBox').innerHTML = '<div class="empty">Transaksi tidak ditemukan. <a href="riwayat.html">Kembali ke riwayat</a></div>';
  else {
    const {t, b, s, p, cu} = ctx;
    const blocked = t.status === 'berhasil' ? 'Pesanan ini sudah lunas.' : b.status === 'dibatalkan' ? 'Pesanan dibatalkan, pembayaran tidak dapat dilakukan.' : '';
    $('payInfo').innerHTML = row('No. transaksi', esc(t.trxNo)) + row('No. booking', esc(b.code)) + row('Nama pelanggan', esc(cu.name)) +
      row('Layanan', esc(s.name)) + row('Paket', esc(p.name)) + row('Tanggal acara', fmtDate(b.date)) +
      row('Status pembayaran', badge(t.status)) + row('Total pembayaran', `<strong>${rupiah(b.total)}</strong>`);
    if (blocked) {
      $('payAction').innerHTML = `<div class="alert alert-error show">${blocked}</div><p style="margin-top:14px">${t.status === 'berhasil' ? `<a class="btn btn-sm" href="struk.html?trx=${t.id}">Lihat Struk</a> ` : ''}<a href="riwayat.html">Kembali ke riwayat</a></p>`;
    } else {
      $('methods').innerHTML = METHODS.map((m, i) => `<label class="method"><input type="radio" name="method" value="${esc(m)}" ${i === 0 ? 'checked' : ''}> ${esc(m)}</label>`).join('');
      const sim = $('sim');
      $('btnPay').onclick = () => { sim.classList.add('open'); };
      sim.addEventListener('click', e => {
        if (e.target === sim || e.target.closest('.modal-close')) return sim.classList.remove('open');
        const r = e.target.closest('[data-result]'); if (!r) return;
        // Cek ulang di data (bukan dari tampilan): nominal harus sama dengan total booking
        const db = Store.load(), tr = db.transactions.find(x => x.id === t.id), bk = db.bookings.find(x => x.id === tr.bookingId);
        if (tr.amount !== bk.total) tr.amount = bk.total;
        tr.method = document.querySelector('input[name=method]:checked').value;
        tr.status = r.dataset.result;
        tr.paidAt = tr.status === 'berhasil' ? today() : null;
        Store.save(db); sim.classList.remove('open');
        if (tr.status === 'berhasil') location.href = 'struk.html?trx=' + tr.id;
        else location.href = 'riwayat.html?pay=' + tr.status;
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') sim.classList.remove('open'); });
    }
  }
}

/* ===== struk.html ===== */
if (me && $('receipt')) {
  const ctx = getCtx();
  $('btnBack').href = me.role === 'admin' ? '../admin/transaksi.html' : 'riwayat.html';
  if (!ctx) { $('receipt').innerHTML = '<div class="empty">Struk tidak ditemukan.</div>'; $('toolbar').style.display = 'none'; }
  else {
    const {t, b, s, p, c, cu} = ctx;
    // LUNAS hanya jika status berhasil DAN nominal sama dengan total pesanan
    const lunas = t.status === 'berhasil' && t.amount === b.total;
    $('receipt').innerHTML = `
      <div class="r-head"><div class="r-logo">L</div><h2>LensaKita Studio</h2>
        <p>Jl. Cahaya No. 12, Jakarta Selatan</p><p>0812-0000-1234 &middot; halo@lensakita.test</p></div>
      <div class="r-stamp ${lunas ? 'ok' : 'no'}">${lunas ? 'LUNAS' : 'BELUM LUNAS'}</div>
      <dl class="r-list">
        ${row('No. transaksi', esc(t.trxNo))}${row('No. booking', esc(b.code))}${row('Nama pelanggan', esc(cu.name))}
        ${row('Tanggal transaksi', fmtDate(t.paidAt || t.createdAt))}${row('Jenis layanan', esc(c.name) + ' - ' + esc(s.name))}
        ${row('Paket', esc(p.name))}${row('Tanggal pemesanan jasa', fmtDate(b.date) + ', ' + esc(b.time) + ' WIB')}
        ${row('Metode pembayaran', esc(t.method) || '-')}${row('Status pembayaran', esc(STATUS_BAYAR[t.status]))}
      </dl>
      <div class="r-total"><span>Total pembayaran</span><strong>${rupiah(b.total)}</strong></div>
      <p class="r-note">${lunas ? 'Pembayaran berhasil diterima. Terima kasih telah memilih LensaKita Studio.' : 'Pembayaran belum lunas (status: ' + esc(STATUS_BAYAR[t.status]) + '). Dokumen ini bukan bukti pembayaran.'}</p>
      <p class="r-demo">Transaksi simulasi untuk demonstrasi, bukan transaksi uang sungguhan.</p>`;

    // Pilih ukuran kertas lewat @page, lalu cetak
    const printNow = () => {
      const thermal = $('fmt').value === 'thermal';
      $('receipt').classList.toggle('thermal', thermal);
      let st = $('pageStyle'); if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
      st.textContent = thermal ? '@page{size:80mm auto;margin:4mm}' : '@page{size:A4;margin:15mm}';
      window.print();
    };
    $('btnPrint').onclick = printNow;
    // Download PDF: browser menyimpan PDF lewat dialog cetak (pilih "Save as PDF" / "Simpan sebagai PDF")
    $('btnPdf').onclick = () => { toast('Pada dialog cetak, pilih tujuan "Save as PDF".'); setTimeout(printNow, 900); };
    $('fmt').onchange = () => $('receipt').classList.toggle('thermal', $('fmt').value === 'thermal');
  }
}
