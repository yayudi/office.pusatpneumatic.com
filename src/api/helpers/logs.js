// logs.js
/*
  Normalisasi log harian (raw days -> log object)
*/
export function normalizeLogs(days, year, month) {
  if (!Array.isArray(days)) {
    console.warn("normalizeLogs: input bukan array", days);
    return [];
  }

  return days.map((info, index) => {
    const tanggal = index + 1;

    if (typeof info === "number") {
      return {
        tanggal,
        jamMasuk: null,
        jamKeluar: null,
        breaks: [],
        isEmpty: true,
        holiday: info === 2,
        status: info
      };
    }

    const logs = info.l || [];
    let jamMasuk = null;
    let jamKeluar = null;
    const breaks = [];

    logs.forEach((l, idx) => {
      const [time, type] = l;
      if (type === 0 && !jamMasuk) jamMasuk = time; // IN
      if (type === 1) jamKeluar = time;             // OUT

      // break detection
      if (idx < logs.length - 1) {
        const [nextTime, nextType] = logs[idx + 1];
        if (type === 2 && nextType === 3) {
          const durasi = nextTime - time;
          if (durasi > 0) breaks.push(durasi);
        }
      }
    });

    return {
      tanggal,
      jamMasuk,
      jamKeluar,
      breaks,
      isEmpty: !jamMasuk && !jamKeluar,
      holiday: info.s === 2,
      status: info.s
    };
  });
}
