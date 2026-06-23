import { kpiYearData, KpiItem, MonthlyAchievementGroup, MonthType, MONTHS_LIST } from './types';

export const INITIAL_MOCK_KPIS: KpiItem[] = [
  {
    id: 'kpi-1',
    noKpi: 'KPI 1',
    komponen: 'Proses Dalam Organisasi',
    noSsp: 'Teras 3-Kecekepan Operasi',
    bidangUtama: 'Kawalselia Teknikal',
    bahagian: ['BAHAGIAN TEKNIKAL', 'BAHAGIAN OPERASI'],
    objektif: 'Memastikan Kualiti Air Terawat Mematuhi Piawaian Kebangsaan',
    kpi: 'PERATUSAN PEMATUHIAN KUALITI AIR TERAWAT KEPADA STANDARD KEMENTERIAN KESIHATAN MALAYSIA',
    inisiatif: 'Melaksanakan Pemantauan Berkala Dan Pengauditan Loji Rawatan Air',
    pengukuran: 'Bilangan Loji Yang Memenuhi Standard Dibahagikan Sejumlah Loji',
    statusPencapaianTahunSebelum: 'Mencapai Kadar Pematuhan 98.5% Pada Tahun 2025',
    sasaran1: 99.0,
    justifikasiSasaran1: 'Peningkatan Kerjasama Bersepadu Bersama Operator Negeri',
    sasaran2: 99.2,
    justifikasiSasaran2: 'Sistem Pemantauan Automatik Masa Nyata LRA',
    sasaran3: 99.5,
    justifikasiSasaran3: 'Penguatkuasaan Akta 655 Secara Menyeluruh Dan Tegas',
    sasaran4: 99.8,
    justifikasiSasaran4: 'Pencapaian Standard LRA Penanda Aras Kelas Dunia',
    sasaranAkhir: 99.5,
    pemberat: 30.0
  },
  {
    id: 'kpi-2',
    noKpi: 'KPI 2',
    komponen: 'Kewangan',
    noSsp: 'Teras 1- Kemampanan Kewangan',
    bidangUtama: 'Kawalselia Ekonomi',
    bahagian: ['BAHAGIAN EKONOMI', 'BAHAGIAN PERANCANGAN STRATEGIK DAN TRANSFORMASI'],
    objektif: 'Mengoptimumkan Struktur Tarif Air Bagi Menjamin Kelestarian Operator',
    kpi: 'BILANGAN NEGERI YANG MELAKSANAKAN PENYELARASAN TARIF AIR BAHARU DI BAWAH TSM',
    inisiatif: 'Rundingan Dan Kajian Impak Sosioekonomi Bersama Kerajaan Negeri',
    pengukuran: 'Bilangan Negeri Yang Diluluskan Pewartaan Tarif Baharu Melalui TSM',
    statusPencapaianTahunSebelum: 'Empat Negeri Telah Berjaya Melaksanakan Pewartaan Tarif',
    sasaran1: 5.0,
    justifikasiSasaran1: 'Pelaksanaan Pelan Tindakan TSM Fasa Kedua',
    sasaran2: 6.0,
    justifikasiSasaran2: 'Penyertaan Operator Pantai Timur Dalam Rangka Kerja Tarif',
    sasaran3: 8.0,
    justifikasiSasaran3: 'Penyelarasan Tarif Komprehensif Di Seluruh Semenanjung & Labuan',
    sasaran4: 10.0,
    justifikasiSasaran4: 'Penetapan Tarif Air Lestari Secara Menyeluruh Seluruh Negara',
    sasaranAkhir: 80.0,
    pemberat: 25.0
  },
  {
    id: 'kpi-3',
    noKpi: 'KPI 3',
    komponen: 'Pengurusan Pemegang Taruh',
    noSsp: 'Teras 2-Kemampanan Industri',
    bidangUtama: 'Perlindungan Pengguna',
    bahagian: ['BAHAGIAN KWSMP', 'BAHAGIAN KHIDMAT SOKONGAN'],
    objektif: 'Meningkatkan Kecekapan Saluran Aduan Dan Kepuasan Pengguna Air',
    kpi: 'PERATUS RESOLUSI ADUAN PENGGUNA BERKAITAN BEKALAN AIR DALAM TEMPOH 24 JAM',
    inisiatif: 'Menaiktaraf Platform Integrated Complaints Management System (ICMS)',
    pengukuran: 'Aduan Selesai Bawah 24 Jam Dibahagi Keseluruhan Aduan Bekalan Air',
    statusPencapaianTahunSebelum: 'Kadar Resolusi Berada Pada Tahap Purata 84.5%',
    sasaran1: 88.0,
    justifikasiSasaran1: 'Latihan Dan Kompetensi Kakitangan Kaunter Khidmat Pelanggan',
    sasaran2: 90.0,
    justifikasiSasaran2: 'Integrasi API Portal ICMS Bersama Media Sosial Dan WhatsApp',
    sasaran3: 92.0,
    justifikasiSasaran3: 'Penggunaan Kecerdasan Buatan (AI) Untuk Pengagihan Tiket Aduan',
    sasaran4: 95.0,
    justifikasiSasaran4: 'Sistem Respons Dan Penyelesaian Isu Krisis Bekalan Air 24/7',
    sasaranAkhir: 92.0,
    pemberat: 25.0
  },
  {
    id: 'kpi-4',
    noKpi: 'KPI 4',
    komponen: 'Pembelajaran & Pertumbuhan Organisasi',
    noSsp: 'Teras 4-Pemerkasaan Tadbir Urus',
    bidangUtama: 'Pengurusan & Tadbir Urus',
    bahagian: ['BAHAGIAN SUMBER MANUSIA', 'BAHAGIAN INTEGRITI DAN PENGURUSAN RISIKO'],
    objektif: 'Memperkasakan Integriti Dan Kompetensi Teknikal Kakitangan SPAN',
    kpi: 'PURATA JAM LATIHAN STRATEGIK DAN PENINGKATAN TEKNIKAL BAGI SETIAP KAKITANGAN',
    inisiatif: 'Program Kerjasama Akademi Air SPAN Dan Badan Profesional Antarabangsa',
    pengukuran: 'Jumlah Keseluruhan Jam Latihan Dibahagikan Bilangan Kakitangan Tetap',
    statusPencapaianTahunSebelum: 'Purata Jam Latihan Setahun Adalah 31.8 Jam Bagi Setiap Kakitangan',
    sasaran1: 34.0,
    justifikasiSasaran1: 'Pembangunan Pelan Latihan Bersepadu Berpusatkan Kemahiran Baru',
    sasaran2: 36.0,
    justifikasiSasaran2: 'Program Pensijilan Rasmi ISO 37001 Sistem Pengurusan Anti Rasuah',
    sasaran3: 40.0,
    justifikasiSasaran3: 'Krusial Untuk Standard Akreditasi Dan Tadbir Urus Korporat Cemerlang',
    sasaran4: 45.0,
    justifikasiSasaran4: 'Pensijilan Kompetensi Tahap Pakar Sektor Air Peringkat Global',
    sasaranAkhir: 40.0,
    pemberat: 20.0
  }
];

