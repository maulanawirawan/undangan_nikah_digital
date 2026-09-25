/**
 * Backend RSVP & ucapan gratis pakai Google Sheets.
 *
 * Cara pakai (±5 menit):
 * 1. Buat Google Sheets baru → menu Ekstensi → Apps Script.
 * 2. Hapus isi editor, tempel seluruh file ini, klik Simpan.
 * 3. Klik Deploy → New deployment → pilih jenis "Web app".
 *      Execute as : Me
 *      Who has access : Anyone
 * 4. Klik Deploy, izinkan akses, lalu salin "Web app URL".
 * 5. Tempel URL itu ke assets/js/config.js → rsvp.endpoint.
 *
 * Setiap RSVP masuk ke sheet "RSVP", dan dinding ucapan di undangan
 * akan menampilkan ucapan dari semua tamu.
 */
const SHEET_NAME = 'RSVP';
const MAX_LIST = 200;

function doPost(e) {
  const p = (e && e.parameter) || {};
  const name = clean_(p.name, 60);
  if (!name) return json_({ ok: false, error: 'nama kosong' });
  const attend = ['hadir', 'tidak', 'ragu'].indexOf(p.attend) >= 0 ? p.attend : 'ragu';
  const count = Math.max(0, Math.min(10, parseInt(p.count, 10) || 0));
  getSheet_().appendRow([new Date(), name, attend, count, clean_(p.message, 400)]);
  return json_({ ok: true });
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action !== 'list') return json_({ ok: true, hint: 'gunakan ?action=list' });
  const values = getSheet_().getDataRange().getValues().slice(1);
  const rows = values.reverse().slice(0, MAX_LIST).map(function (r) {
    return {
      time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: unguard_(r[1]),
      attend: String(r[2]),
      count: Number(r[3]) || 0,
      message: unguard_(r[4]),
    };
  });
  return json_(rows);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Waktu', 'Nama', 'Kehadiran', 'Jumlah tamu', 'Ucapan']);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Potong panjang teks dan cegah teks tamu terbaca sebagai rumus spreadsheet.
function clean_(v, max) {
  let s = String(v || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function unguard_(v) {
  return String(v || '').replace(/^'(?=[=+\-@])/, '');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
