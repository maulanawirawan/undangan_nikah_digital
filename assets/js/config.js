/*
 * ============================================================
 *  DATA UNDANGAN — cukup edit file ini.
 * ============================================================
 *  Semua teks, tanggal, foto, video, rekening, dan pengaturan RSVP
 *  diambil dari objek WEDDING di bawah. Tidak perlu menyentuh HTML/JS lain.
 *
 *  Foto & video yang ada sekarang hanya PLACEHOLDER (stok Unsplash / Mixkit).
 *  Ganti dengan milik kalian: taruh file di assets/media/ lalu tulis
 *  path-nya, misal  photo: 'assets/media/prewed-01.jpg'.
 *  Kalau sebuah foto gagal dimuat, undangan otomatis menampilkan
 *  ilustrasi pengganti, jadi tidak akan pernah terlihat kosong.
 */
(function () {
  // Helper untuk foto stok Unsplash (placeholder). Hapus kalau sudah pakai foto sendiri.
  const U = (id, w = 1200) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=72`;

  window.WEDDING = {
    couple: {
      bride: {
        nick: 'Maulana',
        full: 'Maulana',
        parents: 'Putra pertama dari Bapak Fulan & Ibu Fulanah',
        instagram: 'cirrostratoooze',
        photo: '',
      },
      groom: {
        nick: 'Wirawan',
        full: 'Wirawan',
        parents: 'Putra kedua dari Bapak Anu & Ibu Anu',
        instagram: 'cirrostratoooze',
        photo: '',
      },
      hashtag: '#MaulanaWirawanJourney',
    },

    // Nama tamu diambil otomatis dari link: undangan.com/?to=Budi+Santoso
    guestPrefix: 'Kepada Yth. Bapak/Ibu/Saudara/i',

    greeting: {
      open: "Assalamu'alaikum Warahmatullahi Wabarakatuh",
      text:
        'Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu di hari bahagia kami.',
      close: "Wassalamu'alaikum Warahmatullahi Wabarakatuh",
    },

    verse: {
      text:
        'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
      source: 'QS. Ar-Rum: 21',
    },

    // Format waktu ISO + zona waktu (+07:00 = WIB, +08:00 = WITA, +09:00 = WIT)
    timezoneLabel: 'WIB',
    events: [
      {
        id: 'akad',
        title: 'Akad Nikah',
        start: '2026-12-12T08:00:00+07:00',
        end: '2026-12-12T10:00:00+07:00',
        venue: 'Masjid Senandika (fiktif)',
        address: 'Jl. Contoh Raya No. 00, Kota Khayalan',
        maps: 'https://www.google.com/maps/search/?api=1&query=Monas+Jakarta',
        note: 'Keluarga & kerabat dekat',
      },
      {
        id: 'resepsi',
        title: 'Resepsi',
        start: '2026-12-12T11:00:00+07:00',
        end: '2026-12-12T14:00:00+07:00',
        venue: 'Taman Kaca Senja (fiktif)',
        address: 'Jl. Imajinasi No. 00, Kota Khayalan',
        maps: 'https://www.google.com/maps/search/?api=1&query=Monas+Jakarta',
        note: 'Terbuka untuk semua tamu undangan',
      },
    ],
    // Peta yang ditampilkan di halaman (teks pencarian Google Maps)
    mapQuery: 'Monas, Jakarta',

    dressCode: {
      title: 'Earth & Merlot',
      note: 'Nuansa tanah, olive, merlot, atau krem. Tidak wajib, tapi bakal cakep di foto bareng.',
      colors: ['#5a1627', '#6b6a3a', '#b98b5e', '#e9dccb'],
    },

    livestream: {
      enabled: true,
      label: 'Nonton live di Instagram',
      url: 'https://www.instagram.com/cirrostratoooze/',
    },

    // Musik: isi src dengan file mp3 kalian (mis. 'assets/media/lagu.mp3').
    // Kalau kosong, undangan memutar musik lo-fi yang dibuat langsung di browser.
    music: {
      src: '',
      title: 'Lo-fi untuk Maulana & Wirawan',
      autoplayOnOpen: false,
    },

    // Video pembuka (hero). Kalau gagal dimuat, foto poster tampil dengan efek gerak halus.
    heroVideo: {
      src: '',
      poster: '',
    },

    // Video vertikal ala reels
    reel: {
      title: 'Prewedding Reel',
      src: '',
      poster: '',
    },

    // Cerita (tampil seperti Instagram Story, tap kiri/kanan untuk navigasi)
    story: [
      {
        year: '2019',
        title: 'Pertama ketemu',
        text: 'Satu kepanitiaan kampus, beda divisi. Dia pinjam charger, aku lupa minta balik.',
        photo: '',
      },
      {
        year: '2021',
        title: 'Resmi jadian',
        text: 'Di warung kopi kecil pas hujan deras. Nggak romantis, tapi jujur banget.',
        photo: '',
      },
      {
        year: '2024',
        title: 'Lamaran',
        text: 'Dua keluarga duduk satu meja. Deg-degan, lalu lega, lalu banyak tawa.',
        photo: '',
      },
      {
        year: '2026',
        title: 'Hari H',
        text: 'Babak baru dimulai. Kami ingin kamu ada di sana untuk menyaksikannya.',
        photo: '',
      },
    ],

    // Galeri: type 'photo' atau 'video'. date dipakai untuk cap tanggal ala digicam.
    gallery: [
      { type: 'photo', src: '', alt: 'Momen berdua', date: '2026-10-04', ratio: '4/5' },
      { type: 'photo', src: '', alt: 'Tertawa bersama', date: '2026-10-04', ratio: '3/4' },
      { type: 'photo', src: '', alt: 'Cuplikan prewedding', date: '2026-10-05', ratio: '9/16' },
      { type: 'photo', src: '', alt: 'Genggaman tangan', date: '2026-10-05', ratio: '1/1' },
      { type: 'photo', src: '', alt: 'Golden hour', date: '2026-10-05', ratio: '3/4' },
      { type: 'photo', src: '', alt: 'Cincin', date: '2024-06-15', ratio: '4/5' },
      { type: 'photo', src: '', alt: 'Jalan sore', date: '2026-10-04', ratio: '2/3' },
      { type: 'photo', src: '', alt: 'Detail', date: '2026-10-04', ratio: '1/1' },
      { type: 'photo', src: '', alt: 'Bunga', date: '2026-10-05', ratio: '4/5' },
      { type: 'photo', src: '', alt: 'Senyum', date: '2026-10-05', ratio: '3/4' },
      { type: 'photo', src: '', alt: 'Bersama', date: '2026-10-04', ratio: '4/5' },
      { type: 'photo', src: '', alt: 'Sore di taman', date: '2026-10-05', ratio: '2/3' },
    ],

    rsvp: {
      // Opsional: URL Google Apps Script (lihat tools/google-apps-script.gs & README)
      // agar RSVP & ucapan tersimpan di Google Sheets dan terlihat semua tamu.
      endpoint: '',
      // Nomor WhatsApp untuk konfirmasi (format internasional tanpa +)
      whatsapp: '620000000000',
      maxGuests: 4,
      deadline: '2026-12-01',
    },

    // Ucapan contoh supaya dinding ucapan tidak kosong (hapus kalau sudah live)
    wishesSeed: [
      { name: 'Teman Kampus', attend: 'hadir', message: 'Akhirnyaaa! Selamat ya kalian berdua, semoga sakinah mawaddah warahmah. See you di hari H!', time: '2026-09-20T19:12:00+07:00' },
      { name: 'Keluarga Besar', attend: 'hadir', message: 'Barakallahu lakuma wa baraka alaikuma. Semoga menjadi keluarga yang penuh berkah.', time: '2026-09-19T08:40:00+07:00' },
      { name: 'Tim BEM 2019', attend: 'ragu', message: 'Saksi hidup kasus charger itu. Bangga banget sama kalian. Doain bisa cuti ya!', time: '2026-09-18T22:05:00+07:00' },
      { name: 'Sahabat Jauh', attend: 'tidak', message: 'Maaf belum bisa datang karena lagi di luar kota. Doa terbaik dari jauh, love you both!', time: '2026-09-17T12:30:00+07:00' },
    ],

    gifts: {
      note: 'Doa restu kalian sudah lebih dari cukup. Kalau ingin memberi tanda kasih, bisa lewat amplop digital di bawah ini.',
      accounts: [
        { bank: 'Bank Contoh', number: '0000000000', name: 'Maulana' },
        { bank: 'Bank Fiktif', number: '0000000000000', name: 'Wirawan' },
      ],
      address: {
        label: 'Kirim kado fisik',
        name: 'Maulana & Wirawan',
        text: 'Jl. Contoh No. 00, Kota Khayalan 00000',
      },
    },

    closing: {
      text: 'Merupakan suatu kebahagiaan dan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.',
    },
  };
})();
