/***************************************************************
 * BACKEND DATA WILAYAH SLS/SUB SLS
 * Google Apps Script + Google Sheets + Vercel API proxy
 ***************************************************************/
const SPREADSHEET_ID = '1yKxO7622Q98auHajM3iXtP7IF6vwo0y7sL_xHv1sFNw';
const FOLDER_ID = '1BZM2PYXsVtkRQHmmiJ9-d1dKVffoNCGE';
const NAMA_SHEET = 'DataWilayah';
const HEADER = ['Nomor Urut', 'ID SLS/Sub SLS', 'Kecamatan', 'Kelurahan', 'Nama Wilayah', 'Waktu Input'];
const JUMLAH_KOLOM = HEADER.length;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Data Wilayah SLS/Sub SLS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** API JSON untuk dipanggil oleh Vercel server-side proxy. */
function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expectedToken = PropertiesService.getScriptProperties().getProperty('VERCEL_API_TOKEN');
    if (!expectedToken || !payload.token || payload.token !== expectedToken) {
      return jsonOutput_({ success: false, message: 'Akses API tidak diizinkan.' });
    }

    let result;
    switch (payload.action) {
      case 'get':
        result = { success: true, data: getDataWilayah() };
        break;
      case 'create':
        result = simpanDataWilayah(payload.form);
        break;
      case 'update':
        result = ubahDataWilayah(payload.row, payload.form);
        break;
      case 'delete':
        result = hapusDataWilayah(payload.row);
        break;
      default:
        result = { success: false, message: 'Aksi API tidak dikenal.' };
    }
    return jsonOutput_(result);
  } catch (error) {
    return jsonOutput_({ success: false, message: pesanError_(error) });
  }
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(NAMA_SHEET);
  if (!sheet) sheet = ss.insertSheet(NAMA_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, JUMLAH_KOLOM).setValues([HEADER]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, JUMLAH_KOLOM)
      .setFontWeight('bold').setBackground('#0756A4').setFontColor('#FFFFFF');
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(5, 250);
    sheet.setColumnWidth(6, 170);
    sheet.getRange('B:B').setNumberFormat('@');
  }
  return sheet;
}

function getDataWilayah() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, JUMLAH_KOLOM).getDisplayValues()
    .map(function (row, index) {
      return { row: index + 2, nomorUrut: row[0], idSlsSubSls: row[1], kecamatan: row[2], kelurahan: row[3], namaWilayah: row[4], waktuInput: row[5] };
    })
    .filter(function (item) {
      return [item.nomorUrut, item.idSlsSubSls, item.kecamatan, item.kelurahan, item.namaWilayah, item.waktuInput]
        .some(function (value) { return String(value).trim() !== ''; });
    });
}

function validasiForm_(form) {
  if (!form || typeof form !== 'object') throw new Error('Data formulir tidak ditemukan.');
  const nomorText = String(form.nomorUrut == null ? '' : form.nomorUrut).trim();
  const id = String(form.idSlsSubSls || form.idSls || '').trim();
  const kecamatan = String(form.kecamatan || '').trim();
  const kelurahan = String(form.kelurahan || '').trim();
  const nama = String(form.namaWilayah || '').trim();
  if (!/^\d+$/.test(nomorText) || !Number.isSafeInteger(Number(nomorText)) || Number(nomorText) < 1) throw new Error('Nomor urut harus berupa bilangan bulat minimal 1.');
  if (!id) throw new Error('ID SLS/Sub SLS wajib diisi.');
  if (!kecamatan) throw new Error('Kecamatan wajib diisi.');
  if (!kelurahan) throw new Error('Kelurahan wajib diisi.');
  if (!nama) throw new Error('Nama wilayah wajib diisi.');
  if (id.length > 100 || kecamatan.length > 150 || kelurahan.length > 150 || nama.length > 250) throw new Error('Salah satu isian melebihi batas panjang yang diizinkan.');
  return { nomorUrut: Number(nomorText), idSlsSubSls: id, kecamatan: kecamatan, kelurahan: kelurahan, namaWilayah: nama };
}

function simpanDataWilayah(form) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const d = validasiForm_(form); const sheet = getSheet_();
    const row = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(row, 2).setNumberFormat('@');
    sheet.getRange(row, 1, 1, JUMLAH_KOLOM).setValues([[d.nomorUrut, d.idSlsSubSls, d.kecamatan, d.kelurahan, d.namaWilayah, new Date()]]);
    sheet.getRange(row, 6).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    SpreadsheetApp.flush();
    return { success: true, message: 'Data wilayah berhasil ditambahkan.', row: row };
  } catch (error) { throw new Error('Gagal menambahkan data: ' + pesanError_(error)); }
  finally { lock.releaseLock(); }
}

function ubahDataWilayah(row, form) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const n = validasiNomorBaris_(row); const d = validasiForm_(form); const sheet = getSheet_();
    if (n > sheet.getLastRow()) throw new Error('Data tidak ditemukan. Muat ulang tabel.');
    const old = sheet.getRange(n, 1, 1, JUMLAH_KOLOM).getDisplayValues()[0];
    if (old.every(function (v) { return String(v).trim() === ''; })) throw new Error('Baris data sudah kosong. Muat ulang tabel.');
    sheet.getRange(n, 2).setNumberFormat('@');
    sheet.getRange(n, 1, 1, 5).setValues([[d.nomorUrut, d.idSlsSubSls, d.kecamatan, d.kelurahan, d.namaWilayah]]);
    SpreadsheetApp.flush();
    return { success: true, message: 'Data wilayah berhasil diperbarui.', row: n };
  } catch (error) { throw new Error('Gagal memperbarui data: ' + pesanError_(error)); }
  finally { lock.releaseLock(); }
}

function hapusDataWilayah(row) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const n = validasiNomorBaris_(row); const sheet = getSheet_();
    if (n > sheet.getLastRow()) throw new Error('Data tidak ditemukan. Muat ulang tabel.');
    const old = sheet.getRange(n, 1, 1, JUMLAH_KOLOM).getDisplayValues()[0];
    if (old.every(function (v) { return String(v).trim() === ''; })) throw new Error('Data sudah kosong atau telah dihapus.');
    sheet.deleteRow(n); SpreadsheetApp.flush();
    return { success: true, message: 'Data wilayah berhasil dihapus.' };
  } catch (error) { throw new Error('Gagal menghapus data: ' + pesanError_(error)); }
  finally { lock.releaseLock(); }
}

function validasiNomorBaris_(row) {
  const n = Number(row);
  if (!Number.isInteger(n) || n < 2) throw new Error('Nomor baris tidak valid.');
  return n;
}

function tesKoneksi() {
  const ss = getSpreadsheet_(); const folder = DriveApp.getFolderById(FOLDER_ID); const sheet = getSheet_();
  const data = { spreadsheet: ss.getName(), sheet: sheet.getName(), folderDrive: folder.getName(), jumlahData: Math.max(sheet.getLastRow() - 1, 0) };
  Logger.log(JSON.stringify(data, null, 2));
  return { success: true, message: 'Koneksi spreadsheet dan folder Drive berhasil.', data: data };
}

function pesanError_(error) {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui.';
  if (typeof error === 'string') return error;
  return error.message || 'Terjadi kesalahan yang tidak diketahui.';
}
