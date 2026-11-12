/* js/laporan.js - Laporan keuangan admin. Harus dimuat SETELAH admin.js (memakai $, DB, badge, empty, me). */
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
let cur = {from: '', to: '', month: '', year: '', status: '', svc: ''};   // filter yang SEDANG DITERAPKAN (dipakai tabel & cetak)

// Gabungkan transaksi dengan pesanan, layanan, dan pelanggan
function trxRows() {
  const d = DB();
  return d.transactions.map(t => {
    const b = d.bookings.find(x => x.id === t.bookingId), s = d.services.find(x => x.id === b.serviceId), u = d.users.find(x => x.id === t.userId) || {};
    const valid = t.status !== 'berhasil' || t.amount === b.total;       // "berhasil" harus nominalnya sama dengan total pesanan
    return {t, b, s, u, valid, paid: t.status === 'berhasil' && valid, date: t.paidAt || t.createdAt};
  });
}
function filtered() {
  return trxRows().filter(r =>
    (!cur.from || r.date >= cur.from) && (!cur.to || r.date <= cur.to) &&
    (!cur.month || +r.date.slice(5, 7) === +cur.month) && (!cur.year || r.date.slice(0, 4) === cur.year) &&
    (!cur.status || r.t.status === cur.status) && (!cur.svc || r.s.id === +cur.svc))
    .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.t.id - a.t.id);
}
function describeFilter() {
  const p = [];
  if (cur.from || cur.to) p.push('Periode: ' + (cur.from ? fmtDate(cur.from) : 'awal') + ' - ' + (cur.to ? fmtDate(cur.to) : 'sekarang'));
  if (cur.month) p.push('Bulan: ' + MONTHS[cur.month - 1]);
  if (cur.year) p.push('Tahun: ' + cur.year);
  if (cur.status) p.push('Status: ' + STATUS_BAYAR[cur.status]);
  if (cur.svc) p.push('Layanan: ' + (DB().services.find(s => s.id === +cur.svc) || {}).name);
  return p.length ? p.join(' | ') : 'Semua data transaksi';
}

function renderReport() {
  const rows = filtered();
  const sum = f => rows.filter(f).reduce((a, r) => a + r.t.amount, 0), cnt = f => rows.filter(f).length;
  const revenue = sum(r => r.paid);                                       // pendapatan: HANYA transaksi berhasil yang valid
  $('repStats').innerHTML = [
    [rupiah(revenue), 'Total pendapatan', 'Hanya dari transaksi berhasil'],
    [cnt(r => r.paid), 'Transaksi berhasil', ''],
    [cnt(r => r.t.status === 'pending'), 'Transaksi pending', rupiah(sum(r => r.t.status === 'pending')) + ' belum dihitung'],
    [cnt(r => r.t.status === 'gagal'), 'Transaksi gagal', rupiah(sum(r => r.t.status === 'gagal')) + ' tidak dihitung']
  ].map(s => `<div class="stat"><strong style="${String(s[0]).length > 8 ? 'font-size:1.7rem' : ''}">${s[0]}</strong><span>${s[1]}</span><br><small>${s[2]}</small></div>`).join('');
  $('repNote').textContent = 'Belum dibayar: ' + cnt(r => r.t.status === 'belum') + ' | Kedaluwarsa: ' + cnt(r => r.t.status === 'kedaluwarsa') + ' | Total data: ' + rows.length;
  $('repBody').innerHTML = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${fmtDate(r.date)}</td><td>${esc(r.t.trxNo)}</td><td>${esc(r.u.name)}</td><td>${esc(r.s.name)}</td>
    <td>${rupiah(r.t.amount)}</td><td>${esc(r.t.method) || '-'}</td><td>${r.valid ? badge('p', r.t.status) : '<span class="badge b-gagal">Nominal tidak sesuai</span>'}</td></tr>`).join('') || empty(8, 'Tidak ada transaksi pada filter ini.');
  $('repFoot').innerHTML = `<tr><td colspan="5"><strong>Total pendapatan (transaksi berhasil)</strong></td><td colspan="3"><strong>${rupiah(revenue)}</strong></td></tr>`;
  $('printHead').innerHTML = `<h2>LensaKita Studio</h2><h3>Laporan Keuangan</h3><p>${esc(describeFilter())}</p><p>Dicetak: ${fmtDate(new Date().toLocaleDateString('sv-SE'))}</p>`;
}

function applyFilter() {
  const v = id => $(id).value;
  if (v('fFrom') && v('fTo') && v('fFrom') > v('fTo')) { toast('Tanggal awal tidak boleh setelah tanggal akhir.', 'error'); return false; }
  cur = {from: v('fFrom'), to: v('fTo'), month: v('fMonth'), year: v('fYear'), status: v('fStat'), svc: v('fSvc')};
  renderReport(); return true;
}

if (me && $('repBody')) {
  const d = DB(), thisYear = String(new Date().getFullYear());
  const years = [...new Set(d.transactions.map(t => (t.paidAt || t.createdAt).slice(0, 4)).concat(thisYear))].sort().reverse();
  $('fMonth').innerHTML = '<option value="">Semua bulan</option>' + MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
  $('fYear').innerHTML = '<option value="">Semua tahun</option>' + years.map(y => `<option>${y}</option>`).join('');
  $('fStat').innerHTML = '<option value="">Semua status</option>' + Object.keys(STATUS_BAYAR).map(k => `<option value="${k}">${STATUS_BAYAR[k]}</option>`).join('');
  $('fSvc').innerHTML = '<option value="">Semua layanan</option>' + d.categories.map(c => `<optgroup label="${esc(c.name)}">${d.services.filter(s => s.categoryId === c.id).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`).join('');

  $('filterForm').addEventListener('submit', e => { e.preventDefault(); applyFilter(); });
  $('btnResetFilter').onclick = () => { $('filterForm').reset(); applyFilter(); };   // tombol Reset Filter
  const printNow = () => {
    if (!applyFilter()) return;                                               // cetak selalu sesuai filter yang tampil
    let st = $('pageStyle'); if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
    st.textContent = '@page{size:A4 landscape;margin:12mm}';
    window.print();
  };
  $('btnPrintRep').onclick = printNow;
  $('btnPdfRep').onclick = () => { toast('Pada dialog cetak, pilih tujuan "Save as PDF".'); setTimeout(printNow, 900); };
  renderReport();
}
