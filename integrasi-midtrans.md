# Integrasi Midtrans Sandbox (memerlukan backend)

Versi demo memakai simulasi di browser. Pembayaran asli TIDAK boleh bergantung pada JavaScript browser.

## Alur
1. Browser kirim `booking_id` ke backend (`/api/create-transaction`).
2. Backend membaca total dari database, lalu meminta Snap token ke Midtrans memakai **Server Key**.
3. Browser membuka Snap dengan token: `snap.pay(token)`. Browser hanya memakai **Client Key**.
4. Midtrans mengirim notifikasi ke backend (`/api/midtrans-notification`).
5. Backend memverifikasi signature, mengecek nominal, lalu mengubah status di database.
6. Halaman pelanggan membaca status dari backend, bukan dari hasil `snap.pay`.

## Aturan keamanan
- Server Key hanya di file konfigurasi server (jangan di JS, jangan di GitHub).
- Jangan simpan data kartu. Midtrans yang menanganinya.
- Total harga selalu dihitung ulang di server.
- Status "berhasil" hanya dari notifikasi yang signature-nya valid.

## Contoh PHP: membuat transaksi (create-transaction.php)
```php
<?php
$serverKey = 'SB-Mid-server-XXXX';          // dari file konfigurasi
$orderId   = 'LK-' . $bookingId . '-' . time();
$amount    = (int) $booking['total_price'];  // ambil dari database
$payload = ['transaction_details' => ['order_id' => $orderId, 'gross_amount' => $amount]];
$ch = curl_init('https://app.sandbox.midtrans.com/snap/v1/transactions');
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json',
    'Authorization: Basic ' . base64_encode($serverKey . ':')],
  CURLOPT_POSTFIELDS => json_encode($payload)]);
echo curl_exec($ch);   // berisi "token"
```

## Contoh PHP: menerima notifikasi (midtrans-notification.php)
```php
<?php
$n = json_decode(file_get_contents('php://input'), true);
$expected = hash('sha512', $n['order_id'] . $n['status_code'] . $n['gross_amount'] . $serverKey);
if (!hash_equals($expected, $n['signature_key'] ?? '')) { http_response_code(403); exit; }
// cek juga: gross_amount sama dengan total di database
$status = match ($n['transaction_status']) {
  'settlement', 'capture' => 'berhasil',
  'pending' => 'pending',
  'deny', 'cancel', 'failure' => 'gagal',
  'expire' => 'kedaluwarsa',
  default => 'pending' };
// UPDATE payments SET payment_status = ? WHERE order_id = ?  (prepared statement)
http_response_code(200);
```
Daftarkan URL notifikasi di Midtrans Dashboard Sandbox (Settings > Payment > Notification URL). Saat uji lokal, gunakan tunnel seperti ngrok.

## Memasang Snap di halaman
```html
<script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="SB-Mid-client-XXXX"></script>
<script>snap.pay(tokenDariBackend);</script>
```
