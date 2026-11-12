/* js/auth.js - Login, registrasi, logout, dan pembatasan akses halaman. Butuh storage.js dimuat lebih dulu. */
const Auth = {
  current() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } },
  login(username, password) {
    const u = Store.load().users.find(x => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password);
    if (!u) return {ok:false, msg:'Username atau password salah.'};
    localStorage.setItem(SESSION_KEY, JSON.stringify({id:u.id, username:u.username, name:u.name, role:u.role}));
    return {ok:true, role:u.role};
  },
  register(f) {
    const db = Store.load();
    if (f.name.trim().length < 3) return {ok:false, msg:'Nama minimal 3 karakter.'};
    if (!/^[a-z0-9_]{4,20}$/i.test(f.username)) return {ok:false, msg:'Username 4-20 karakter: huruf, angka, atau _.'};
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return {ok:false, msg:'Format email tidak valid.'};
    if (!/^[0-9+]{9,15}$/.test(f.phone)) return {ok:false, msg:'Nomor WhatsApp tidak valid.'};
    if (f.password.length < 6) return {ok:false, msg:'Password minimal 6 karakter.'};
    if (f.password !== f.password2) return {ok:false, msg:'Konfirmasi password tidak cocok.'};
    if (db.users.some(u => u.username.toLowerCase() === f.username.toLowerCase())) return {ok:false, msg:'Username sudah dipakai.'};
    db.users.push({id:Store.nextId(db.users), username:f.username.trim(), password:f.password, name:f.name.trim(), email:f.email.trim(), phone:f.phone, role:'user'});
    Store.save(db);
    return {ok:true};
  },
  logout() { localStorage.removeItem(SESSION_KEY); },
  // Pasang di halaman terlindungi: Auth.guard('admin') atau Auth.guard('user')
  guard(role) {
    const root = document.body.dataset.root || '';
    const u = Auth.current();
    if (!u) { location.replace(root + 'login.html'); return null; }
    if (u.role !== role) { location.replace(root + (u.role === 'admin' ? 'admin/dashboard.html' : 'user/dashboard.html')); return null; }
    return u;
  }
};
