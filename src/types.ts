/**
 * TYPES FOR E-KPI SPAN SYSTEMS
 * SPAN: Suruhanjaya Perkhidmatan Air Negara
 */

export type KomponenType =
  | 'Kewangan'
  | 'Pengurusan Pemegang Taruh'
  | 'Proses Dalam Organisasi'
  | 'Pembelajaran & Pertumbuhan Organisasi';

export type TerasSspType =
  | 'Teras 1- Kemampanan Kewangan'
  | 'Teras 2-Kemampanan Industri'
  | 'Teras 3-Kecekepan Operasi'
  | 'Teras 4-Pemerkasaan Tadbir Urus';

export type BidangUtamaType =
  | 'Kawalselia Ekonomi'
  | 'Kawalselia Teknikal'
  | 'Sosial'
  | 'Perlindungan Pengguna'
  | 'Pengurusan & Tadbir Urus';

export type BahagianType =
  | 'BAHAGIAN TEKNIKAL'
  | 'BAHAGIAN OPERASI'
  | 'BAHAGIAN EKONOMI'
  | 'BAHAGIAN KWSMP'
  | 'BAHAGIAN KHIDMAT PERUNDANGAN'
  | 'BAHAGIAN KHIDMAT PENGURUSAN'
  | 'BAHAGIAN SUMBER MANUSIA'
  | 'BAHAGIAN KHIDMAT SOKONGAN'
  | 'BAHAGIAN KELESTARIAN & INOVASI'
  | 'BAHAGIAN PERANCANGAN STRATEGIK DAN TRANSFORMASI'
  | 'BAHAGIAN AUDIT DALAM'
  | 'BAHAGIAN INTEGRITI DAN PENGURUSAN RISIKO';

export interface KpiItem {
  id: string;
  noKpi: string; // e.g., "KPI 1"
  komponen: KomponenType;
  noSsp: TerasSspType;
  bidangUtama: BidangUtamaType;
  bahagian: BahagianType[]; // Shared division list
  objektif: string; // capitalize each word
  kpi: string; // uppercase
  inisiatif: string; // capitalize each word
  pengukuran: string; // capitalize each word
  statusPencapaianTahunSebelum: string; // capitalize each word
  sasaran1: number;
  justifikasiSasaran1: string;
  sasaran2: number;
  justifikasiSasaran2: string;
  sasaran3: number;
  justifikasiSasaran3: string;
  sasaran4: number;
  justifikasiSasaran4: string;
  sasaranAkhir: number; // percentage
  pemberat: number; // percentage
}

export interface DocumentAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // simulation of uploaded file content
}

export interface AchievementItem {
  noKpi: string;
  pencapaian: number; // filled by user
  persenPencapaian: number; // (pencapaian / sasaran3) * 100
  persenPemberat: number; // locked from Kerangka
  persenPencapaianSebenar: number; // (persenPencapaian * persenPemberat) / 100
  statusPencapaian: string; // filled by user
  dokumenSokongan: DocumentAttachment | null;
}

export type MonthType =
  | 'JANUARY'
  | 'FEBRUARY'
  | 'MARCH'
  | 'APRIL'
  | 'MAY'
  | 'JUNE'
  | 'JULY'
  | 'AUGUST'
  | 'SEPTEMBER'
  | 'OCTOBER'
  | 'NOVEMBER'
  | 'DECEMBER';

export interface MonthlyAchievementGroup {
  month: MonthType;
  isEdited: boolean;
  achievements: Record<string, AchievementItem>; // noKpi -> AchievementItem
}

export interface kpiYearData {
  year: number;
  isSubmitted: boolean;
  kpis: KpiItem[];
  monthlyAchievements: Record<MonthType, MonthlyAchievementGroup>;
}

// System Constant Arrays
export const KOMPONEN_OPTIONS: KomponenType[] = [
  'Kewangan',
  'Pengurusan Pemegang Taruh',
  'Proses Dalam Organisasi',
  'Pembelajaran & Pertumbuhan Organisasi'
];

export const TERAS_SSP_OPTIONS: TerasSspType[] = [
  'Teras 1- Kemampanan Kewangan',
  'Teras 2-Kemampanan Industri',
  'Teras 3-Kecekepan Operasi',
  'Teras 4-Pemerkasaan Tadbir Urus'
];

export const BIDANG_UTAMA_OPTIONS: BidangUtamaType[] = [
  'Kawalselia Ekonomi',
  'Kawalselia Teknikal',
  'Sosial',
  'Perlindungan Pengguna',
  'Pengurusan & Tadbir Urus'
];

export const BAHAGIAN_OPTIONS: BahagianType[] = [
  'BAHAGIAN TEKNIKAL',
  'BAHAGIAN OPERASI',
  'BAHAGIAN EKONOMI',
  'BAHAGIAN KWSMP',
  'BAHAGIAN KHIDMAT PERUNDANGAN',
  'BAHAGIAN KHIDMAT PENGURUSAN',
  'BAHAGIAN SUMBER MANUSIA',
  'BAHAGIAN KHIDMAT SOKONGAN',
  'BAHAGIAN KELESTARIAN & INOVASI',
  'BAHAGIAN PERANCANGAN STRATEGIK DAN TRANSFORMASI',
  'BAHAGIAN AUDIT DALAM',
  'BAHAGIAN INTEGRITI DAN PENGURUSAN RISIKO'
];

export const MONTHS_LIST: MonthType[] = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER'
];
