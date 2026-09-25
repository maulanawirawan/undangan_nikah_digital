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
        nick: 'Alya',
        full: 'Alya Putri Rahmadani',
        parents: 'Putri pertama dari Bapak Hendra Wijaya & Ibu Sari Lestari',
        instagram: 'alyaputri',
        photo: U('photo-1460978812857-470ed1c77af0', 900),
      },
      groom: {
        nick: 'Dimas',
        full: 'Dimas Arya Pratama',
        parents: 'Putra kedua dari Bapak Agus Santoso & Ibu Rina Marlina',
        instagram: 'dimasarya',
        photo: U('photo-1507504031003-b417219a0fde', 900),
      },
      hashtag: '#AlyaDimasJourney',
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
        venue: 'Masjid Al-Hikmah',
        address: 'Jl. Bangka Raya No. 1, Mampang Prapatan, Jakarta Selatan',
        maps: 'https://www.google.com/maps/search/?api=1&query=Mampang+Prapatan+Jakarta+Selatan',
        note: 'Keluarga & kerabat dekat',
      },
      {
        id: 'resepsi',
        title: 'Resepsi',
        start: '2026-12-12T11:00:00+07:00',
        end: '2026-12-12T14:00:00+07:00',
        venue: 'The Glasshouse Garden',
        address: 'Jl. Kemang Raya No. 8, Bangka, Jakarta Selatan',
        maps: 'https://www.google.com/maps/search/?api=1&query=Kemang+Raya+Jakarta+Selatan',
        note: 'Terbuka untuk semua tamu undangan',
      },
    ],
    // Peta yang ditampilkan di halaman (teks pencarian Google Maps)
    mapQuery: 'Kemang Raya, Jakarta Selatan',

    dressCode: {
      title: 'Earth & Merlot',
      note: 'Nuansa tanah, olive, merlot, atau krem. Tidak wajib, tapi bakal cakep di foto bareng.',
      colors: ['#5a1627', '#6b6a3a', '#b98b5e', '#e9dccb'],
    },

    livestream: {
      enabled: true,
      label: 'Nonton live di Instagram',
      url: 'https://instagram.com/alyaputri',
    },

    // Musik: isi src dengan file mp3 kalian (mis. 'assets/media/lagu.mp3').
    // Kalau kosong, undangan memutar musik lo-fi yang dibuat langsung di browser.
    music: {
      src: '',
      title: 'Lo-fi untuk Alya & Dimas',
      autoplayOnOpen: false,
    },

    // Video pembuka (hero). Kalau gagal dimuat, foto poster tampil dengan efek gerak halus.
    heroVideo: {
      src: 'https://assets.mixkit.co/videos/5217/5217-720.mp4',
      poster: U('photo-1519741497674-611481863552', 1400),
    },

    // Video vertikal ala reels
    reel: {
      title: 'Prewedding Reel',
      src: 'https://assets.mixkit.co/videos/5217/5217-720.mp4',
      poster: U('photo-1511285560929-80b456fea0bc', 900),
    },

    // Cerita (tampil seperti Instagram Story, tap kiri/kanan untuk navigasi)
    story: [
      {
        year: '2019',
        title: 'Pertama ketemu',
        text: 'Satu kepanitiaan kampus, beda divisi. Dia pinjam charger, aku lupa minta balik.',
        photo: U('photo-1516589178581-6cd7833ae3b2', 900),
      },
      {
        year: '2021',
        title: 'Resmi jadian',
        text: 'Di warung kopi kecil pas hujan deras. Nggak romantis, tapi jujur banget.',
        photo: U('photo-1529636798458-92182e662485', 900),
      },
      {
        year: '2024',
        title: 'Lamaran',
        text: 'Dua keluarga duduk satu meja. Deg-degan, lalu lega, lalu banyak tawa.',
        photo: U('photo-1515934751635-c81c6bc9a2d8', 900),
      },
      {
        year: '2026',
        title: 'Hari H',
        text: 'Babak baru dimulai. Kami ingin kamu ada di sana untuk menyaksikannya.',
        photo: U('photo-1519225421980-715cb0215aed', 900),
      },
    ],

    // Galeri: type 'photo' atau 'video'. date dipakai untuk cap tanggal ala digicam.
    gallery: [
      { type: 'photo', src: U('photo-1519741497674-611481863552'), alt: 'Momen berdua', date: '2026-10-04', ratio: '4/5' },
      { type: 'photo', src: U('photo-1511285560929-80b456fea0bc'), alt: 'Tertawa bersama', date: '2026-10-04', ratio: '3/4' },
      { type: 'video', src: 'https://assets.mixkit.co/videos/5217/5217-720.mp4', poster: U('photo-1606216794074-735e91aa2c92'), alt: 'Cuplikan prewedding', date: '2026-10-05', ratio: '9/16' },
      { type: 'photo', src: U('photo-1522673607200-164d1b6ce486'), alt: 'Genggaman tangan', date: '2026-10-05', ratio: '1/1' },
      { type: 'photo', src: U('photo-1537633552985-df8429e8048b'), alt: 'Golden hour', date: '2026-10-05', ratio: '3/4' },
      { type: 'photo', src: U('photo-1583939003579-730e3918a45a'), alt: 'Cincin', date: '2024-06-15', ratio: '4/5' },
      { type: 'photo', src: U('photo-1591604466107-ec97de577aff'), alt: 'Jalan sore', date: '2026-10-04', ratio: '2/3' },
      { type: 'photo', src: U('photo-1520854221256-17451cc331bf'), alt: 'Detail', date: '2026-10-04', ratio: '1/1' },
      { type: 'photo', src: U('photo-1465495976277-4387d4b0b4c6'), alt: 'Bunga', date: '2026-10-05', ratio: '4/5' },
      { type: 'photo', src: U('photo-1469371670807-013ccf25f16a'), alt: 'Senyum', date: '2026-10-05', ratio: '3/4' },
      { type: 'photo', src: U('photo-1532712938310-34cb3982ef74'), alt: 'Bersama', date: '2026-10-04', ratio: '4/5' },
      { type: 'photo', src: U('photo-1606800052052-a08af7148866'), alt: 'Sore di taman', date: '2026-10-05', ratio: '2/3' },
    ],

    rsvp: {
      // Opsional: URL Google Apps Script (lihat tools/google-apps-script.gs & README)
      // agar RSVP & ucapan tersimpan di Google Sheets dan terlihat semua tamu.
      endpoint: '',
      // Nomor WhatsApp untuk konfirmasi (format internasional tanpa +)
      whatsapp: '6281234567890',
      maxGuests: 4,
      deadline: '2026-12-01',
    },

    // Ucapan contoh supaya dinding ucapan tidak kosong (hapus kalau sudah live)
    wishesSeed: [
      { name: 'Nadia & Fikri', attend: 'hadir', message: 'Akhirnyaaa! Selamat ya kalian berdua, semoga sakinah mawaddah warahmah. See you di Kemang!', time: '2026-09-20T19:12:00+07:00' },
      { name: 'Tante Wulan', attend: 'hadir', message: 'Barakallahu lakuma wa baraka alaikuma. Semoga menjadi keluarga yang penuh berkah.', time: '2026-09-19T08:40:00+07:00' },
      { name: 'Raka (tim BEM 2019)', attend: 'ragu', message: 'Saksi hidup kasus charger itu. Bangga banget sama kalian. Doain bisa cuti ya!', time: '2026-09-18T22:05:00+07:00' },
      { name: 'Sekar', attend: 'tidak', message: 'Maaf belum bisa datang karena lagi di luar kota. Doa terbaik dari jauh, love you both!', time: '2026-09-17T12:30:00+07:00' },
    ],

    gifts: {
      note: 'Doa restu kalian sudah lebih dari cukup. Kalau ingin memberi tanda kasih, bisa lewat amplop digital di bawah ini.',
      accounts: [
        { bank: 'BCA', number: '1234567890', name: 'Alya Putri Rahmadani' },
        { bank: 'Mandiri', number: '1370012345678', name: 'Dimas Arya Pratama' },
      ],
      address: {
        label: 'Kirim kado fisik',
        name: 'Alya & Dimas',
        text: 'Jl. Kenanga No. 21, Cilandak, Jakarta Selatan 12430',
      },
    },

    closing: {
      text: 'Merupakan suatu kebahagiaan dan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.',
    },
  };
})();
