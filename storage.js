/* js/storage.js - "Database" demo memakai LocalStorage.
   CATATAN: LocalStorage hanya untuk demonstrasi, BUKAN penyimpanan aman untuk website produksi. */
const DB_KEY = 'lensakita_db_v1';
const SESSION_KEY = 'lensakita_session_v1';

const rupiah = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = d => d ? new Date(d).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'}) : '-';

const STATUS_BOOKING = {menunggu:'Menunggu konfirmasi', dikonfirmasi:'Dikonfirmasi', dikerjakan:'Sedang dikerjakan', selesai:'Selesai', dibatalkan:'Dibatalkan'};
const STATUS_BAYAR = {belum:'Belum dibayar', pending:'Pending', berhasil:'Berhasil', gagal:'Gagal', kedaluwarsa:'Kedaluwarsa'};

function buildSeed() {
  const users = [
    {id:1, username:'admin', password:'admin123', name:'Admin LensaKita', email:'admin@lensakita.test', phone:'081200000001', role:'admin'},
    {id:2, username:'pelanggan', password:'user123', name:'Pelanggan Demo', email:'pelanggan@lensakita.test', phone:'081200000002', role:'user'}
  ];
  const categories = [
    {id:1, slug:'wisuda', name:'Foto Wisuda', desc:'Abadikan hari kelulusan bersama keluarga dan teman.'},
    {id:2, slug:'umkm', name:'Fotografi UMKM', desc:'Foto produk yang membuat dagangan lebih menarik.'},
    {id:3, slug:'acara', name:'Dokumentasi Acara', desc:'Seminar, workshop, ulang tahun, hingga acara keluarga.'},
    {id:4, slug:'video', name:'Video Promosi', desc:'Video singkat untuk produk, usaha, dan iklan bisnis.'}
  ];
  const list = [
    [1,'Foto Wisuda Individu',350000,'Sesi foto kelulusan personal dengan arahan pose.'],
    [1,'Foto Wisuda Bersama Teman',450000,'Foto rombongan satu angkatan di lokasi wisuda.'],
    [1,'Foto Wisuda Bersama Keluarga',500000,'Foto keluarga lengkap dengan berbagai formasi.'],
    [1,'Dokumentasi Kelulusan',900000,'Dokumentasi penuh dari prosesi hingga sesi foto.'],
    [2,'Foto Produk Makanan dan Minuman',400000,'Foto menu dengan styling dan cahaya studio.'],
    [2,'Foto Produk Fashion',600000,'Foto produk fashion, flat lay atau memakai model.'],
    [2,'Foto Katalog Produk',500000,'Foto seragam untuk katalog dan marketplace.'],
    [2,'Foto Promosi Media Sosial',450000,'Konten foto siap unggah untuk Instagram dan TikTok.'],
    [3,'Dokumentasi Seminar',1000000,'Foto panel, peserta, dan suasana seminar.'],
    [3,'Dokumentasi Workshop',950000,'Dokumentasi kegiatan workshop dari awal sampai akhir.'],
    [3,'Dokumentasi Ulang Tahun',800000,'Momen tiup lilin, tamu, dan dekorasi.'],
    [3,'Dokumentasi Acara Kampus',900000,'Kegiatan organisasi dan event kampus.'],
    [3,'Dokumentasi Acara Keluarga',850000,'Arisan, syukuran, dan reuni keluarga.'],
    [4,'Video Promosi Produk',1500000,'Video pendek untuk memperkenalkan produk.'],
    [4,'Video Promosi UMKM',1800000,'Video iklan UMKM 30-60 detik dengan voice over.'],
    [4,'Video Iklan Bisnis',2500000,'Video iklan bisnis dengan alur cerita.'],
    [4,'Video Profil Perusahaan atau Usaha',3000000,'Video profil untuk perusahaan atau usaha Anda.']
  ];
  const services = list.map((s,i) => ({id:i+1, categoryId:s[0], name:s[1], price:s[2], desc:s[3], image:'https://picsum.photos/seed/lensakita'+(i+1)+'/800/600'}));
  const tiers = [
    {n:'Basic', m:1, h:2, f:['1 fotografer','20 file hasil edit','Hasil via Google Drive']},
    {n:'Standard', m:1.6, h:4, f:['1 fotografer','50 file hasil edit','Hasil via Google Drive','Cetak 2 foto 8R']},
    {n:'Premium', m:2.4, h:6, f:['2 fotografer','100 file hasil edit','1 video highlight','Cetak 5 foto 8R','Album mini']}
  ];
  const packages = [];
  services.forEach(s => tiers.forEach(t => packages.push({id:packages.length+1, serviceId:s.id, name:t.n, price:Math.round(s.price*t.m/1000)*1000, hours:t.h, features:t.f})));
  const pk = (sid, name) => packages.find(p => p.serviceId===sid && p.name===name);
  // [userId, serviceId, paket, tanggal acara, status booking, status bayar, metode, tanggal dibuat]
  const demo = [
    [2,1,'Basic','2026-09-12','selesai','berhasil','Transfer Bank (BCA VA)','2026-09-02'],
    [2,5,'Standard','2026-09-25','selesai','berhasil','GoPay','2026-09-15'],
    [2,9,'Premium','2026-10-18','dikerjakan','berhasil','QRIS','2026-10-05'],
    [2,14,'Basic','2026-11-22','dikonfirmasi','pending','Transfer Bank (BNI VA)','2026-11-03'],
    [2,3,'Standard','2026-11-30','menunggu','belum','','2026-11-08'],
    [2,6,'Basic','2026-10-10','dibatalkan','gagal','Kartu Kredit (Sandbox)','2026-10-01']
  ];
  const bookings = [], transactions = [];
  demo.forEach((d,i) => {
    const p = pk(d[1], d[2]), n = i+1, day = d[7].replace(/-/g,'');
    bookings.push({id:n, code:'BK-'+day+'-'+String(n).padStart(3,'0'), userId:d[0], serviceId:d[1], packageId:p.id, date:d[3], time:'09:00', location:'Jakarta', wa:'081200000002', notes:'', total:p.price, status:d[4], createdAt:d[7]});
    transactions.push({id:n, trxNo:'TRX-'+day+'-'+String(n).padStart(3,'0'), bookingId:n, userId:d[0], amount:p.price, method:d[6], status:d[5], createdAt:d[7], paidAt:d[5]==='berhasil'?d[7]:null});
  });
  return {users, categories, services, packages, bookings, transactions};
}

const Store = {
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { d = null; }
    if (!d) { d = buildSeed(); Store.save(d); }
    if (!d.portfolio) d.portfolio = [];   // item portofolio buatan admin (foto/video)
    return d;
  },
  save(d) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(d)); return true; }
    catch (e) { alert('Penyimpanan browser penuh. Gunakan foto yang lebih kecil atau hapus beberapa foto.'); return false; }
  },
  nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; },
  reset() { localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); }
};

// Transaksi yang sah dihitung sebagai pendapatan: status "berhasil" DAN nominal sama dengan total pesanan.
// Transaksi pending, gagal, belum dibayar, dan kedaluwarsa tidak pernah ikut terhitung.
function paidTrx(d) {
  return d.transactions.filter(t => t.status === 'berhasil' && d.bookings.some(b => b.id === t.bookingId && b.total === t.amount));
}
