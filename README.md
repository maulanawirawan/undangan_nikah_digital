# Undangan Nikah Digital: editorial, sinematik, 3D

Undangan pernikahan digital satu halaman dengan selera Gen Z: minimalis, personal, dan berpusat pada foto dan video pasangan. Tampilannya tetap jelas untuk orang tua dan keluarga besar.

Tanpa build, tanpa framework, tanpa biaya hosting. Cukup edit **satu file** (`assets/js/config.js`), lalu online-kan.

## Isi undangan

| Bagian | Isi |
| --- | --- |
| **Sampul 3D** | Sepasang cincin emas dan rose gold yang saling mengait, dirender real-time dengan Three.js: pantulan studio, berlian berfaset, kilau, dan debu cahaya. Cincin bisa diputar dengan jari. Nama tamu tampil otomatis dari link. |
| **Transisi buka** | Kamera meluncur ke lubang cincin, lalu layar terbuka seperti iris lensa ke halaman utama. |
| **Hero sinematik** | Video pembuka bergaya camcorder (REC, timecode, letterbox, grain), plus tombol langsung ke Acara, Lokasi, Galeri, dan RSVP. |
| **Salam dan ayat** | Kalimat ayat menyala kata demi kata saat di-scroll, dengan monogram berputar dan marquee *save the date*. |
| **Mempelai** | Kartu foto holografik yang miring mengikuti kursor atau kemiringan HP. |
| **Cerita kami** | Format Instagram Story: tap kanan/kiri, tahan untuk jeda, lengkap dengan lingkaran *highlight* per tahun. |
| **Save the date** | Hitung mundur, kalender dengan tanggal dilingkari tangan, tombol Google Calendar, dan file `.ics`. |
| **Acara** | Kartu bergaya tiket (boarding pass), petunjuk arah, peta, *dress code* dengan palet warna, dan link live streaming. |
| **Galeri** | Carousel 3D yang bisa diputar, *reel* video vertikal, galeri masonry dengan cap tanggal ala digicam, filter Foto/Video, dan lightbox yang bisa di-swipe. |
| **RSVP dan ucapan** | Form kehadiran, jumlah tamu, konfirmasi via WhatsApp, confetti, dan dinding ucapan dengan statistik. |
| **Amplop digital** | Kartu rekening bergaya kartu debit dengan tombol salin, plus alamat kirim kado. |
| **Penutup** | Cincin 3D muncul lagi, ucapan terima kasih, dan tombol salin hashtag. |
| **Musik** | Tombol musik mengambang. Kalau belum ada file lagu, undangan memutar musik lo-fi yang dibuat langsung di browser. |

Di layar lebar (laptop), undangan tampil dua kolom: slideshow foto besar di kiri dan konten di kanan.

## 1. Ganti data

Semua ada di **`assets/js/config.js`**: nama, orang tua, tanggal (format `2026-12-12T08:00:00+07:00`), lokasi, cerita, galeri, rekening, nomor WhatsApp, dan teks.

Foto dan video yang ada sekarang hanya **placeholder** (stok Unsplash/Mixkit). Cara menggantinya:

1. Taruh file di `assets/media/`, misalnya `assets/media/prewed-01.jpg`.
2. Tulis path-nya di config: `src: 'assets/media/prewed-01.jpg'`.
3. Supaya cepat dibuka di HP, kecilkan foto ke sisi panjang **±1600px** (kualitas JPG 75–80%). Video sebaiknya MP4 H.264, 720p, maksimal 15–20 detik.

Kalau sebuah foto gagal dimuat, undangan otomatis menggambar ilustrasi pengganti (langit senja, bokeh, siluet pasangan). Jadi tidak akan pernah tampil kosong.

Musik: isi `music.src` dengan path mp3 kalian. Kalau dikosongkan, musik lo-fi otomatis yang dipakai.

## 2. Coba di komputer

Karena memakai JavaScript module, buka lewat server lokal, bukan dengan klik dua kali file-nya:

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000/?to=Budi+Santoso
```

## 3. Online-kan gratis (GitHub Pages)

1. Push repo ini ke GitHub.
2. Buka **Settings → Pages**, lalu pilih *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Tunggu sekitar 1 menit. Undangan online di `https://USERNAME.github.io/undangan_nikah_digital/`.

Netlify, Vercel, atau Cloudflare Pages juga bisa. Cukup drag-and-drop folder ini.

## 4. Link pribadi per tamu

Tambahkan `?to=Nama+Tamu` di akhir link, misalnya:

```
https://USERNAME.github.io/undangan_nikah_digital/?to=Keluarga+Bpk.+Hendra
```

Untuk banyak tamu sekaligus, buka **`tools/link-tamu.html`**. Tempel daftar nama, lalu kamu dapat link dan pesan WhatsApp siap kirim untuk tiap tamu.

## 5. RSVP tersimpan di Google Sheets (opsional)

Tanpa pengaturan apa pun, RSVP tersimpan di perangkat tamu dan tamu bisa mengirim konfirmasi lewat WhatsApp. Supaya semua RSVP dan ucapan terkumpul di satu tempat dan dinding ucapan terlihat oleh semua tamu:

1. Buat Google Sheets, lalu buka **Ekstensi → Apps Script**.
2. Tempel isi `tools/google-apps-script.gs`, lalu **Deploy → New deployment → Web app** (Execute as: *Me*, Access: *Anyone*).
3. Salin URL web app ke `rsvp.endpoint` di `config.js`.

Setelah live, hapus `wishesSeed` (ucapan contoh) di config.

## Struktur

```
index.html              kerangka halaman
assets/js/config.js     ← SEMUA DATA UNDANGAN
assets/js/main.js       render bagian, interaksi, animasi scroll
assets/js/scene.js      scene 3D cincin (Three.js)
assets/js/audio.js      musik (file mp3 atau lo-fi generatif)
assets/css/style.css    desain
assets/vendor/          three.js r169, GSAP 3.12 (lokal, tanpa CDN)
assets/fonts/           Instrument Serif, Inter Tight, JetBrains Mono
tools/                  generator link tamu & backend Google Sheets
```

Bila HP tidak mendukung WebGL, sampul otomatis memakai animasi cincin CSS. Animasi juga dikurangi untuk pengguna yang mengaktifkan *reduce motion*.

## Lisensi pihak ketiga

- three.js: MIT
- GSAP: [Standard "No Charge" License](https://gsap.com/standard-license) (gratis, termasuk penggunaan komersial)
- Font Instrument Serif, Inter Tight, JetBrains Mono: SIL Open Font License
- Foto placeholder: [Unsplash License](https://unsplash.com/license); video placeholder: [Mixkit License](https://mixkit.co/license/)
