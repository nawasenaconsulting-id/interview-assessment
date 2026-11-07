
export const reviewerIds = ['alfian', 'dekki', 'raka'];

export const reviewerNames = {
  alfian: 'Alfian Nugraha',
  dekki: 'Dekki Yehuda',
  raka: 'Raka Vishnu Adikrisnha'
};

export const criteria = [
  'Pendidikan formal',
  'Pengalaman Kerja',
  'Pengatuhan teknis',
  'Ketrampilan teknis',
  'Motivasi (extra effort)',
  'Kerjasama (team work)',
  'Etika (sopan santun)',
  'Kemampuan komunikasi',
  'Kemampuan Memimpin *)'
];

export const scale = {
  1: 'Kurang',
  2: 'Cukup',
  3: 'Baik',
  4: 'Sangat Baik'
};

export const emptyAssessment = () => ({
  scores: Array(9).fill(null),
  comment: '',
  recommendation: '',
  signature: '',
  signedAt: '',
  completed: false,
  updatedAt: ''
});

// =====================================================
// REKAPITULASI NILAI MAYORITAS
// =====================================================

export function resultFor(
  i,
  assessments,
  decision,
  approvals
) {
  const votes = reviewerIds.map(
    id => assessments[id]?.scores?.[i] ?? null
  );

  const counts = {};

  votes.forEach(v => {
    if (
      Number.isInteger(v) &&
      v >= 1 &&
      v <= 4
    ) {
      counts[v] = (counts[v] || 0) + 1;
    }
  });

  const winner = Object.keys(counts).find(
    v => counts[v] >= 2
  );

  // Tetap memerlukan keputusan bersama apabila
  // tidak terdapat nilai mayoritas 2 dari 3.
  const confirmed =
    decision &&
    reviewerIds.every(
      id =>
        approvals[id]?.proposalId ===
        decision.proposalId
    );

  const final =
    winner !== undefined
      ? Number(winner)
      : confirmed
        ? Number(decision.value)
        : null;

  const status =
    winner !== undefined
      ? 'Mayoritas'
      : votes.some(v => v === null)
        ? 'Menunggu penilaian'
        : confirmed
          ? 'Disetujui bersama'
          : decision
            ? 'Menunggu konfirmasi'
            : 'Tidak Ada Mayoritas';

  return {
    votes,
    counts,
    final,
    status
  };
}

// =====================================================
// HASIL SELURUH KRITERIA
// =====================================================

export function allResults(
  assessments,
  decisions = {},
  decisionApprovals = {}
) {
  return criteria.map((name, i) => ({
    name,
    i,
    ...resultFor(
      i,
      assessments,
      decisions[i],
      decisionApprovals[i] || {}
    )
  }));
}

// =====================================================
// KOMPATIBILITAS VERSI LAMA
// =====================================================

// Fungsi dipertahankan untuk kompatibilitas
// dengan file lain yang masih melakukan import.
// Tidak digunakan sebagai syarat finalisasi baru.
export function summaryConfirmed(
  summary,
  approvals
) {
  return (
    !!summary?.versionId &&
    reviewerIds.every(
      id =>
        approvals?.[id]?.versionId ===
        summary.versionId
    )
  );
}

// =====================================================
// VALIDASI FINALISASI WAWANCARA 2
// =====================================================

export function checks(
  assessments,
  decisions,
  decisionApprovals,
  summary,
  summaryApprovals
) {
  const issues = [];

  // 1. Ketiga pewawancara harus Simpan & Kunci.
  for (const id of reviewerIds) {
    const a = assessments[id];

    if (!a?.completed) {
      issues.push(
        `${reviewerNames[id]} belum menyelesaikan penilaian`
      );
    }

    if (!a?.signature) {
      issues.push(
        `${reviewerNames[id]} belum menandatangani`
      );
    }

    if (!a?.recommendation) {
      issues.push(
        `${reviewerNames[id]} belum memberikan rekomendasi`
      );
    }

    if (!a?.comment?.trim()) {
      issues.push(
        `${reviewerNames[id]} belum menulis komentar`
      );
    }

    for (let i = 0; i < 9; i++) {
      if (![1, 2, 3, 4].includes(a?.scores?.[i])) {
        issues.push(
          `${reviewerNames[id]}: kriteria ${i + 1} kosong`
        );
      }
    }
  }

  // 2. Seluruh skor harus memiliki nilai final.
  // Jika tidak ada mayoritas, keputusan bersama
  // harus mendapat persetujuan yang diperlukan.
  for (
    const r of allResults(
      assessments,
      decisions,
      decisionApprovals
    )
  ) {
    if (r.final === null) {
      issues.push(
        `Kriteria ${r.i + 1}: ${r.status}`
      );
    }
  }

  // 3. Kesimpulan Kami harus sudah dipublikasikan.
  if (
    !summary?.versionId ||
    !summary?.summary?.trim()
  ) {
    issues.push('Kesimpulan Kami belum disusun');
  }

  // 4. Rekomendasi Wawancara 2 harus dipilih.
  if (
    ![
      'DITERIMA',
      'DIPERTIMBANGKAN',
      'DITOLAK'
    ].includes(summary?.recommendation)
  ) {
    issues.push(
      'Rekomendasi Kami belum dipilih'
    );
  }

  // 5. Tidak ada lagi kewajiban persetujuan
  //    Kesimpulan Kami oleh tiga pewawancara.
  //
  //    Simpan & Kunci = penilaian individual selesai.
  //
  //    Otorisasi penggunaan tanda tangan Alfian
  //    tetap diperiksa oleh app.js dan worker.js.

  return issues;
}
