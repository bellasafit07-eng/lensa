# LensaKita Studio (versi demo LocalStorage)

## Menjalankan
1. Buka folder `lensakita-studio` di Visual Studio Code.
2. Pasang ekstensi **Live Server**, klik kanan `index.html`, pilih **Open with Live Server**.
   (Membuka `index.html` langsung dengan klik dua kali juga bisa.)

## Akun demo (hanya untuk demonstrasi lokal)
- Admin: `admin` / `admin123`
- Pelanggan: `pelanggan` / `user123`

## Struktur
- `index.html, about.html, services.html, portfolio.html, pricing.html, contact.html, login.html, register.html`
- `user/` dashboard, booking, riwayat, pembayaran, struk, profil
- `admin/` dashboard, pelanggan, layanan, pemesanan, transaksi, laporan
- `css/` style, user, admin, print  |  `js/` storage, auth, main, pages, booking, payment, admin, laporan
- `docs/integrasi-midtrans.md` panduan integrasi Midtrans Sandbox dengan backend

## Skenario uji
1. Pelanggan: login, buat booking, bayar (simulasi), lihat struk, cetak.
2. Admin: lihat booking baru, ubah status, cek transaksi, buka laporan, filter, cetak.
3. Pelanggan: login ulang, status pesanan sudah berubah.
4. Admin: tombol **Reset data demo** di sidebar untuk mengulang dari awal.

## Catatan penting
- LocalStorage hanya untuk demonstrasi, BUKAN penyimpanan aman untuk produksi. Password demo tersimpan apa adanya.
- Pembayaran adalah simulasi bergaya Midtrans, bukan transaksi Midtrans sungguhan.
- Pembayaran asli memerlukan backend (lihat docs/integrasi-midtrans.md). Server Key tidak boleh ada di JavaScript.
- Data hanya ada di browser yang dipakai. Membersihkan data situs akan mengembalikan data demo.
