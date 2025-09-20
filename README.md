# office.pusatpneumatic.com

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

"y":2025,"m":8 → artinya data untuk Agustus 2025.

"i":{"m":11880,"k":26,"l":5}

m kemungkinan jam kerja ideal/bulan (11880 menit = 198 jam → 26 hari kerja x 7,6 jam/hari).

k:26 jumlah hari kerja.

l:5 jumlah libur.

"u":[...] → ini daftar user/karyawan.

"i":6,"n":"Robi" → ID 6, nama Robi.

"d":[...] → daftar hari-hari dalam sebulan. Bisa angka (kayak 2, 1) atau object dengan "l":[...].

"l":[[465,0],[691,2],[1055,1]] → ini list log jam. Formatnya [waktu, kode].

465 = menit ke-465 dari jam 0:00 (465/60 = jam 7:45).

Angka belakang (0,1,2,3) kayaknya kode status: masuk, pulang, istirahat, lembur.

Jadi [[465,0],[691,2],[1055,1]] bisa dibaca: masuk jam 07:45 (status 0), istirahat jam 11:31 (status 2), pulang jam 17:35 (status 1).

"s":0 → status harian (0 = hadir normal, 1 = cuti, 2 = izin, 3 = bolos).

"r":[24,1,5,1,0] → rekap bulanan orang itu: hadir 24x, cuti 1, izin 5, bolos 1, lembur 0.

📌 Status Harian (day["s"])
Kode	Enum	Arti
0	STATUS_H	Hadir penuh (in+out lengkap)
1	STATUS_A	Absen (hari kerja tanpa log)
2	STATUS_L	Libur (Minggu/libur nasional)
3	STATUS_MT	Data tidak lengkap (in/out miss)

📌 Ringkasan Bulanan (summary / r)
Index	Arti
0	Jumlah hari hadir penuh (H)
1	Jumlah hari absen (A)
2	Jumlah hari libur (L)
3	Jumlah hari data tidak lengkap (MT)
4	Jumlah hari hadir + libur (H+L, masuk saat libur)

📌 Log Harian (day["l"])

Format: [menit, kode]

Kode	Enum	Arti
0	LOG_IN	Masuk (07:00–10:00)
1	LOG_OUT	Pulang (>=16:00 / >=14:00 Sabtu)
2	LOG_BREAK_IN	Mulai istirahat
3	LOG_BREAK_OUT	Selesai istirahat