export function generateInitialAchievements(kpis: KpiItem[]): Record<MonthType, MonthlyAchievementGroup> {
  const result = {} as Record<MonthType, MonthlyAchievementGroup>;

  // Monthly values for simulation (Jan, Feb, Mar)
  const mockMonthlyData: Record<string, Record<string, { pencapaian: number; status: string }>> = {
    JANUARY: {
      'KPI 1': { pencapaian: 98.9, status: 'Memuaskan, masih dalam fasa pemantauan loji rawatan air fasa awal.' },
      'KPI 2': { pencapaian: 4.0, status: 'Warta tarif untuk negeri pertama berjaya dilaksanakan.' },
      'KPI 3': { pencapaian: 86.2, status: 'Mengalami peningkatan aduan bermusim, sistem ICMS baru diselaraskan.' },
      'KPI 4': { pencapaian: 8.5, status: 'Program onboarding kakitangan baru dan taklimat integriti suku pertama.' }
    },
    FEBRUARY: {
      'KPI 1': { pencapaian: 99.1, status: 'Peningkatan pematuhan susulan pengauditan LRA di 3 zon operator.' },
      'KPI 2': { pencapaian: 5.0, status: 'Penyelarasan tarif negeri kedua sedia diluluskan oleh kementerian.' },
      'KPI 3': { pencapaian: 89.0, status: 'Respons aduan dipertingkatkan melalui chatbot ujian rintis.' },
      'KPI 4': { pencapaian: 15.0, status: 'Latihan teknikal bersama IWA (International Water Association) bermula.' }
    },
    MARCH: {
      'KPI 1': { pencapaian: 99.4, status: 'Hampir mencapai sasaran 3 (99.5%) ekoran audit tapak yang agresif.' },
      'KPI 2': { pencapaian: 6.0, status: 'Dua lagi negeri pantai timur sedang memuktamadkan model struktur tarif air.' },
      'KPI 3': { pencapaian: 91.5, status: 'Saluran WhatsApp rasasaran berjaya menyumbang penyelesaian aduan pantas.' },
      'KPI 4': { pencapaian: 22.0, status: 'Kursus ISO 37001 bermula secara komprehensif untuk pengurusan tinggi.' }
    }
  };

  MONTHS_LIST.forEach((m) => {
    const isMocked = m === 'JANUARY' || m === 'FEBRUARY' || m === 'MARCH';
    const monthData = mockMonthlyData[m] || {};

    const achievements: Record<string, any> = {};

    kpis.forEach((kpi) => {
      const defaultValue = isMocked ? monthData[kpi.noKpi]?.pencapaian || 0 : 0;
      const defaultStatus = isMocked ? monthData[kpi.noKpi]?.status || 'Dalam Proses' : 'Tiada Data';
      
      const p = defaultValue;
      const s3 = kpi.sasaran3 || 1;
      
      // Calculate percentages
      const persenPencapaian = Number(((p / s3) * 100).toFixed(1));
      const persenPemberat = kpi.pemberat;
      const persenPencapaianSebenar = Number(((persenPencapaian * persenPemberat) / 100).toFixed(1));

      achievements[kpi.noKpi] = {
        noKpi: kpi.noKpi,
        pencapaian: p,
        persenPencapaian,
        persenPemberat,
        persenPencapaianSebenar,
        statusPencapaian: defaultStatus,
        dokumenSokongan: isMocked ? {
          name: `Sijil_LaporanPencapaian_${kpi.noKpi}_${m}.pdf`,
          size: 1542000,
          type: 'application/pdf'
        } : null
      };
    });

    result[m] = {
      month: m,
      isEdited: isMocked,
      achievements
    };
  });

  return result;
}

export const getInitialYearData = (): Record<number, kpiYearData> => {
  return {
    2026: {
      year: 2026,
      isSubmitted: true,
      kpis: INITIAL_MOCK_KPIS,
      monthlyAchievements: generateInitialAchievements(INITIAL_MOCK_KPIS)
    }
  };
};
