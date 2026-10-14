# Data Wilayah SLS/Sub SLS — Vercel + Google Sheets

## Isi proyek
- `index.html`: tampilan aplikasi yang disesuaikan agar memakai API Vercel, bukan `google.script.run`.
- `api/wilayah.js`: proxy server-side Vercel yang menyimpan URL Apps Script dan token di environment variables.
- `Code.gs`: backend Apps Script untuk membaca/menambah/mengubah/menghapus data pada Google Sheets.

## A. Pasang backend Apps Script
1. Buka proyek Apps Script yang sudah terhubung ke spreadsheet Anda.
2. Ganti isi `Code.gs` dengan isi file `Code.gs` pada paket ini. Simpan.
3. Buka **Project Settings** di Apps Script, cari **Script Properties**, tambahkan properti:
   - Property: `VERCEL_API_TOKEN`
   - Value: buat token rahasia panjang acak (minimal 32 karakter). Jangan kirim token ini ke siapa pun.
4. Deploy sebagai **Web app**: Execute as **Me**; Who has access **Anyone** (token pada API memproteksi operasi). Salin URL deployment yang berakhiran `/exec`.
5. Simpan deployment baru setelah setiap perubahan Code.gs.

> Penting: endpoint ini dapat dijangkau publik secara teknis, tetapi operasi akan ditolak jika token tidak cocok. Gunakan token panjang dan rahasia. Jangan pernah memasukkan token ke `index.html`.

## B. Upload ke GitHub
1. Buat repository GitHub baru, misalnya `data-wilayah-sls`.
2. Upload `index.html`, folder `api` (beserta `wilayah.js`), `Code.gs`, `README.md`, dan `vercel.json`.
3. Jangan mengunggah token rahasia ke repository.

## C. Deploy di Vercel
1. Import repository dari GitHub di Vercel.
2. Framework preset: **Other**. Build command kosong; output directory default/root (`.`).
3. Di **Project Settings → Environment Variables**, tambahkan:
   - `GAS_WEB_APP_URL` = URL Web App Apps Script berakhiran `/exec`
   - `GAS_API_TOKEN` = token yang sama persis dengan nilai Script Property `VERCEL_API_TOKEN`
4. Deploy / redeploy proyek.
5. Buka domain `.vercel.app` dan tes muat data, tambah, edit, dan hapus.

## Catatan
- Google Sheets tetap menjadi database; data yang ada tidak perlu dipindahkan.
- Browser hanya memanggil `/api/wilayah` pada domain Vercel. URL backend dan token tidak ditaruh di HTML. Pemilik server tetap bisa melihat konfigurasi dan backend Apps Script tetap menjadi bagian sistem.
- Untuk akses data sensitif, tambahkan autentikasi pengguna di depan API; token API saja membatasi akses langsung ke backend tetapi tidak membuat aplikasi publik menjadi privat.
- `Code.gs` adalah salinan backend untuk Apps Script; Vercel tidak menjalankan file tersebut.
