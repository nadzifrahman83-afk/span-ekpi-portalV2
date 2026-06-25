import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  LayoutDashboard,
  ClipboardList,
  Award,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  User,
  X,
  ChevronRight,
  Filter,
  Check,
  Edit2,
  Lock,
  Unlock,
  Search,
  BookOpen,
  Building2,
  Share2,
  RefreshCw,
  FileCheck,
  CircleAlert,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import {
  KpiItem,
  AchievementItem,
  MonthType,
  kpiYearData,
  KOMPONEN_OPTIONS,
  TERAS_SSP_OPTIONS,
  BIDANG_UTAMA_OPTIONS,
  BAHAGIAN_OPTIONS,
  MONTHS_LIST,
  KomponenType,
  TerasSspType,
  BidangUtamaType,
  BahagianType,
  DocumentAttachment
} from './types';
import { getInitialYearData, generateInitialAchievements, INITIAL_MOCK_KPIS } from './mockData';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  googleSheetsSignIn,
  googleSheetsSignOut,
  getCachedToken,
  setCachedToken,
  extractSpreadsheetId,
  loadKpiDataFromSheet,
  SheetRow
} from './googleSheets';

// Helper function to capitalize each word
function handleCapitalizeEachWord(text: string): string {
  if (!text) return '';
  return text
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Capitalize the first letter and keep the rest lower-case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Utility to convert to uppercase
function handleUppercase(text: string): string {
  return text ? text.toUpperCase() : '';
}

// Utility to get current month as MonthType
function getCurrentMonth(): MonthType {
  const monthIdx = new Date().getMonth(); // 0 - 11
  const months: MonthType[] = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  return months[monthIdx];
}

export default function App() {
  // State Initialization
  const [yearRecords, setYearRecords] = useState<Record<number, kpiYearData>>(() => {
    try {
      const saved = localStorage.getItem('span_ekpi_records_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Gagal membaca data daripada localStorage, memuatkan data templat.', e);
    }
    return getInitialYearData();
  });

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<MonthType>(getCurrentMonth());
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LAPORAN' | 'KERANGKA' | 'PENCAPAIAN'>('DASHBOARD');

  // Doughnut chart hover interactions
  const [isDoughnutHovered, setIsDoughnutHovered] = useState(false);
  const [hoveredKpiId, setHoveredKpiId] = useState<string | null>(null);

  // Trend chart hover interaction
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<{ month: string; value: number; x: number; y: number } | null>(null);

  // Bar chart hover interaction
  const [hoveredBarKpi, setHoveredBarKpi] = useState<{
    id: string;
    noKpi: string;
    kpiText: string;
    pencapaian: number;
    target: number;
    unit: string;
    persen: number;
    pemberat: number;
    x: number;
    y: number;
  } | null>(null);

  // Year Selection Modal state
  const [isKpiYearOpen, setIsKpiYearOpen] = useState(false);
  const [yearInputVal, setYearInputVal] = useState<number>(2026);

  // Kerangka ADD KPI form state
  const [isAddKpiOpen, setIsAddKpiOpen] = useState(false);
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  // Pop up details state for specific KPI click
  const [selectedKpiForModal, setSelectedKpiForModal] = useState<KpiItem | null>(null);
  const [hoveredModalTrendPoint, setHoveredModalTrendPoint] = useState<{ month: MonthType; value: number; x: number; y: number } | null>(null);

  // Search filter for Dashboard/Kerangka
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKomponen, setFilterKomponen] = useState<string>('SEMUA');

  // Form State for Adding KPI
  const [formKomponen, setFormKomponen] = useState<KomponenType>('Kewangan');
  const [formTerasSsp, setFormTerasSsp] = useState<TerasSspType>('Teras 1- Kemampanan Kewangan');
  const [formBidangUtama, setFormBidangUtama] = useState<BidangUtamaType>('Kawalselia Ekonomi');
  const [formBahagianList, setFormBahagianList] = useState<BahagianType[]>([]);
  const [formSelectedBahagianToAdd, setFormSelectedBahagianToAdd] = useState<BahagianType>('BAHAGIAN TEKNIKAL');
  
  const [formObjektif, setFormObjektif] = useState('');
  const [formKpiText, setFormKpiText] = useState('');
  const [formInisiatif, setFormInisiatif] = useState('');
  const [formPengukuran, setFormPengukuran] = useState('');
  const [formStatusSebelum, setFormStatusSebelum] = useState('');
  
  const [formSasaran1, setFormSasaran1] = useState<number>(0);
  const [formJustifikasi1, setFormJustifikasi1] = useState('');
  const [formSasaran2, setFormSasaran2] = useState<number>(0);
  const [formJustifikasi2, setFormJustifikasi2] = useState('');
  const [formSasaran3, setFormSasaran3] = useState<number>(0);
  const [formJustifikasi3, setFormJustifikasi3] = useState('');
  const [formSasaran4, setFormSasaran4] = useState<number>(0);
  const [formJustifikasi4, setFormJustifikasi4] = useState('');
  
  const [formSasaranAkhir, setFormSasaranAkhir] = useState<number>(0);
  const [formPemberat, setFormPemberat] = useState<number>(10);

  // Achievement editor state
  const [editingAchievementKpiNo, setEditingAchievementKpiNo] = useState<string | null>(null);
  const [achInputPencapaian, setAchInputPencapaian] = useState<number>(0);
  const [achInputStatus, setAchInputStatus] = useState('');
  const [achInputFile, setAchInputFile] = useState<DocumentAttachment | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'ref' | 'error' } | null>(null);

  // Firebase loading status
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  // Sidebar visibility state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('span_ekpi_sidebar_open');
    return saved !== 'false'; // default true
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const newVal = !prev;
      localStorage.setItem('span_ekpi_sidebar_open', String(newVal));
      return newVal;
    });
  };

  // Google Sheets Integration State
  const [sheetsUser, setSheetsUser] = useState<FirebaseUser | null>(null);
  const [sheetsAccessToken, setSheetsAccessToken] = useState<string | null>(() => getCachedToken());
  const [isSyncingWithSheets, setIsSyncingWithSheets] = useState(false);
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState<string>(() => {
    return localStorage.getItem('span_ekpi_sheets_id') || '';
  });
  const [sheetRangeInput, setSheetRangeInput] = useState<string>('');

  // Persist Spreadsheet ID
  useEffect(() => {
    if (spreadsheetIdInput !== undefined) {
      localStorage.setItem('span_ekpi_sheets_id', spreadsheetIdInput);
    }
  }, [spreadsheetIdInput]);

  // Set default sheet tab range based on selected month
  useEffect(() => {
    setSheetRangeInput(`${selectedMonth}!A1:C50`);
  }, [selectedMonth]);

  // Monitor Auth state for Google Sheets
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSheetsUser(user);
      if (!user) {
        setSheetsAccessToken(null);
        setCachedToken(null);
      } else {
        // Recover token if already cached in memory
        setSheetsAccessToken(getCachedToken());
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for Firestore synchronized state
  useEffect(() => {
    const colRef = collection(db, 'yearRecords');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        // Seed initial mock data if remote collection is empty
        const initialData = getInitialYearData();
        Object.entries(initialData).forEach(async ([yearStr, val]) => {
          try {
            await setDoc(doc(db, 'yearRecords', yearStr), val);
          } catch (e) {
            console.error('Gagal memasukkan data pemula ke Firestore:', e);
          }
        });
      } else {
        const records: Record<number, kpiYearData> = {};
        snapshot.forEach((dDoc) => {
          const data = dDoc.data() as kpiYearData;
          records[data.year] = data;
        });
        setYearRecords(records);
      }
      setIsFirebaseLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'yearRecords');
      setIsFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Persist State to LocalStorage
  useEffect(() => {
    localStorage.setItem('span_ekpi_records_v1', JSON.stringify(yearRecords));
  }, [yearRecords]);

  // Show customized Toast feedback
  const showToast = (message: string, type: 'success' | 'ref' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Helper to ensure a Year object exists
  const ensureYearExists = async (yr: number) => {
    if (!yearRecords[yr]) {
      const newYearObj: kpiYearData = {
        year: yr,
        isSubmitted: false,
        kpis: [],
        monthlyAchievements: generateInitialAchievements([])
      };
      try {
        await setDoc(doc(db, 'yearRecords', String(yr)), newYearObj);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `yearRecords/${yr}`);
      }
    }
  };

  const currentYearData = yearRecords[selectedYear] || {
    year: selectedYear,
    isSubmitted: false,
    kpis: [],
    monthlyAchievements: generateInitialAchievements([])
  };

  // KPI Calculations
  const totalPemberat = currentYearData.kpis.reduce((sum, item) => sum + item.pemberat, 0);
  
  // % SASARAN AKHIR total sum must divide by number of KPIs
  const kpiCount = currentYearData.kpis.length;
  const purataSasaranAkhir = kpiCount > 0 
    ? Number((currentYearData.kpis.reduce((sum, item) => sum + item.sasaranAkhir, 0) / kpiCount).toFixed(1))
    : 0.0;

  // Set selected Year
  const handleSetKpiYear = () => {
    const yr = Number(yearInputVal);
    if (!yr || yr < 2000 || yr > 2100) {
      showToast('Sila masukkan tahun yang sahih antara 2000 dan 2100', 'error');
      return;
    }
    ensureYearExists(yr);
    setSelectedYear(yr);
    setIsKpiYearOpen(false);
    showToast(`Tahun KPI berjaya ditetapkan ke ${yr}`, 'success');
  };

  // Add Division to form list
  const addBahagianToForm = () => {
    if (!formBahagianList.includes(formSelectedBahagianToAdd)) {
      setFormBahagianList(prev => [...prev, formSelectedBahagianToAdd]);
      showToast(`Bahagian "${formSelectedBahagianToAdd}" ditambah sebagai pelaksana kongsi`, 'success');
    } else {
      showToast('Bahagian ini telah wujud dalam senarai', 'error');
    }
  };

  // Remove Division from form list
  const removeBahagianFromForm = (b: BahagianType) => {
    setFormBahagianList(prev => prev.filter(x => x !== b));
  };

  // Save/Done KPI Creation Form
  const handleDoneKpi = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formObjektif.trim() || !formKpiText.trim()) {
      showToast('Semua medan penerangan wajib diisi sebelum menyimpan', 'error');
      return;
    }

    if (formBahagianList.length === 0) {
      showToast('Sila nyatakan sekurang-kurangnya SATU (1) Bahagian pemilik KPI', 'error');
      return;
    }

    let updatedKpis: KpiItem[];
    let noKpiStr = '';
    const updatedMonthlyAchievements = { ...currentYearData.monthlyAchievements };

    if (editingKpiId) {
      const existingKpi = currentYearData.kpis.find(k => k.id === editingKpiId);
      if (!existingKpi) {
        showToast('KPI tidak ditemui', 'error');
        return;
      }
      noKpiStr = existingKpi.noKpi;

      const updatedKpiItem: KpiItem = {
        ...existingKpi,
        komponen: formKomponen,
        noSsp: formTerasSsp,
        bidangUtama: formBidangUtama,
        bahagian: formBahagianList,
        
        // Capitalize each word / Uppercase compliance
        objektif: handleCapitalizeEachWord(formObjektif),
        kpi: handleUppercase(formKpiText),
        inisiatif: handleCapitalizeEachWord(formInisiatif),
        pengukuran: handleCapitalizeEachWord(formPengukuran),
        statusPencapaianTahunSebelum: handleCapitalizeEachWord(formStatusSebelum),
        
        sasaran1: Number(Number(formSasaran1).toFixed(1)),
        justifikasiSasaran1: handleCapitalizeEachWord(formJustifikasi1),
        sasaran2: Number(Number(formSasaran2).toFixed(1)),
        justifikasiSasaran2: handleCapitalizeEachWord(formJustifikasi2),
        sasaran3: Number(Number(formSasaran3).toFixed(1)),
        justifikasiSasaran3: handleCapitalizeEachWord(formJustifikasi3),
        sasaran4: Number(Number(formSasaran4).toFixed(1)),
        justifikasiSasaran4: handleCapitalizeEachWord(formJustifikasi4),
        
        sasaranAkhir: Number(Number(formSasaranAkhir).toFixed(1)),
        pemberat: Number(Number(formPemberat).toFixed(1))
      };

      updatedKpis = currentYearData.kpis.map(k => k.id === editingKpiId ? updatedKpiItem : k);

      // Update monthly achievements with the modified weights and recalculate percentages
      MONTHS_LIST.forEach(m => {
        const monthGrp = updatedMonthlyAchievements[m];
        if (monthGrp && monthGrp.achievements[noKpiStr]) {
          const ach = monthGrp.achievements[noKpiStr];
          const val = Number(Number(ach.pencapaian).toFixed(1));
          const s3 = updatedKpiItem.sasaran3 || 1;
          const rawPersenPencapaian = s3 > 0 ? Number(((val / s3) * 100).toFixed(1)) : 100.0;
          const persenPencapaian = Math.min(100.0, rawPersenPencapaian);
          const persenPemberat = updatedKpiItem.pemberat;
          const persenPencapaianSebenar = Number(((persenPencapaian * persenPemberat) / 100).toFixed(1));

          ach.persenPencapaian = persenPencapaian;
          ach.persenPemberat = persenPemberat;
          ach.persenPencapaianSebenar = persenPencapaianSebenar;
        }
      });
    } else {
      // Auto-number creation
      const nextKpiNum = currentYearData.kpis.length + 1;
      noKpiStr = `KPI ${nextKpiNum}`;

      const newKpiItem: KpiItem = {
        id: `kpi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        noKpi: noKpiStr,
        komponen: formKomponen,
        noSsp: formTerasSsp,
        bidangUtama: formBidangUtama,
        bahagian: formBahagianList,
        
        // Capitalize each word / Uppercase compliance
        objektif: handleCapitalizeEachWord(formObjektif),
        kpi: handleUppercase(formKpiText),
        inisiatif: handleCapitalizeEachWord(formInisiatif),
        pengukuran: handleCapitalizeEachWord(formPengukuran),
        statusPencapaianTahunSebelum: handleCapitalizeEachWord(formStatusSebelum),
        
        sasaran1: Number(Number(formSasaran1).toFixed(1)),
        justifikasiSasaran1: handleCapitalizeEachWord(formJustifikasi1),
        sasaran2: Number(Number(formSasaran2).toFixed(1)),
        justifikasiSasaran2: handleCapitalizeEachWord(formJustifikasi2),
        sasaran3: Number(Number(formSasaran3).toFixed(1)),
        justifikasiSasaran3: handleCapitalizeEachWord(formJustifikasi3),
        sasaran4: Number(Number(formSasaran4).toFixed(1)),
        justifikasiSasaran4: handleCapitalizeEachWord(formJustifikasi4),
        
        sasaranAkhir: Number(Number(formSasaranAkhir).toFixed(1)),
        pemberat: Number(Number(formPemberat).toFixed(1))
      };

      updatedKpis = [...currentYearData.kpis, newKpiItem];

      // Auto update monthly references to include this new KPI
      MONTHS_LIST.forEach(m => {
        const monthGrp = updatedMonthlyAchievements[m] || { month: m, isEdited: false, achievements: {} };
        
        monthGrp.achievements[newKpiItem.noKpi] = {
          noKpi: newKpiItem.noKpi,
          pencapaian: 0.0,
          persenPencapaian: 0.0,
          persenPemberat: newKpiItem.pemberat,
          persenPencapaianSebenar: 0.0,
          statusPencapaian: 'Belum Dilaksanakan',
          dokumenSokongan: null
        };
        updatedMonthlyAchievements[m] = monthGrp;
      });
    }

    const updatedYearData: kpiYearData = {
      ...currentYearData,
      kpis: updatedKpis,
      monthlyAchievements: updatedMonthlyAchievements
    };

    setYearRecords(prev => ({
      ...prev,
      [selectedYear]: updatedYearData
    }));

    // Synced to Firestore
    try {
      setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedYearData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
    }

    // Reset Form fields
    setFormObjektif('');
    setFormKpiText('');
    setFormInisiatif('');
    setFormPengukuran('');
    setFormStatusSebelum('');
    setFormSasaran1(0);
    setFormJustifikasi1('');
    setFormSasaran2(0);
    setFormJustifikasi2('');
    setFormSasaran3(0);
    setFormJustifikasi3('');
    setFormSasaran4(0);
    setFormJustifikasi4('');
    setFormSasaranAkhir(0);
    setFormPemberat(10);
    setFormBahagianList([]);

    setIsAddKpiOpen(false);
    const successMsg = editingKpiId 
      ? `Berjaya mengemaskini ${noKpiStr} dalam Kerangka KPI ${selectedYear}`
      : `Berjaya menambah ${noKpiStr} ke dalam Kerangka KPI ${selectedYear}`;
    setEditingKpiId(null);
    showToast(successMsg, 'success');
  };

  // Start editing a KPI by loading its values into the form
  const handleStartEditKpi = (kpiItem: KpiItem) => {
    if (currentYearData.isSubmitted) {
      showToast('Kerangka tahun ini telah DISAHKAN dan DIKUNCI. Anda tidak boleh meminda KPI.', 'error');
      return;
    }

    setFormKomponen(kpiItem.komponen);
    setFormTerasSsp(kpiItem.noSsp);
    setFormBidangUtama(kpiItem.bidangUtama);
    setFormBahagianList(kpiItem.bahagian);
    setFormObjektif(kpiItem.objektif);
    setFormKpiText(kpiItem.kpi);
    setFormInisiatif(kpiItem.inisiatif || '');
    setFormPengukuran(kpiItem.pengukuran || '');
    setFormStatusSebelum(kpiItem.statusPencapaianTahunSebelum || '');
    
    setFormSasaran1(kpiItem.sasaran1);
    setFormJustifikasi1(kpiItem.justifikasiSasaran1 || '');
    setFormSasaran2(kpiItem.sasaran2);
    setFormJustifikasi2(kpiItem.justifikasiSasaran2 || '');
    setFormSasaran3(kpiItem.sasaran3);
    setFormJustifikasi3(kpiItem.justifikasiSasaran3 || '');
    setFormSasaran4(kpiItem.sasaran4);
    setFormJustifikasi4(kpiItem.justifikasiSasaran4 || '');
    
    setFormSasaranAkhir(kpiItem.sasaranAkhir);
    setFormPemberat(kpiItem.pemberat);

    setEditingKpiId(kpiItem.id);
    setIsAddKpiOpen(true);

    setTimeout(() => {
      const el = document.getElementById('kpi_form_panel');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Remove a KPI before submitting
  const handleRemoveKpi = (kpiId: string, kpiNo: string) => {
    if (currentYearData.isSubmitted) {
      showToast('Tidak boleh membuang KPI kerana kerangka tahun ini telah DISAHKAN / DIKUNCI.', 'error');
      return;
    }

    if (!confirm(`Padam ${kpiNo} daripada kerangka? Kesemua rekod pencapaian bagi bulan-bulan berkaitan juga akan dipadam.`)) {
      return;
    }

    const filteredKpis = currentYearData.kpis.filter(kpi => kpi.id !== kpiId);
    
    // Re-index remaining KPIs so they maintain KPI 1, KPI 2 sequentially
    const sequentialKpis = filteredKpis.map((kpi, index) => ({
      ...kpi,
      noKpi: `KPI ${index + 1}`
    }));

    // Update monthly references
    const updatedMonthlyAchievements = { ...currentYearData.monthlyAchievements };
    MONTHS_LIST.forEach(m => {
      const monthGrp = updatedMonthlyAchievements[m];
      if (monthGrp) {
        const newAchievements: Record<string, AchievementItem> = {};
        sequentialKpis.forEach(kpi => {
          // Keep old data under old name if possible, map by sequential indexes
          // Find if there was older data corresponding to old KPI name
          const oldKpiRef = currentYearData.kpis.find(o => o.id === kpi.id);
          const oldKpiNo = oldKpiRef ? oldKpiRef.noKpi : '';
          
          if (oldKpiNo && monthGrp.achievements[oldKpiNo]) {
            newAchievements[kpi.noKpi] = {
              ...monthGrp.achievements[oldKpiNo],
              noKpi: kpi.noKpi,
              persenPemberat: kpi.pemberat // update latest weight
            };
          } else {
            newAchievements[kpi.noKpi] = {
              noKpi: kpi.noKpi,
              pencapaian: 0.0,
              persenPencapaian: 0.0,
              persenPemberat: kpi.pemberat,
              persenPencapaianSebenar: 0.0,
              statusPencapaian: 'Belum Dilaksanakan',
              dokumenSokongan: null
            };
          }
        });
        monthGrp.achievements = newAchievements;
      }
    });

    const updatedYearData: kpiYearData = {
      ...currentYearData,
      kpis: sequentialKpis,
      monthlyAchievements: updatedMonthlyAchievements
    };

    setYearRecords(prev => ({
      ...prev,
      [selectedYear]: updatedYearData
    }));

    // Update in Firestore
    try {
      setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedYearData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
    }

    showToast('KPI berjaya dipadam dan turutan dinomborkan semula', 'success');
  };

  // Submit and lock the Kerangka Year
  const handleSubmitKerangka = async () => {
    if (currentYearData.kpis.length === 0) {
      showToast('Tiada KPI dikesan. Sila masukkan sekurang-kurangnya satu kpi.', 'error');
      return;
    }

    if (Math.abs(totalPemberat - 100.0) > 0.01) {
      showToast(`Ralat penghantaran: Jumlah % PEMBERAT mestilah tepat 100.0% (Jumlah semasa: ${totalPemberat.toFixed(1)}%)`, 'error');
      return;
    }

    const updatedYearData: kpiYearData = {
      ...currentYearData,
      isSubmitted: true
    };

    setYearRecords(prev => ({
      ...prev,
      [selectedYear]: updatedYearData
    }));

    // Update in Firestore
    try {
      await setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedYearData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
    }

    showToast(`Tahniah! Kerangka Strategik KPI Tahun ${selectedYear} telah rasmi DISUBMIT & DIKUNCI untuk pengisian bulanan.`, 'success');
  };

  // Handle unlocking the Kerangka Year
  const handleUnlockKerangka = async () => {
    const updatedYearData: kpiYearData = {
      ...currentYearData,
      isSubmitted: false
    };

    setYearRecords(prev => ({
      ...prev,
      [selectedYear]: updatedYearData
    }));

    try {
      await setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedYearData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
    }

    setIsUnlockModalOpen(false);
    showToast(`Kerangka Strategik KPI Tahun ${selectedYear} telah berjaya dibuka kunci. Anda boleh meminda KPI semula.`, 'success');
  };

  // Restore Default Demo Data
  const handleResetToDemo = async () => {
    if (confirm('Tetapkan semula sistem ke Tetapan asal SPAN (Data Penunjuk 2026)? Segala perubahan semasa anda akan digantikan.')) {
      const initialData = getInitialYearData();
      
      setYearRecords(initialData);

      // Reset all in Firestore!
      try {
        const promises = Object.entries(initialData).map(([yearStr, val]) =>
          setDoc(doc(db, 'yearRecords', yearStr), val)
        );
        await Promise.all(promises);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'yearRecords');
      }

      setSelectedYear(2026);
      setSelectedMonth('MARCH');
      setActiveTab('DASHBOARD');
      showToast('Sistem berjaya ditetapkan semula ke data korporat SPAN asal!', 'success');
    }
  };

  // Select File & Validate limits (2MB & PDF / Images)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Size check: 2MB (2,097,152 bytes)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError('Fail melebihi had saiz 2MB yang ditetapkan.');
      showToast('Ralat: Had saiz fail dokumen adalah 2MB.', 'error');
      return;
    }

    // Type check: PDF or Image
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Jenis fail tidak disokong. Sila pilih dokumen PDF atau imej (PNG/JPG).');
      showToast('Ralat: Jenis fail mestilah PDF atau Imej sahaja.', 'error');
      return;
    }

    // Simulate upload reading file metadata
    setAchInputFile({
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: 'blob:' + URL.createObjectURL(file) // simulate a reference path
    });
    showToast(`Dokumen "${file.name}" sedia untuk disimpan`, 'success');
  };

  // Start Editing Monthly Achievement
  const handleStartEditAchievement = (kpiNo: string, ach: AchievementItem) => {
    setEditingAchievementKpiNo(kpiNo);
    setAchInputPencapaian(ach.pencapaian);
    setAchInputStatus(ach.statusPencapaian === 'Tiada Data' ? '' : ach.statusPencapaian);
    setAchInputFile(ach.dokumenSokongan);
    setFileError(null);
  };

  // Done/Save Achievement Editing
  const handleSaveAchievement = (kpiNo: string) => {
    const kpiRef = currentYearData.kpis.find(x => x.noKpi === kpiNo);
    if (!kpiRef) return;

    const p = Number(Number(achInputPencapaian || 0).toFixed(1));
    const s3 = kpiRef.sasaran3 || 1;

    // Calculate auto variables
    // % PENCAPAIAN (pencapaian / sasaran3) * 100 (maksimum 100.0%)
    const rawPersenPencapaian = s3 > 0 ? Number(((p / s3) * 100).toFixed(1)) : 100.0;
    const persenPencapaian = Math.min(100.0, rawPersenPencapaian);
    const persenPemberat = kpiRef.pemberat;
    // % PENCAPAIAN SEBENAR (% PENCAPAIAN * % PEMBERAT) / 100
    const persenPencapaianSebenar = Number(((persenPencapaian * persenPemberat) / 100).toFixed(1));

    // Update state
    const updatedMonthlyAchievements = { ...currentYearData.monthlyAchievements };
    const monthGrp = updatedMonthlyAchievements[selectedMonth];
    
    if (monthGrp) {
      monthGrp.isEdited = true;
      monthGrp.achievements[kpiNo] = {
        noKpi: kpiNo,
        pencapaian: p,
        persenPencapaian,
        persenPemberat,
        persenPencapaianSebenar,
        statusPencapaian: handleCapitalizeEachWord(achInputStatus) || 'Tercapai',
        dokumenSokongan: achInputFile
      };
    }

    const updatedYearData: kpiYearData = {
      ...currentYearData,
      monthlyAchievements: updatedMonthlyAchievements
    };

    setYearRecords(prev => ({
      ...prev,
      [selectedYear]: updatedYearData
    }));

    // Save to Firestore!
    try {
      setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedYearData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
    }

    setEditingAchievementKpiNo(null);
    showToast(`Berjaya mengemaskini pencapaian ${kpiNo} bagi bulan [${selectedMonth}]`, 'success');
  };

  // Confirm Monthly Achievement Updated manually
  const handleConfirmMonthUpdated = () => {
    const updatedMonthlyAchievements = { ...currentYearData.monthlyAchievements };
    const monthGrp = updatedMonthlyAchievements[selectedMonth] || {
      month: selectedMonth,
      isEdited: false,
      achievements: {}
    };

    // Toggle or confirm as true
    monthGrp.isEdited = true;

    // Ensure all existing KPIs have a default record in achievements so there are no empty states
    currentYearData.kpis.forEach(kpi => {
      if (!monthGrp.achievements[kpi.noKpi]) {
        monthGrp.achievements[kpi.noKpi] = {
          noKpi: kpi.noKpi,
          pencapaian: 0.0,
          persenPencapaian: 0.0,
          persenPemberat: kpi.pemberat,
          persenPencapaianSebenar: 0.0,
          statusPencapaian: 'Belum Dilaksanakan',
          dokumenSokongan: null
        };
      }
    });

    updatedMonthlyAchievements[selectedMonth] = monthGrp;

    const updatedYearData: kpiYearData = {
      ...currentYearData,
      monthlyAchievements: updatedMonthlyAchievements
    };

    setYearRecords(prev => ({
      ...prev,
      [selectedYear]: updatedYearData
    }));

    // Save to Firestore!
    try {
      setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedYearData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
    }

    showToast(`Pencapaian bulan ${selectedMonth} telah disahkan dan bertukar status ke [Telah Dikemaskini]`, 'success');
  };

  // Synchronize and refresh/recalculate monthly achievements based on latest KPI definitions
  const handleRefreshMonthAchievementsData = () => {
    const updatedMonthlyAchievements = { ...currentYearData.monthlyAchievements };
    const monthGrp = updatedMonthlyAchievements[selectedMonth] || {
      month: selectedMonth,
      isEdited: false,
      achievements: {}
    };

    let updatedCount = 0;

    currentYearData.kpis.forEach(kpi => {
      const ach = monthGrp.achievements[kpi.noKpi];
      if (ach) {
        const s3 = kpi.sasaran3 || 1;
        const p = ach.pencapaian || 0.0;
        
        // Recalculate based on current KPI's target (sasaran3) and weight (pemberat)
        const rawPersenPencapaian = s3 > 0 ? Number(((p / s3) * 100).toFixed(1)) : 100.0;
        const persenPencapaian = Math.min(100.0, rawPersenPencapaian);
        const persenPemberat = kpi.pemberat;
        const persenPencapaianSebenar = Number(((persenPencapaian * persenPemberat) / 100).toFixed(1));

        if (
          ach.persenPemberat !== persenPemberat ||
          ach.persenPencapaian !== persenPencapaian ||
          ach.persenPencapaianSebenar !== persenPencapaianSebenar
        ) {
          ach.persenPemberat = persenPemberat;
          ach.persenPencapaian = persenPencapaian;
          ach.persenPencapaianSebenar = persenPencapaianSebenar;
          updatedCount++;
        }
      } else {
        // Create default achievement using latest KPI properties
        monthGrp.achievements[kpi.noKpi] = {
          noKpi: kpi.noKpi,
          pencapaian: 0.0,
          persenPencapaian: 0.0,
          persenPemberat: kpi.pemberat,
          persenPencapaianSebenar: 0.0,
          statusPencapaian: 'Belum Dilaksanakan',
          dokumenSokongan: null
        };
        updatedCount++;
      }
    });

    updatedMonthlyAchievements[selectedMonth] = monthGrp;

    const updatedYearData: kpiYearData = {
      ...currentYearData,
      monthlyAchievements: updatedMonthlyAchievements
    };

    setYearRecords(prev => ({
      ...prev,
      [selectedYear]: updatedYearData
    }));

    // Save to Firestore!
    try {
      setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedYearData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
    }

    showToast(`Menyegarkan semula data pencapaian bagi bulan ${selectedMonth}. ${updatedCount} KPI disegerakkan berdasarkan kerangka KPI terkini.`, 'success');
  };

  // Google Sheets Auth Handlers
  const handleGoogleSheetsLogin = async () => {
    try {
      const loginResult = await googleSheetsSignIn();
      if (loginResult) {
        setSheetsUser(loginResult.user);
        setSheetsAccessToken(loginResult.accessToken);
        showToast('Berjaya mendaftar Google Sheets dengan kebenaran spreadsheets!', 'success');
      }
    } catch (err: any) {
      showToast(`Ralat log masuk Google Sheets: ${err.message || err}`, 'error');
    }
  };

  const handleGoogleSheetsLogout = async () => {
    await googleSheetsSignOut();
    setSheetsUser(null);
    setSheetsAccessToken(null);
    showToast('Log keluar Google Sheets berjaya.', 'success');
  };

  // Import achievement data from Google Sheets
  const handleImportFromGoogleSheets = async () => {
    if (!spreadsheetIdInput) {
      showToast('Sila masukkan ID Google Spreadsheet.', 'error');
      return;
    }

    let token = sheetsAccessToken;
    if (!token) {
      // Prompt user to login first
      try {
        const loginResult = await googleSheetsSignIn();
        if (loginResult) {
          setSheetsUser(loginResult.user);
          setSheetsAccessToken(loginResult.accessToken);
          token = loginResult.accessToken;
        } else {
          return; // Cancelled
        }
      } catch (err: any) {
        showToast(`Sila layari log masuk untuk memautkan fail: ${err.message || err}`, 'error');
        return;
      }
    }

    if (!token) {
      showToast('Tiada token keselamatan Google Sheets yang sah ditemui.', 'error');
      return;
    }

    // MANDATORY USER CONFIRMATION before writing/overwriting!
    const confirmed = window.confirm(
      `Adakah anda pasti mahu mengimport data prestasi untuk bulan [${selectedMonth}] dari Google Sheets?\n` +
      `Ini akan mengemaskini secara automatik nilai pencapaian dan status KPI dalam sistem SPA bagi tahun ${selectedYear}.`
    );
    if (!confirmed) return;

    setIsSyncingWithSheets(true);
    try {
      const sheetsData = await loadKpiDataFromSheet(spreadsheetIdInput, sheetRangeInput, token);
      
      if (sheetsData.length === 0) {
        showToast('Tiada baris data KPI sah ditemui dalam helaian Google Sheets yang diimport.', 'ref');
        setIsSyncingWithSheets(false);
        return;
      }

      // Prepare updated achievements map
      const updatedMonthlyAchievements = { ...currentYearData.monthlyAchievements };
      const monthGrp = updatedMonthlyAchievements[selectedMonth];
      
      if (!monthGrp) {
        showToast(`Ralat sistem: Data bulan [${selectedMonth}] tidak dimulakan.`, 'error');
        setIsSyncingWithSheets(false);
        return;
      }

      let matchCount = 0;

      // Update matched achievements
      sheetsData.forEach((row) => {
        const kpiRef = currentYearData.kpis.find(x => x.noKpi.toUpperCase().replace(/\s+/, '') === row.kpiNo.toUpperCase().replace(/\s+/, ''));
        if (kpiRef) {
          const val = Number(Number(row.pencapaian).toFixed(1));
          const s3 = kpiRef.sasaran3 || 1;
          const rawPersenPencapaian = s3 > 0 ? Number(((val / s3) * 100).toFixed(1)) : 100.0;
          const persenPencapaian = Math.min(100.0, rawPersenPencapaian);
          const persenPemberat = kpiRef.pemberat;
          const persenPencapaianSebenar = Number(((persenPencapaian * persenPemberat) / 100).toFixed(1));

          // Set achievement
          monthGrp.achievements[kpiRef.noKpi] = {
            noKpi: kpiRef.noKpi,
            pencapaian: val,
            persenPencapaian,
            persenPemberat,
            persenPencapaianSebenar,
            statusPencapaian: row.status || monthGrp.achievements[kpiRef.noKpi]?.statusPencapaian || 'Tercapai (Google Sheets)',
            dokumenSokongan: monthGrp.achievements[kpiRef.noKpi]?.dokumenSokongan || null
          };
          matchCount++;
        }
      });

      if (matchCount === 0) {
        showToast('Gagal memetakan sebarang data. Pastikan baris helaian mengandungi rujukan No KPI (cth: "KPI 1") dan Nilai Pencapaian.', 'error');
        setIsSyncingWithSheets(false);
        return;
      }

      monthGrp.isEdited = true;

      const updatedYearData: kpiYearData = {
        ...currentYearData,
        monthlyAchievements: updatedMonthlyAchievements
      };

      setYearRecords(prev => ({
        ...prev,
        [selectedYear]: updatedYearData
      }));

      // Persist to Cloud Firestore for persistence
      try {
        await setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedYearData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
      }

      showToast(`Berjaya mengimport ${matchCount} rekod KPI untuk bulan [${selectedMonth}] daripada Google Sheets!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal mengimport Google Sheets: ${err.message || err}`, 'error');
    } finally {
      setIsSyncingWithSheets(false);
    }
  };

  // Calculate High Level Metrics for Dashboard
  const monthAchievementsGroup = currentYearData.monthlyAchievements[selectedMonth];
  const totalWeightedProgress = currentYearData.kpis.length > 0 && monthAchievementsGroup
    ? (() => {
        const sumVal = currentYearData.kpis.reduce((sum, kpi) => {
          const ach = monthAchievementsGroup.achievements[kpi.noKpi];
          return sum + (ach ? ach.persenPencapaianSebenar : 0);
        }, 0);
        return Math.floor(sumVal * 10) / 10;
      })()
    : 0.0;

  // Average raw completion %
  const averageRawCompletion = currentYearData.kpis.length > 0 && monthAchievementsGroup
    ? Number((currentYearData.kpis.reduce((sum, kpi) => {
        const ach = monthAchievementsGroup.achievements[kpi.noKpi];
        return sum + (ach ? ach.persenPencapaian : 0);
      }, 0) / currentYearData.kpis.length).toFixed(1))
    : 0.0;

  // Grade color style picker based on percentage
  const getGradeColorStyle = (value: number) => {
    if (value >= 91.0) return 'text-[#00b050]'; // Cemerlang (Green)
    if (value >= 71.0) return 'text-[#007aff]'; // Mencapai (Sky Blue/Blue)
    if (value >= 21.0) return 'text-[#f59e0b]'; // Memuaskan (Amber/Orange)
    return 'text-[#ff3366]'; // Lemah (Rose Pink)
  };

  // Filter KPI Lists
  const filteredKpiItems = currentYearData.kpis.filter(item => {
    const matchesSearch = 
      item.noKpi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.objektif.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kpi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inisiatif.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bahagian.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesKomponen = filterKomponen === 'SEMUA' || item.komponen === filterKomponen;

    return matchesSearch && matchesKomponen;
  });

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      
      {/* Toast Notification Bar */}
      {toast && (
        <div 
          style={{ zIndex: 9999 }}
          className={`fixed top-5 right-5 flex items-center p-4 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 scale-100 ${
            toast.type === 'error' 
              ? 'bg-rose-50 border-l-4 border-rose-500 text-rose-900 shadow-rose-100' 
              : 'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-950 shadow-emerald-100'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="h-5 w-5 mr-3 text-rose-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 mr-3 text-emerald-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-4 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Corporate Left Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden pointer-events-none'} transition-all duration-300 ease-in-out bg-[#004a8d] text-white flex flex-col border-[#005fb5] flex-shrink-0 ${isSidebarOpen ? 'border-r' : 'border-r-0'}`}>
        
        {/* SPAN Brand Header Area */}
        <div className="p-6 border-b border-[#005fb5] bg-[#004a8d] relative overflow-hidden">
          {/* Subtle Water ripple graphic background */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-cyan-300">
              <path d="M0,50 Q25,70 50,5 Q75,35 100,50 L100,100 L0,100 Z" fill="currentColor" />
            </svg>
          </div>

          <div className="flex items-center space-x-3 mb-2 relative z-10">
            {/* SPAN Styled Corporate Logo */}
            <div className="bg-white text-[#004a8d] p-2 rounded-xl shadow-md ring-4 ring-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                <path d="M12 18C12 18 16 14 16 11.5C16 9.01472 14.2091 7 12 7C9.79086 7 8 9.01472 8 11.5C8 14 12 18 12 18Z" fill="#22d3ee" />
                <path d="M12 9C12.5523 9 13 8.55228 13 8C13 7.44772 12.5523 7 12 7C11.4477 7 11 7.44772 11 8C11 8.55228 11.4477 9 12 9Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white">E-KPI SPAN</h1>
              <span className="text-[10px] text-cyan-200 uppercase tracking-widest font-mono block">SURUHANJAYA AIR NEGARA</span>
            </div>
          </div>
          <p className="text-blue-100 text-[11px] leading-relaxed relative z-10 italic mt-1 bg-[#005fb5]/30 p-2 rounded-lg border border-white/5">
            Sistem Pemantauan Petunjuk Prestasi Utama Korporat Bersepadu SPAN.
          </p>
        </div>

        {/* Global Year Context Selector inside Sidebar */}
        <div className="p-4 bg-[#003d75]/50 border-b border-[#005fb5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-cyan-300" />
            <span className="text-xs font-semibold text-blue-100">Tahun:</span>
            <span className="text-xs font-bold text-white bg-[#005fb5] px-2 py-0.5 rounded border border-[#38bdf8]/30">
              {selectedYear}
            </span>
          </div>
          <button 
            id="btn_kpi_year_trigger"
            onClick={() => {
              setYearInputVal(selectedYear);
              setIsKpiYearOpen(true);
            }} 
            className="text-[10px] text-cyan-200 font-bold hover:text-white bg-[#005fb5]/50 hover:bg-[#005fb5] border border-[#38bdf8]/20 px-2 py-1 rounded transition-colors"
          >
            Tukar Tahun
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          
          <button
            id="nav_dashboard"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all ${
              activeTab === 'DASHBOARD'
                ? 'bg-[#005fb5] text-white font-bold border-r-4 border-cyan-400'
                : 'text-blue-100 hover:bg-[#005fb5]/30 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="h-5 w-5 text-cyan-300" />
              <span className="text-sm tracking-wider font-semibold">DASHBOARD</span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-70" />
          </button>

          <button
            id="nav_laporan"
            onClick={() => setActiveTab('LAPORAN')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all ${
              activeTab === 'LAPORAN'
                ? 'bg-[#005fb5] text-white font-bold border-r-4 border-cyan-400'
                : 'text-blue-100 hover:bg-[#005fb5]/30 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-cyan-300" />
              <div className="flex flex-col">
                <span className="text-sm tracking-wider font-semibold leading-none">LAPORAN</span>
                <span className="text-[9px] text-blue-200 mt-1">Laporan & Cetakan</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 opacity-70" />
          </button>

          <button
            id="nav_kerangka"
            onClick={() => setActiveTab('KERANGKA')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all ${
              activeTab === 'KERANGKA'
                ? 'bg-[#005fb5] text-white font-bold border-r-4 border-cyan-400'
                : 'text-blue-100 hover:bg-[#005fb5]/30 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <ClipboardList className="h-5 w-5 text-cyan-300" />
              <div className="flex flex-col">
                <span className="text-sm tracking-wider font-semibold leading-none">KERANGKA KPI</span>
                <span className="text-[9px] text-blue-200 mt-1">Konfigurasi & Sasaran</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              {currentYearData.isSubmitted ? (
                <span className="bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">MUTAKHIR</span>
              ) : (
                <span className="bg-amber-950/40 text-amber-300 border border-amber-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">DERAF</span>
              )}
              <ChevronRight className="h-4 w-4 opacity-70" />
            </div>
          </button>

          <button
            id="nav_pencapaian"
            onClick={() => {
              if (currentYearData.kpis.length === 0) {
                showToast('Tiada Kerangka KPI ditemui untuk tahun ini, sila tambah KPI di panel Kerangka.', 'error');
              }
              setActiveTab('PENCAPAIAN');
            }}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all ${
              activeTab === 'PENCAPAIAN'
                ? 'bg-[#005fb5] text-white font-bold border-r-4 border-cyan-400'
                : 'text-blue-100 hover:bg-[#005fb5]/30 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Award className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="text-sm leading-none">PENCAPAIAN YTD</span>
                <span className="text-[10px] text-slate-400 mt-1">Pemantauan Bulanan ({selectedMonth})</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 opacity-70" />
          </button>

        </nav>

        {/* Sidebar Info Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 text-slate-400 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span>Sistem Status:</span>
              <span className="text-emerald-400 font-mono font-medium flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                AKTIF / ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>Pengguna:</span>
              <span className="text-sky-300 font-medium truncate max-w-[130px]" title="nadzifrahman83@gmail.com">
                nadzifrahman83@gmail.com
              </span>
            </div>
            <hr className="border-slate-800 my-1" />
            <div className="flex justify-between items-center text-[10px]">
              <button 
                id="btn_reset_demo"
                onClick={handleResetToDemo} 
                className="text-slate-400 hover:text-sky-300 flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Simulasi Semula Data</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        
        {/* Top Corporate Status Ribbon */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between flex-shrink-0 shadow-sm relative z-20">
          <div className="flex items-center space-x-4">
            <button
              id="sidebar_toggle_btn"
              onClick={toggleSidebar}
              className="p-2.5 bg-slate-100 hover:bg-sky-50 text-[#004a8d] hover:text-[#005fb5] rounded-xl transition-all duration-200 border border-slate-200 hover:border-sky-300 shadow-sm flex items-center justify-center hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              title={isSidebarOpen ? "Sembunyikan Menu Sisi" : "Tunjukkan Menu Sisi"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5 text-emerald-600 animate-pulse" />
              )}
            </button>
            <div>
              <span className="text-[20px] uppercase font-bold text-[#070707] tracking-wider truncate block max-w-full sm:max-w-[450px] md:max-w-none">
                PETUNJUK PRESTASI UTAMA (KPI) {selectedYear}
              </span>
              <h2 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">Suruhanjaya Perkhidmatan Air Negara</h2>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-sky-50 text-sky-800 border border-sky-200 rounded-xl px-3 py-1.5 flex items-center space-x-2 text-xs font-semibold shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-500"></span>
              <span>Mod Korporat SPAN</span>
            </div>

            <div className={`border rounded-xl px-3 py-1.5 flex items-center space-x-2 text-xs font-semibold shadow-sm ${
              isFirebaseLoading 
                ? 'bg-amber-55 text-amber-800 border-amber-300' 
                : 'bg-emerald-55 text-emerald-800 border-emerald-300'
            }`}>
              <span className={`h-2 w-2 rounded-full ${isFirebaseLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span>{isFirebaseLoading ? 'Menyinkronkan...' : 'Sedia (Firebase Real-time)'}</span>
            </div>
          </div>
        </header>

        {/* Tab-driven Content Container */}
        <div className="flex-1 p-8 overflow-y-auto">

          {/* TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-6">
              
              {/* Dashboard Intro Header Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none rounded-r-2xl"></div>
                
                <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10 flex-1">
                  {/* Left Side: Paparan Prestasi Semasa Label Box */}
                  <div className="flex flex-col md:border-r border-slate-200 md:pr-6 py-1 shrink-0">
                    <div className="inline-flex items-center space-x-2 bg-sky-50 text-sky-700 px-3 py-1.5 rounded-full text-xs font-bold w-fit">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                      </span>
                      <span>Paparan Prestasi Semasa</span>
                    </div>
                  </div>

                  {/* Divided Performance Stats Grid to the side */}
                  <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-0 bg-slate-50/50 rounded-2xl p-2 border border-slate-100 flex-1 justify-around">
                    {/* Box 1: Average Semasa */}
                    <div className="px-6 py-2.5 flex flex-col items-center justify-center text-center flex-1">
                      <span className="text-[12px] text-slate-500 uppercase font-normal tracking-widest mb-1.5">PENCAPAIAN KESELURUHAN</span>
                      <div className="flex items-center justify-center">
                        <span id="average_raw_completion_val" className={`text-[35px] font-extrabold tracking-tight leading-none ${getGradeColorStyle(totalWeightedProgress)}`}>
                          {totalWeightedProgress.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:block w-px my-2 bg-slate-200"></div>

                    {/* Box 2: Previous Month Card */}
                    {(() => {
                      const currMonthIdx = MONTHS_LIST.indexOf(selectedMonth);
                      const prevMonth = currMonthIdx > 0 ? MONTHS_LIST[currMonthIdx - 1] : null;
                      const prevMonthGroup = prevMonth ? currentYearData.monthlyAchievements[prevMonth] : null;
                      
                      const prevTotalWeightedProgress = prevMonthGroup && currentYearData.kpis.length > 0
                        ? (() => {
                            const sumVal = currentYearData.kpis.reduce((sum, kpi) => {
                              const ach = prevMonthGroup.achievements[kpi.noKpi];
                              return sum + (ach ? ach.persenPencapaianSebenar : 0);
                            }, 0);
                            return Math.floor(sumVal * 10) / 10;
                          })()
                        : 0.0;

                      const trendGap = Number((totalWeightedProgress - prevTotalWeightedProgress).toFixed(1));
                      const textMonthName = prevMonth ? prevMonth : 'TIADA';

                      return (
                        <div className="px-6 py-2.5 flex flex-col justify-center items-center text-center flex-1 relative">
                          <span className="text-[12px] text-slate-500 uppercase font-normal tracking-widest mb-1.5">Bulan {textMonthName}</span>
                          <div className="flex items-center justify-center gap-1.5 align-baseline">
                            <span id="prev_average_completion_val" className={`text-[35px] font-extrabold leading-none ${getGradeColorStyle(prevTotalWeightedProgress)}`}>
                              {prevTotalWeightedProgress.toFixed(1)}%
                            </span>
                            {trendGap > 0 ? (
                              <span className="text-[15px] text-emerald-600 font-normal">
                                ▲{trendGap}%
                              </span>
                            ) : trendGap < 0 ? (
                              <span className="text-[15px] text-rose-600 font-normal">
                                ▼{Math.abs(trendGap)}%
                              </span>
                            ) : (
                              <span className="text-[15px] text-slate-400 font-normal">
                                ─0%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="hidden sm:block w-px my-2 bg-slate-200"></div>

                    {/* Box 3: Target Sasaran Akhir */}
                    {(() => {
                      const averageSasaranAkhir = currentYearData.kpis.length > 0
                        ? Number((currentYearData.kpis.reduce((sum, kpi) => sum + kpi.sasaranAkhir, 0) / currentYearData.kpis.length).toFixed(1))
                        : 0.0;

                      return (
                        <div className="px-6 py-2.5 flex flex-col items-center justify-center text-center flex-1">
                          <span className="text-[12px] text-slate-500 uppercase font-normal tracking-widest mb-1.5">Sasaran Akhir</span>
                          <div className="flex items-center justify-center">
                            <span id="average_sasaran_akhir_val" className={`text-[35px] font-extrabold tracking-tight leading-none ${getGradeColorStyle(averageSasaranAkhir)}`}>
                              {averageSasaranAkhir.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-4 xl:mt-0 flex flex-wrap gap-2.5 relative z-10 shrink-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center shadow-xs">
                    <span className="block text-[10px] text-slate-400 uppercase font-mono">Bulan Dinilai</span>
                    <select
                      id="select_dashboard_month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value as MonthType)}
                      className="text-sm font-bold text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer text-center mt-1 outline-none"
                    >
                      {MONTHS_LIST.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>



              {/* Interactive Performance Analytics Grid */}
              {currentYearData.kpis.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center shadow-xs">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CircleAlert className="h-8 w-8 text-slate-400" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">Tiada Data KPI Ditemui</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Sila sediakan Rangka Kerja KPI di tab "KERANGKA KPI" terlebih dahulu untuk memaparkan visualisasi prestasi korporat.
                  </p>
                  <button 
                    onClick={() => setActiveTab('KERANGKA')} 
                    className="mt-4 bg-[#004a8d] hover:bg-[#003c73] text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition-colors"
                  >
                    + Tambah KPI Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ROW 1: DOUGHNUT CHARTS AND GRED KPI */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* NEW Part: Grade-based KPI Classification Box Group */}
                    {(() => {
                      const kpiGrades = {
                        cemerlang: 0,
                        mencapai: 0,
                        memuaskan: 0,
                        lemah: 0
                      };

                      currentYearData.kpis.forEach(kpi => {
                        const ach = monthAchievementsGroup?.achievements[kpi.noKpi];
                        const pct = ach ? ach.persenPencapaian : 0;
                        if (pct >= 91.0) {
                          kpiGrades.cemerlang++;
                        } else if (pct >= 71.0) {
                          kpiGrades.mencapai++;
                        } else if (pct >= 21.0) {
                          kpiGrades.memuaskan++;
                        } else {
                          kpiGrades.lemah++;
                        }
                      });

                      return (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full">
                          <div>
                            <h4 className="text-[16px] font-bold text-[#02315c] font-sans tracking-tight leading-snug">
                              Kedudukan Pencapaian Gred KPI
                            </h4>
                            <p className="text-[12px] text-slate-400 font-sans mt-1">
                              Bilangan KPI Mengikut Gred Pencapaian
                            </p>
                          </div>

                          <div className="grid grid-cols-4 gap-2 my-auto">
                            {/* Lemah */}
                            <div className="flex flex-col items-center">
                              <div className="w-full bg-gradient-to-b from-[#ff3366] to-[#ff3399] text-white rounded-2xl p-2.5 shadow-md flex flex-col items-center justify-center text-center border border-rose-400/20">
                                <span className="text-[8px] font-extrabold uppercase bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
                                  0% - 20%
                                </span>
                                <span className="text-[8px] uppercase tracking-wider mt-3 text-rose-100 font-extrabold leading-none">
                                  BIL. KPI
                                </span>
                                <span className="text-3xl font-black mt-1.5 leading-none">
                                  {kpiGrades.lemah}
                                </span>
                              </div>
                              <span className="text-[10px] font-black italic tracking-widest uppercase text-rose-500 mt-2 text-center">
                                LEMAH
                              </span>
                            </div>

                            {/* Memuaskan */}
                            <div className="flex flex-col items-center">
                              <div className="w-full bg-gradient-to-b from-amber-400 to-orange-500 text-white rounded-2xl p-2.5 shadow-md flex flex-col items-center justify-center text-center border border-amber-400/20">
                                <span className="text-[8px] font-extrabold uppercase bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
                                  21% - 70%
                                </span>
                                <span className="text-[8px] uppercase tracking-wider mt-3 text-amber-100 font-extrabold leading-none">
                                  BIL. KPI
                                </span>
                                <span className="text-3xl font-black mt-1.5 leading-none">
                                  {kpiGrades.memuaskan}
                                </span>
                              </div>
                              <span className="text-[10px] font-black italic tracking-widest uppercase text-amber-500 mt-2 text-center">
                                MEMUASKAN
                              </span>
                            </div>

                            {/* Mencapai */}
                            <div className="flex flex-col items-center">
                              <div className="w-full bg-gradient-to-b from-[#00b2fe] to-[#007aff] text-white rounded-2xl p-2.5 shadow-md flex flex-col items-center justify-center text-center border border-blue-400/20">
                                <span className="text-[8px] font-extrabold uppercase bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
                                  71% - 90%
                                </span>
                                <span className="text-[8px] uppercase tracking-wider mt-3 text-sky-100 font-extrabold leading-none">
                                  BIL. KPI
                                </span>
                                <span className="text-3xl font-black mt-1.5 leading-none">
                                  {kpiGrades.mencapai}
                                </span>
                              </div>
                              <span className="text-[10px] font-black italic tracking-widest uppercase text-sky-500 mt-2 text-center">
                                MENCAPAI
                              </span>
                            </div>

                            {/* Cemerlang */}
                            <div className="flex flex-col items-center">
                              <div className="w-full bg-gradient-to-b from-emerald-400 to-green-600 text-white rounded-2xl p-2.5 shadow-md flex flex-col items-center justify-center text-center border border-emerald-400/20">
                                <span className="text-[8px] font-extrabold uppercase bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
                                  91% - 100%
                                </span>
                                <span className="text-[8px] uppercase tracking-wider mt-3 text-emerald-100 font-extrabold leading-none">
                                  BIL. KPI
                                </span>
                                <span className="text-3xl font-black mt-1.5 leading-none">
                                  {kpiGrades.cemerlang}
                                </span>
                              </div>
                              <span className="text-[10px] font-black italic tracking-widest uppercase text-emerald-500 mt-2 text-center">
                                CEMERLANG
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Part B: Doughnut - % of weightage (pemberat) for every KPI */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-[16px] font-bold text-[#02315c] font-sans tracking-tight leading-snug">
                          Peratus Pemberat Kerangka KPI
                        </h4>
                        <p className="text-[12px] text-slate-400 font-sans mt-1">
                          Pecahan sumbangan pemberat bagi semua KPI dari jumlah total 100.0%
                        </p>
                      </div>

                      <div className="flex items-center justify-center my-2 p-1 overflow-visible">
                        {/* Segmented Doughnut SVG with leader lines and hover interactions */}
                        <div 
                          className="relative w-full max-w-[340px] aspect-square flex items-center justify-center cursor-pointer select-none overflow-visible"
                          onMouseEnter={() => setIsDoughnutHovered(true)}
                          onMouseLeave={() => {
                            setIsDoughnutHovered(false);
                            setHoveredKpiId(null);
                          }}
                        >
                          <svg viewBox="0 0 440 440" className="w-full h-full overflow-visible">
                            {/* Inner concentric ring highlight matching dashboard.png */}
                            <circle cx="220" cy="220" r="60" fill="none" stroke="#2563eb" strokeWidth="1.5" className="opacity-90" />
                            
                            {/* Track bar */}
                            <circle cx="220" cy="220" r="95" fill="none" stroke="#f1f5f9" strokeWidth="58" />
                            {(() => {
                                const totalPemberatSum = currentYearData.kpis.reduce((sum, item) => sum + item.pemberat, 0) || 100;
                                let cumPercent = 0;
                                const colors = [
                                  '#0284c7', '#0ea5e9', '#38bdf8', '#0d9488', '#14b8a6', '#22d3ee', '#4338ca', '#6366f1'
                                ];
                                
                                return currentYearData.kpis.flatMap((kpi, idx) => {
                                  const val = kpi.pemberat;
                                  const start = cumPercent;
                                  cumPercent += val;

                                  const r = 95;
                                  const circ = 2 * Math.PI * r;
                                  const length = (val / totalPemberatSum) * circ;
                                  const rAngle = (start / totalPemberatSum) * 360 - 90;

                                  // Leader line positions
                                  const segmentAngle = (val / totalPemberatSum) * 360;
                                  const midAngleDeg = rAngle + segmentAngle / 2;
                                  const angleRad = (midAngleDeg * Math.PI) / 180;
                                  
                                  const x1 = 220 + 125 * Math.cos(angleRad);
                                  const y1 = 220 + 125 * Math.sin(angleRad);
                                  
                                  const x2 = 220 + 168 * Math.cos(angleRad);
                                  const y2 = 220 + 168 * Math.sin(angleRad);
                                  
                                  const isLeft = x2 < 220;
                                  const x3 = isLeft ? x2 - 16 : x2 + 16;
                                  const y3 = y2;

                                  const isThisHovered = hoveredKpiId === kpi.id;
                                  const hasAnotherHovered = hoveredKpiId !== null && !isThisHovered;

                                  return [
                                    // Donut segment
                                    <circle 
                                      key={`seg-${kpi.id}`}
                                      cx="220" 
                                      cy="220" 
                                      r={r} 
                                      fill="none" 
                                      stroke={colors[idx % colors.length]} 
                                      strokeWidth={isThisHovered ? "72" : "60"} 
                                      strokeDasharray={`${length} ${circ}`} 
                                      strokeDashoffset="0"
                                      transform={`rotate(${rAngle} 220 220)`}
                                      onMouseEnter={() => setHoveredKpiId(kpi.id)}
                                      className="transition-all duration-300 cursor-pointer"
                                    />,
                                    // Leader line path
                                    <path 
                                      key={`line-${kpi.id}`}
                                      d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`}
                                      fill="none"
                                      stroke="#cbd5e1"
                                      strokeWidth={isThisHovered ? "1.5" : "1"}
                                      className={`transition-all duration-300 ${
                                        isDoughnutHovered 
                                          ? (isThisHovered || !hasAnotherHovered ? 'opacity-100' : 'opacity-15')
                                          : 'opacity-0 pointer-events-none'
                                      }`}
                                    />,
                                    // Tiny connector dot
                                    <circle 
                                      key={`dot-${kpi.id}`}
                                      cx={x1} 
                                      cy={y1} 
                                      r={isThisHovered ? "3.5" : "2.5"} 
                                      fill={isThisHovered ? colors[idx % colors.length] : "#94a3b8"} 
                                      className={`transition-all duration-300 ${
                                        isDoughnutHovered 
                                          ? (isThisHovered || !hasAnotherHovered ? 'opacity-100' : 'opacity-15')
                                          : 'opacity-0 pointer-events-none'
                                      }`}
                                    />,
                                    // Label text
                                    <text 
                                      key={`text-${kpi.id}`}
                                      x={x3 + (isLeft ? -4 : 4)}
                                      y={y3 + 3.5}
                                      textAnchor={isLeft ? "end" : "start"}
                                      className={`text-[11px] font-extrabold font-sans tracking-tight transition-all duration-300 ${
                                        isThisHovered ? 'fill-slate-900 font-black scale-105' : 'fill-slate-500'
                                      } ${
                                        isDoughnutHovered 
                                          ? (isThisHovered || !hasAnotherHovered ? 'opacity-100' : 'opacity-15')
                                          : 'opacity-0 pointer-events-none'
                                      }`}
                                    >
                                      {kpi.noKpi}, {(val / totalPemberatSum * 100).toFixed(1)}%
                                    </text>
                                  ];
                                });
                              })()}
                          </svg>
                          <div className="absolute text-center flex flex-col items-center pointer-events-none">
                            {(() => {
                              const hoveredKpi = currentYearData.kpis.find(k => k.id === hoveredKpiId);
                              if (hoveredKpi) {
                                return (
                                  <>
                                    <span className="text-sm font-black text-blue-600 uppercase tracking-widest leading-none">{hoveredKpi.noKpi}</span>
                                    <span className="text-4xl font-black text-slate-800 mt-1.5 leading-none">
                                      {hoveredKpi.pemberat.toFixed(1)}%
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">Pemberat</span>
                                  </>
                                );
                              }
                              return (
                                <>
                                  <span className="text-[11px] font-black text-slate-400 tracking-wider leading-none">%</span>
                                  <span className="text-xs font-black text-slate-700 tracking-widest mt-1.5 leading-none">PECAHAN</span>
                                  <span className="text-xs font-black text-slate-700 tracking-widest mt-1 leading-none">PEMBERAT</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ROW 2: LINE CHART & BAR CHART (SEPARATED FOR FULL WIDTH VIEW) */}
                  <div className="flex flex-col gap-6">
                    
                    {/* Part C: Line chart for monthly progress with 4 gradient/band zones */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="mb-4">
                        <h4 className="text-base font-bold text-slate-800">Trend Peratusan Pencapaian Bulanan ({selectedYear})</h4>
                        <p className="text-xs text-slate-400">Merujuk kepada kedudukan purata pencapaian merentasi 4 zon band prestasi korporat.</p>
                      </div>

                      <div className="w-full">
                        {(() => {
                          // Compile monthly data array
                          const monthlyData = MONTHS_LIST.map((m) => {
                            const group = currentYearData.monthlyAchievements[m];
                            const avgValue = currentYearData.kpis.length > 0 && group
                              ? Number((currentYearData.kpis.reduce((sum, kpi) => {
                                  const ach = group.achievements[kpi.noKpi];
                                  return sum + (ach ? ach.persenPencapaian : 0);
                                }, 0) / currentYearData.kpis.length).toFixed(1))
                              : 0.0;
                            return { month: m, value: avgValue };
                          });

                          const w = 750;
                          const h = 200;
                          const ml = 40;
                          const mr = 15;
                          const mt = 20;
                          const mb = 30;

                          const effW = w - ml - mr; // 695
                          const effH = h - mt - mb; // 150

                          const getX = (idx: number) => ml + (idx * effW) / 11;
                          const getY = (val: number) => mt + effH - Math.min(effH, Math.max(0, (val / 100) * effH));

                          const points = monthlyData.map((d, i) => ({ x: getX(i), y: getY(d.value) }));

                          const getSweepingPath = (pts: { x: number; y: number }[]) => {
                            if (pts.length === 0) return '';
                            let d = `M ${pts[0].x} ${pts[0].y}`;
                            for (let i = 0; i < pts.length - 1; i++) {
                              const p0 = pts[i];
                              const p1 = pts[i + 1];
                              const cp1x = p0.x + (p1.x - p0.x) / 3;
                              const cp1y = p0.y;
                              const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
                              const cp2y = p1.y;
                              d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                            }
                            return d;
                          };

                          const pathD = getSweepingPath(points);
                          const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} ${getY(0)} L ${points[0].x} ${getY(0)} Z` : '';

                          return (
                            <div className="w-full relative">
                              <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto" className="mx-auto block overflow-visible max-h-[260px]">
                                <defs>
                                  <linearGradient id="sweeping-area-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#004a8d" stopOpacity="0.32" />
                                    <stop offset="100%" stopColor="#004a8d" stopOpacity="0.01" />
                                  </linearGradient>
                                </defs>

                                {/* Band zones: Green, Blue, Yellow, Red */}
                                {/* Green Zone: 91% - 100% (Y from getY(100) to getY(90)) */}
                                <rect x={ml} y={getY(100)} width={effW} height={getY(90) - getY(100)} fill="#22c55e" fillOpacity="0.06" />
                                <text x={w - 18} y={getY(96)} textAnchor="end" className="text-[8px] fill-emerald-600 font-bold font-sans tracking-wide">Cemerlang (&gt;90%)</text>

                                {/* Blue Zone: 76% - 90% */}
                                <rect x={ml} y={getY(90)} width={effW} height={getY(75) - getY(90)} fill="#3b82f6" fillOpacity="0.06" />
                                <text x={w - 18} y={getY(83)} textAnchor="end" className="text-[8px] fill-blue-600 font-bold font-sans tracking-wide">Mencapai (76-90%)</text>

                                {/* Yellow Zone: 41% - 75% */}
                                <rect x={ml} y={getY(75)} width={effW} height={getY(40) - getY(75)} fill="#eab308" fillOpacity="0.06" />
                                <text x={w - 18} y={getY(58)} textAnchor="end" className="text-[8px] fill-amber-600 font-bold font-sans tracking-wide">Memuaskan (41-75%)</text>

                                {/* Red Zone: 0% - 40% */}
                                <rect x={ml} y={getY(40)} width={effW} height={getY(0) - getY(40)} fill="#ef4444" fillOpacity="0.06" />
                                <text x={w - 18} y={getY(20)} textAnchor="end" className="text-[8px] fill-rose-600 font-bold font-sans tracking-wide">Lemah (&lt;=40%)</text>

                                {/* Horizontal Grid lines */}
                                <line x1={ml} y1={getY(100)} x2={ml + effW} y2={getY(100)} stroke="#e2e8f0" strokeDasharray="2 2" />
                                <line x1={ml} y1={getY(90)} x2={ml + effW} y2={getY(90)} stroke="#cbd5e1" strokeDasharray="2 2" />
                                <line x1={ml} y1={getY(75)} x2={ml + effW} y2={getY(75)} stroke="#cbd5e1" strokeDasharray="2 2" />
                                <line x1={ml} y1={getY(40)} x2={ml + effW} y2={getY(40)} stroke="#cbd5e1" strokeDasharray="2 2" />
                                <line x1={ml} y1={getY(0)} x2={ml + effW} y2={getY(0)} stroke="#e2e8f0" />

                                {/* Axis Y labels */}
                                <text x={ml - 8} y={getY(100) + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">100</text>
                                <text x={ml - 8} y={getY(75) + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">75</text>
                                <text x={ml - 8} y={getY(40) + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">40</text>
                                <text x={ml - 8} y={getY(0) + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">0</text>

                                {/* Month Labels X-axis */}
                                {monthlyData.map((d, idx) => (
                                  <text 
                                    key={idx} 
                                    x={getX(idx)} 
                                    y={h - 10} 
                                    textAnchor="middle" 
                                    className={`text-[8px] font-bold font-mono ${
                                      d.month === selectedMonth ? 'fill-[#004a8d] font-black' : 'fill-slate-400'
                                    }`}
                                  >
                                    {d.month.substring(0, 3)}
                                  </text>
                                ))}

                                {/* Hover Crosshair Line */}
                                {hoveredTrendPoint && (
                                  <line 
                                    x1={hoveredTrendPoint.x} 
                                    y1={getY(100)} 
                                    x2={hoveredTrendPoint.x} 
                                    y2={getY(0)} 
                                    stroke="#004a8d" 
                                    strokeWidth="1.5" 
                                    strokeDasharray="3 3" 
                                    opacity="0.35" 
                                  />
                                )}

                                {/* Sweeping Shaded Area background */}
                                {areaD && (
                                  <path 
                                    d={areaD} 
                                    fill="url(#sweeping-area-grad)" 
                                  />
                                )}

                                {/* The active path line */}
                                <path 
                                  d={pathD} 
                                  fill="none" 
                                  stroke="#004a8d" 
                                  strokeWidth="3" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                />

                                {/* Graph Nodes (Circles) */}
                                {monthlyData.map((d, idx) => {
                                  const isActive = d.month === selectedMonth;
                                  const isHovered = hoveredTrendPoint && hoveredTrendPoint.month === d.month;
                                  return (
                                    <g 
                                      key={idx}
                                      onMouseEnter={() => setHoveredTrendPoint({ month: d.month, value: d.value, x: getX(idx), y: getY(d.value) })}
                                      onMouseLeave={() => setHoveredTrendPoint(null)}
                                    >
                                      {/* Invisible large hover area target */}
                                      <circle 
                                        cx={getX(idx)} 
                                        cy={getY(d.value)} 
                                        r="20" 
                                        fill="transparent" 
                                        className="cursor-pointer"
                                      />
                                      {/* Visible point circle */}
                                      <circle 
                                        cx={getX(idx)} 
                                        cy={getY(d.value)} 
                                        r={isActive || isHovered ? "6.5" : "3.5"} 
                                        className={`transition-all duration-200 cursor-pointer ${
                                          isActive 
                                            ? 'fill-[#005fb5] stroke-white stroke-2 shadow-md' 
                                            : isHovered
                                              ? 'fill-[#004a8d] stroke-white stroke-2 shadow-sm'
                                              : 'fill-white stroke-[#004a8d] stroke-2 hover:fill-slate-100'
                                        }`}
                                      />
                                      {/* Text value above points */}
                                      <text 
                                        x={getX(idx)} 
                                        y={getY(d.value) - (isActive || isHovered ? 9 : 6)} 
                                        textAnchor="middle" 
                                        className={`text-[8px] font-mono font-bold transition-all duration-200 ${
                                          isActive || isHovered ? 'fill-[#004a8d] text-[10px] font-black bg-white px-1' : 'fill-slate-500'
                                        }`}
                                      >
                                        {d.value.toFixed(0)}%
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>

                              {/* Beautiful Floating Interactive Tooltip */}
                              {hoveredTrendPoint && (
                                <div 
                                  className="absolute bg-slate-900/95 backdrop-blur-xs text-white p-2.5 rounded-xl shadow-xl border border-slate-700/50 pointer-events-none transition-all duration-150 ease-out z-50 text-center"
                                  style={{
                                    left: `${(hoveredTrendPoint.x / w) * 100}%`,
                                    top: `${(hoveredTrendPoint.y / h) * 100}%`,
                                    transform: 'translate(-50%, -125%)',
                                  }}
                                >
                                  {/* Tooltip arrow */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                  <div className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest">
                                    {hoveredTrendPoint.month}
                                  </div>
                                  <div className="text-sm font-bold mt-0.5">
                                    {hoveredTrendPoint.value.toFixed(1)}%
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5 leading-none">
                                    Purata Pencapaian
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Part D: Bar chart for raw achievement % of every KPI */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="mb-4">
                        <h4 className="text-base font-bold text-slate-800">Prestasi Pencapaian mengikut Penunjuk (KPI)</h4>
                        <p className="text-xs text-slate-400">Memaparkan tahap pencapaian (%) semasa bagi setiap KPI berbanding sasaran pada bulan {selectedMonth}.</p>
                      </div>

                      <div className="w-full">
                        {(() => {
                          const w = 750;
                          const h = 200;
                          const ml = 40;
                          const mr = 15;
                          const mt = 20;
                          const mb = 30;

                          const effW = w - ml - mr; // 695
                          const effH = h - mt - mb; // 150

                          const kpisCount = currentYearData.kpis.length;
                          const spacing = kpisCount > 0 ? (effW / kpisCount) : effW;
                          const barWidth = Math.min(32, spacing * 0.55);

                          return (
                            <div className="w-full relative">
                              <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto" className="mx-auto block overflow-visible max-h-[260px]">
                                {/* Grid lines */}
                                <line x1={ml} y1={mt} x2={ml + effW} y2={mt} stroke="#f1f5f9" />
                                <line x1={ml} y1={mt + effH * 0.25} x2={ml + effW} y2={mt + effH * 0.25} stroke="#f8fafc" strokeDasharray="3 3"/>
                                <line x1={ml} y1={mt + effH * 0.5} x2={ml + effW} y2={mt + effH * 0.5} stroke="#f1f5f9" />
                                <line x1={ml} y1={mt + effH * 0.75} x2={ml + effW} y2={mt + effH * 0.75} stroke="#fafafc" strokeDasharray="3 3"/>
                                <line x1={ml} y1={mt + effH} x2={ml + effW} y2={mt + effH} stroke="#cbd5e1" />

                                {/* Grid Y axis Labels */}
                                <text x={ml - 8} y={mt + 3} textAnchor="end" className="text-[8px] fill-slate-400 font-bold font-mono">100%</text>
                                <text x={ml - 8} y={mt + effH * 0.5 + 3} textAnchor="end" className="text-[8px] fill-slate-400 font-bold font-mono">50%</text>
                                <text x={ml - 8} y={mt + effH + 3} textAnchor="end" className="text-[8px] fill-slate-400 font-bold font-mono">0%</text>

                                {/* Bars loop */}
                                {currentYearData.kpis.map((kpi, idx) => {
                                  const ach = monthAchievementsGroup?.achievements[kpi.noKpi] || {
                                    pencapaian: 0.0,
                                    persenPencapaian: 0.0,
                                    persenPemberat: kpi.pemberat,
                                  };

                                  const pct = Math.min(100, Math.max(0, ach.persenPencapaian));
                                  const barH = (pct / 100) * effH;
                                  const barX = ml + (idx * spacing) + (spacing - barWidth) / 2;
                                  const barY = mt + effH - barH;

                                  // Calculate target position from Sasaran Akhir
                                  const targetPercent = Math.min(100, Math.max(0, kpi.sasaranAkhir));
                                  const targetY = mt + effH - (targetPercent / 100) * effH;

                                  // Decide color based on percentage
                                  const barColor = 
                                    pct >= 90 ? '#10b981' : // emerald-500
                                    pct >= 76 ? '#3b82f6' : // blue-500
                                    pct >= 41 ? '#f59e0b' : // amber-500
                                    '#f43f5e';             // rose-500

                                  const isHovered = hoveredBarKpi && hoveredBarKpi.id === kpi.id;
                                  const hasAnotherHovered = hoveredBarKpi && hoveredBarKpi.id !== kpi.id;

                                  return (
                                    <g 
                                      key={kpi.id}
                                      className="transition-all duration-200 cursor-pointer"
                                      onMouseEnter={() => setHoveredBarKpi({
                                        id: kpi.id,
                                        noKpi: kpi.noKpi,
                                        kpiText: kpi.kpi,
                                        pencapaian: ach.pencapaian,
                                        target: kpi.sasaran3,
                                        unit: kpi.pengukuran,
                                        persen: ach.persenPencapaian,
                                        pemberat: kpi.pemberat,
                                        x: barX + barWidth / 2,
                                        y: barY
                                      })}
                                      onMouseLeave={() => setHoveredBarKpi(null)}
                                    >
                                      {/* Bar Background for alignment & hover target */}
                                      <rect 
                                        x={barX - 4} 
                                        y={mt} 
                                        width={barWidth + 8} 
                                        height={effH} 
                                        fill={isHovered ? "rgba(14, 165, 233, 0.05)" : "#fbfafe"} 
                                        rx="6" 
                                        className="transition-all duration-200 opacity-50" 
                                      />
                                      {/* Bar */}
                                      <rect 
                                        x={barX} 
                                        y={barY} 
                                        width={barWidth} 
                                        height={barH} 
                                        fill={barColor}
                                        rx="4" 
                                        className={`transition-all duration-300 ease-out ${
                                          isHovered ? 'filter brightness-105' : hasAnotherHovered ? 'opacity-40' : 'hover:opacity-90'
                                        }`}
                                      />
                                      {/* Floating marker guideline for % Sasaran Akhir */}
                                      <line 
                                        x1={barX - 8} 
                                        y1={targetY} 
                                        x2={barX + barWidth + 8} 
                                        y2={targetY} 
                                        stroke="#f43f5e" 
                                        strokeWidth="1.5" 
                                        strokeDasharray="2.5 1.5"
                                        className={`transition-all duration-200 ${isHovered ? 'stroke-rose-500 opacity-100' : 'opacity-80'}`}
                                      />
                                      {/* Floating Badge representing the % Sasaran Akhir */}
                                      <rect
                                        x={barX + barWidth / 2 - 17}
                                        y={targetY - 10}
                                        width="34"
                                        height="9"
                                        rx="1.5"
                                        fill="#fff1f2"
                                        stroke="#fda4af"
                                        strokeWidth="0.5"
                                        className="shadow-3xs opacity-95"
                                      />
                                      <text
                                        x={barX + barWidth / 2}
                                        y={targetY - 3}
                                        textAnchor="middle"
                                        className="text-[6.5px] font-black font-mono fill-rose-600 tracking-tighter"
                                      >
                                        {kpi.sasaranAkhir.toFixed(0)}%
                                      </text>
                                      {/* Node Text */}
                                      <text 
                                        x={barX + barWidth / 2} 
                                        y={pct > 15 ? mt + effH - 6 : barY - 6} 
                                        textAnchor="middle" 
                                        className={`text-[9px] font-bold font-mono transition-all duration-200 ${
                                          pct > 15 ? 'fill-white' : 'fill-slate-800'
                                        } ${isHovered ? 'scale-110 font-black' : ''}`}
                                      >
                                        {ach.persenPencapaian.toFixed(0)}%
                                      </text>
                                      {/* X label */}
                                      <text 
                                        x={barX + barWidth / 2} 
                                        y={mt + effH + 15} 
                                        textAnchor="middle" 
                                        className={`text-[9px] font-bold font-mono transition-all duration-200 ${isHovered ? 'fill-sky-600 font-extrabold scale-105' : 'fill-[#004a8d]'}`}
                                      >
                                        {kpi.noKpi}
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>

                              {/* Beautiful Floating Interactive Tooltip */}
                              {hoveredBarKpi && (
                                <div 
                                  className="absolute bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/50 pointer-events-none transition-all duration-150 ease-out z-50 text-left w-72"
                                  style={{
                                    left: `${(hoveredBarKpi.x / w) * 100}%`,
                                    top: `${(hoveredBarKpi.y / h) * 100}%`,
                                    transform: 'translate(-50%, -112%)',
                                  }}
                                >
                                  {/* Tooltip arrow */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                  
                                  {/* Header */}
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                                    <span className="text-[10px] font-black text-sky-400 tracking-wider uppercase">
                                      {hoveredBarKpi.noKpi}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                                      Pemberat: {hoveredBarKpi.pemberat.toFixed(1)}%
                                    </span>
                                  </div>

                                  {/* KPI Text Description */}
                                  <div className="text-[10.5px] text-slate-200 font-medium leading-relaxed mb-2">
                                    {hoveredBarKpi.kpiText}
                                  </div>

                                  {/* Progress / Values */}
                                  <div className="space-y-1 pt-1.5 border-t border-slate-800">
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-slate-400">Pencapaian:</span>
                                      <span className="font-bold text-emerald-400 font-mono">
                                        {hoveredBarKpi.pencapaian.toLocaleString()} {hoveredBarKpi.unit}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-slate-400">Sasaran:</span>
                                      <span className="font-bold text-slate-300 font-mono">
                                        {hoveredBarKpi.target.toLocaleString()} {hoveredBarKpi.unit}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-[10px] pt-1 border-t border-slate-800/50">
                                      <span className="text-slate-400">Peratus Pencapaian:</span>
                                      <span className="font-extrabold text-sky-400 font-mono">
                                        {hoveredBarKpi.persen.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                  </div>

                  {/* ROW 3: STACKED Performance Widgets (divided 2 stacks set in middle) */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="text-center mb-6">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#004a8d] bg-[#004a8d]/10 px-3 py-1 rounded-full font-mono">Widget Kedudukan KPI</span>
                      <h4 className="text-lg font-bold text-slate-800 mt-2">All KPI Performance Widgets</h4>
                      <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1">Ringkasan cepat pencapaian, komponen strategik dan label kata kunci bagi setiap Petunjuk untuk rujukan visual tersuai.</p>
                    </div>

                    {/* Highly polished centered responsive vertical card flexbox wrap layout */}
                    <div className="flex flex-wrap gap-4 justify-center max-w-5xl mx-auto w-full">
                      {currentYearData.kpis.map((kpi, idx) => {
                        const ach = monthAchievementsGroup?.achievements[kpi.noKpi] || {
                          pencapaian: 0.0,
                          persenPencapaian: 0.0,
                          persenPemberat: kpi.pemberat,
                          statusPencapaian: 'Belum Dilaksanakan'
                        };

                        // Helper to extract clean keywords dynamically
                        const cleanText = kpi.kpi.trim().replace(/\s+/g, ' ');
                        const words = cleanText.split(' ').filter(w => w.length > 0);
                        const wordCount = words.length;
                        const keyWord = wordCount <= 3 
                          ? words.join(' ') 
                          : words.slice(0, 3).join(' ') + '...';

                        const strokeColorClass = 
                          ach.persenPencapaian >= 90 ? 'text-emerald-500 stroke-emerald-500' :
                          ach.persenPencapaian >= 76 ? 'text-blue-500 stroke-blue-500' :
                          ach.persenPencapaian >= 41 ? 'text-amber-500 stroke-amber-500' :
                          'text-[#f92f60] stroke-rose-500';

                        const borderGradeColor = 
                          ach.persenPencapaian >= 90 ? '#10b981' :
                          ach.persenPencapaian >= 76 ? '#3b82f6' :
                          ach.persenPencapaian >= 41 ? '#f59e0b' :
                          '#f92f60';

                        return (
                          <div 
                            key={kpi.id} 
                            onClick={() => setSelectedKpiForModal(kpi)}
                            style={{ height: '150px', width: '140px', borderColor: borderGradeColor }}
                            className="bg-white rounded-[32px] border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.04)] hover:scale-[1.03] transition-all duration-300 flex flex-col items-center justify-between text-center group cursor-pointer"
                          >
                            {/* KPI No */}
                            <div className="pt-1">
                              <span style={{ fontSize: '14px' }} className="uppercase font-mono font-bold text-slate-400 tracking-widest">
                                {kpi.noKpi}
                              </span>
                            </div>

                            {/* KPI Name/Keyword */}
                            <div className="flex-1 flex items-center justify-center py-1">
                              <span style={{ fontSize: '12px', textAlign: 'center' }} className="font-extrabold text-[#0f2e5c] block leading-tight px-1 group-hover:text-[#004a8d] transition-colors" title={kpi.kpi}>
                                {keyWord}
                              </span>
                            </div>

                            {/* KPI Percentage */}
                            <div className="pb-1">
                              <span style={{ fontSize: '18px' }} className={`font-black font-mono tracking-tight block ${strokeColorClass}`}>
                                {ach.persenPencapaian.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}


            </div>
          )}

          {/* TAB 1.5: LAPORAN PRESTASI (REPORTS & KPI LIST) */}
          {activeTab === 'LAPORAN' && (
            <div className="space-y-6">
              
              {/* Laporan Header Card with Export Actions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-1/4 bg-gradient-to-l from-[#004a8d]/5 to-transparent pointer-events-none rounded-r-2xl"></div>
                <div className="space-y-1 relative z-10">
                  <div className="inline-flex items-center space-x-2 bg-[#004a8d]/10 text-[#004a8d] px-2.5 py-1 rounded-full text-xs font-bold font-mono">
                    <span>LAPORAN KORPORAT</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Laporan Prestasi Petunjuk Strategik Korporat SPAN Tahun {selectedYear}
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal max-w-xl">
                    Paparan data audit, wajaran pemberat, dan peratusan kemajuan terperinci bagi bulan <b>{selectedMonth}</b> di bawah seliaan kementerian. Sedia untuk dieksport atau dicetak.
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 relative z-10">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-xs transition-colors"
                  >
                    <FileText className="h-4 w-4 text-sky-500" />
                    <span>Cetak Laporan</span>
                  </button>
                </div>
              </div>

              {/* Table of active KPIs in Laporan */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">Senarai Penunjuk Prestatif (KPI Semasa)</h4>
                    <p className="text-xs text-slate-400">Senarai penuh KPI korporat diluluskan di bawah penyeliaan dan wajaran bahagian.</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500 w-48"
                      placeholder="Cari KPI / Bahagian..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 outline-none"
                      value={filterKomponen}
                      onChange={(e) => setFilterKomponen(e.target.value)}
                    >
                      <option value="SEMUA">Semua Komponen</option>
                      {KOMPONEN_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0f172a] text-slate-200 font-semibold tracking-wider font-mono">
                      <tr>
                        <th className="p-4 border-b border-slate-700 text-center">NO. KPI</th>
                        <th className="p-4 border-b border-slate-700">KOMPONEN & TERAS SSP</th>
                        <th className="p-4 border-b border-slate-700">BIDANG UTAMA</th>
                        <th className="p-4 border-b border-slate-700 w-[200px] min-w-[200px]">OBJEKTIF STRATEGIK & KPI</th>
                        <th className="p-4 border-b border-slate-700">BAHAGIAN PELAKSANA</th>
                        <th className="p-4 border-b border-slate-700 text-center">PEMBERAT</th>
                        <th className="p-4 border-b border-slate-700 text-center">PENCAPAIAN ({selectedMonth})</th>
                        <th className="p-4 border-b border-slate-700 text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredKpiItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            Tiada KPI ditemui yang mematuhi carian atau komponen.
                          </td>
                        </tr>
                      ) : (
                        filteredKpiItems.map((item) => {
                          const ach = monthAchievementsGroup?.achievements[item.noKpi] || {
                            pencapaian: 0.0,
                            persenPencapaian: 0.0,
                            persenPemberat: item.pemberat,
                            persenPencapaianSebenar: 0.0,
                            statusPencapaian: 'Tiada Pengisian'
                          };

                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-bold text-slate-900 font-mono text-center">
                                <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                                  {item.noKpi}
                                </span>
                              </td>
                              <td className="p-4 space-y-1">
                                <span className="font-semibold text-slate-800 block text-xs">{item.komponen}</span>
                                <span className="text-[10px] text-slate-400 font-mono block leading-tight">{item.noSsp}</span>
                              </td>
                              <td className="p-4">
                                <span className="bg-sky-50 text-sky-800 border border-sky-100 text-[10px] px-2 py-0.5 rounded font-medium">
                                  {item.bidangUtama}
                                </span>
                              </td>
                              <td className="p-4 max-w-sm space-y-1">
                                <div className="text-slate-500 font-semibold leading-tight text-[11px]">{item.objektif}</div>
                                <div className="text-slate-900 font-extrabold tracking-tight text-xs uppercase">{item.kpi}</div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1 max-w-[170px]">
                                  {item.bahagian.map((b) => (
                                    <span key={b} className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-[9px] font-mono leading-none border border-slate-200">
                                      {b.replace('BAHAGIAN ', '')}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 text-center font-bold font-mono text-slate-700">
                                {item.pemberat.toFixed(1)}%
                              </td>
                              <td className="p-4 text-center font-bold font-mono">
                                <div className="space-y-0.5">
                                  <span className="text-sky-700 text-sm">
                                    {ach.pencapaian.toFixed(1)}
                                  </span>
                                  <span className="block text-[10px] text-slate-400">
                                    ({ach.persenPencapaian.toFixed(1)}%)
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`text-[10px] font-bold ${
                                  ach.statusPencapaian === 'Tiada Pengisian' || ach.statusPencapaian === 'Belum Dilaksanakan'
                                    ? 'text-slate-400'
                                    : 'text-emerald-600'
                                }`}>
                                  {ach.statusPencapaian}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: KERANGKA STRATEGIK KPI (SCORE CARD CREATION) */}
          {activeTab === 'KERANGKA' && (
            <div className="space-y-6">
              
              {/* Year context banner & Setup */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-950 flex items-center">
                    <ClipboardList className="h-5 w-5 mr-3 text-sky-500" />
                    Kerangka Strategik & Score Card KPI Tahun {selectedYear}
                  </h3>
                  <p className="text-xs text-slate-400 leading-normal mt-1">
                    Pastikan jumlah peratus wajaran <b>% PEMBERAT</b> bersamaan tepat <b>100.0%</b> sebelum menghantar Kerangka ini ke peringkat pimpinan.
                  </p>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    id="btn_set_year"
                    onClick={() => {
                      setYearInputVal(selectedYear);
                      setIsKpiYearOpen(true);
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-xs"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>KPI YEAR: {selectedYear}</span>
                  </button>

                  <button
                    id="btn_add_kpi"
                    onClick={() => {
                      if (currentYearData.isSubmitted) {
                        showToast('Kerangka tahun ini telah DISAHKAN dan DIKUNCI. Anda tidak boleh menambah atau meminda KPI.', 'error');
                        return;
                      }
                      // Reset fields to empty/default when opening clean form
                      setFormKomponen('Kewangan');
                      setFormTerasSsp('Teras 1- Kemampanan Kewangan');
                      setFormBidangUtama('Kawalselia Ekonomi');
                      setFormBahagianList([]);
                      setFormObjektif('');
                      setFormKpiText('');
                      setFormInisiatif('');
                      setFormPengukuran('');
                      setFormStatusSebelum('');
                      setFormSasaran1(0);
                      setFormJustifikasi1('');
                      setFormSasaran2(0);
                      setFormJustifikasi2('');
                      setFormSasaran3(0);
                      setFormJustifikasi3('');
                      setFormSasaran4(0);
                      setFormJustifikasi4('');
                      setFormSasaranAkhir(0);
                      setFormPemberat(10);
                      setEditingKpiId(null);
                      setIsAddKpiOpen(true);
                    }}
                    className={`font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-md ${
                      currentYearData.isSubmitted
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/15'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>TAMBAH KPI</span>
                  </button>
                </div>
              </div>

              {/* KPI Score Card Form Panel (Slide-out or Collapsible Box) */}
              {isAddKpiOpen && (
                <div id="kpi_form_panel" className="bg-white rounded-2xl border-2 border-sky-500 p-6 shadow-lg transition-all">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                        {editingKpiId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">
                          {editingKpiId 
                            ? `Borang Kemaskini Penunjuk Prestasi Korporat (${currentYearData.kpis.find(k => k.id === editingKpiId)?.noKpi || 'KPI'})`
                            : `Borang Tambah Penunjuk Prestasi Korporat Baru (${selectedYear})`
                          }
                        </h4>
                        <p className="text-xs text-slate-400">Pengisian standard kualitatif score card dilesenkan oleh petunjuk SPAN</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsAddKpiOpen(false);
                        setEditingKpiId(null);
                      }} 
                      className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5 text-slate-400" />
                    </button>
                  </div>

                  <form onSubmit={handleDoneKpi} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      
                      {/* Component */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase">KOMPONEN</label>
                        <select
                          required
                          value={formKomponen}
                          onChange={(e) => setFormKomponen(e.target.value as KomponenType)}
                          className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none"
                        >
                          {KOMPONEN_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Teras SSP */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase">TERAS SSP2030</label>
                        <select
                          required
                          value={formTerasSsp}
                          onChange={(e) => setFormTerasSsp(e.target.value as TerasSspType)}
                          className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none"
                        >
                          {TERAS_SSP_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Bidang Utama */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase">BIDANG UTAMA</label>
                        <select
                          required
                          value={formBidangUtama}
                          onChange={(e) => setFormBidangUtama(e.target.value as BidangUtamaType)}
                          className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none"
                        >
                          {BIDANG_UTAMA_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* Shared Bahagian Selector */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                      <div>
                        <span className="block text-xs font-extrabold text-slate-900 uppercase">BAHAGIAN INTEGRATED (Kongsi Unit)</span>
                        <p className="text-[10px] text-slate-400">Pilih satu atau lebih bahagian pemilik/pelaksana KPI ini</p>
                      </div>

                      <div className="flex flex-wrap gap-2.5 items-center">
                        <select
                          value={formSelectedBahagianToAdd}
                          onChange={(e) => setFormSelectedBahagianToAdd(e.target.value as BahagianType)}
                          className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none max-w-xs"
                        >
                          {BAHAGIAN_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={addBahagianToForm}
                          className="bg-white hover:bg-slate-100 text-sky-700 border border-sky-300 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                        >
                          + Tambah Bahagian
                        </button>
                      </div>

                      {/* Added Bahagian Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {formBahagianList.length === 0 ? (
                          <span className="text-xs text-rose-500 italic font-medium">Sila tambah sekurang-kurangnya SATU bahagian pelaksana</span>
                        ) : (
                          formBahagianList.map(b => (
                            <span 
                              key={b} 
                              className="inline-flex items-center space-x-1.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg px-2.5 py-1 text-xs font-semibold"
                            >
                              <span>{b}</span>
                              <button 
                                type="button" 
                                onClick={() => removeBahagianFromForm(b)} 
                                className="text-sky-500 hover:text-sky-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Basic Descriptors */}
                    <div className="space-y-4">
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase">OBJEKTIF</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Contoh: Memastikan pengurusan sisa kumbahan mematuhi kawalan kualiti..."
                          value={formObjektif}
                          onChange={(e) => setFormObjektif(e.target.value)}
                          onBlur={() => setFormObjektif(handleCapitalizeEachWord(formObjektif))}
                          className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase">INISIATIF</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Tindakan mendedikasikan kawalan..."
                          value={formInisiatif}
                          onChange={(e) => setFormInisiatif(e.target.value)}
                          onBlur={() => setFormInisiatif(handleCapitalizeEachWord(formInisiatif))}
                          className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none resize-y font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase">PETUNJUK PRESTASI UTAMA - KPI</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Contoh: PERATUS GANTIAN PAIP RETIKULASI KEPURBAAN DI NEGERI..."
                            value={formKpiText}
                            onChange={(e) => setFormKpiText(e.target.value)}
                            onBlur={() => setFormKpiText(handleUppercase(formKpiText))}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none resize-y font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase">PENGUKURAN</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Bilangan program dilaksanakan..."
                            value={formPengukuran}
                            onChange={(e) => setFormPengukuran(e.target.value)}
                            onBlur={() => setFormPengukuran(handleCapitalizeEachWord(formPengukuran))}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none resize-y"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase">STATUS PENCAPAIAN TAHUN SEBELUM</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Mencapai sasaran 85%..."
                            value={formStatusSebelum}
                            onChange={(e) => setFormStatusSebelum(e.target.value)}
                            onBlur={() => setFormStatusSebelum(handleCapitalizeEachWord(formStatusSebelum))}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none resize-y"
                          />
                        </div>
                      </div>

                    </div>

                    {/* Sasaran 1 to 4 with Justifications */}
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-4">
                      
                      <div className="flex items-center space-x-2 text-slate-700 pb-2 border-b border-slate-200">
                        <TrendingUp className="h-4 w-4 text-sky-500" />
                        <span className="text-xs font-bold uppercase">Sasaran Berperingkat Seksyen</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        {/* S1 */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500">SASARAN 1 (cth: 30.5)</label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={formSasaran1}
                            onChange={(e) => setFormSasaran1(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                          />
                          <textarea
                            rows={2}
                            placeholder="Justifikasi S1"
                            required
                            value={formJustifikasi1}
                            onChange={(e) => setFormJustifikasi1(e.target.value)}
                            onBlur={() => setFormJustifikasi1(handleCapitalizeEachWord(formJustifikasi1))}
                            className="w-full text-[10px] border border-slate-300 rounded-lg px-2 py-1 bg-white mt-1.5 resize-y"
                          />
                        </div>

                        {/* S2 */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500">SASARAN 2</label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={formSasaran2}
                            onChange={(e) => setFormSasaran2(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                          />
                          <textarea
                            rows={2}
                            placeholder="Justifikasi S2"
                            required
                            value={formJustifikasi2}
                            onChange={(e) => setFormJustifikasi2(e.target.value)}
                            onBlur={() => setFormJustifikasi2(handleCapitalizeEachWord(formJustifikasi2))}
                            className="w-full text-[10px] border border-slate-300 rounded-lg px-2 py-1 bg-white mt-1.5 resize-y"
                          />
                        </div>

                        {/* S3 */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500">SASARAN 3</label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={formSasaran3}
                            onChange={(e) => setFormSasaran3(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                          />
                          <textarea
                            rows={2}
                            placeholder="Justifikasi S3"
                            required
                            value={formJustifikasi3}
                            onChange={(e) => setFormJustifikasi3(e.target.value)}
                            onBlur={() => setFormJustifikasi3(handleCapitalizeEachWord(formJustifikasi3))}
                            className="w-full text-[10px] border border-slate-300 rounded-lg px-2 py-1 bg-white mt-1.5 resize-y"
                          />
                        </div>

                        {/* S4 */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500">SASARAN 4</label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={formSasaran4}
                            onChange={(e) => setFormSasaran4(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                          />
                          <textarea
                            rows={2}
                            placeholder="Justifikasi S4"
                            required
                            value={formJustifikasi4}
                            onChange={(e) => setFormJustifikasi4(e.target.value)}
                            onBlur={() => setFormJustifikasi4(handleCapitalizeEachWord(formJustifikasi4))}
                            className="w-full text-[10px] border border-slate-300 rounded-lg px-2 py-1 bg-white mt-1.5 resize-y"
                          />
                        </div>

                      </div>
                    </div>

                    {/* Weight & Final Target */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase">% SASARAN AKHIR</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={formSasaranAkhir}
                          onChange={(e) => setFormSasaranAkhir(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase">% PEMBERAT</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={formPemberat}
                          onChange={(e) => setFormPemberat(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none font-mono font-bold"
                        />
                      </div>

                    </div>

                    {/* Submit Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddKpiOpen(false)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                      >
                        Batal
                      </button>

                      <button
                        type="submit"
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-sky-600/10"
                      >
                        <Check />
                        <span>DONE</span>
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {/* Kerangka KPI score card table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                
                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">Senarai Markat Petunjuk Strategik (Score Card)</h4>
                    <p className="text-xs text-slate-400">Pastikan % PEMBERAT di bahagian bawah adalah tepat 100.0% sebelum diserahkan.</p>
                  </div>

                  {/* Submission Label Status */}
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-500">Kontekstual:</span>
                    {currentYearData.isSubmitted ? (
                      <div className="flex items-center space-x-2">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-bold flex items-center">
                          <Lock className="h-3 w-3 mr-1" /> DERAFT DIKUNCI / SUBMITTED
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsUnlockModalOpen(true)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg px-2.5 py-1 text-xs font-bold flex items-center transition-all shadow-xs cursor-pointer"
                          title="Buka Kunci Kerangka"
                        >
                          <Unlock className="h-3 w-3 mr-1" /> Buka Kunci / Unlock
                        </button>
                      </div>
                    ) : (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-2.5 py-1 text-xs font-bold flex items-center animate-pulse">
                        <Edit2 className="h-3 w-3 mr-1" /> MOD DERAFT (Sedia Diedit)
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0f172a] text-slate-200 font-semibold font-mono">
                      <tr>
                        <th className="p-4 border-b border-slate-700">NO. KPI</th>
                        <th className="p-4 border-b border-slate-700">KOMPONEN & TERAS</th>
                        <th className="p-4 border-b border-slate-700">OBJEKTIF & KPI</th>
                        <th className="p-4 border-b border-slate-700 text-center">SASARAN 1</th>
                        <th className="p-4 border-b border-slate-700 text-center">SASARAN 2</th>
                        <th className="p-4 border-b border-slate-700 text-center">SASARAN 3</th>
                        <th className="p-4 border-b border-slate-700 text-center">SASARAN 4</th>
                        <th className="p-4 border-b border-slate-700 text-center">SASARAN AKHIR</th>
                        <th className="p-4 border-b border-slate-700 text-center">PEMBERAT</th>
                        {!currentYearData.isSubmitted && <th className="p-4 border-b border-slate-700 text-center">TINDAKAN</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentYearData.kpis.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-12 text-center text-slate-400">
                            <Plus className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm">Tiada KPI disetkan bagi tahun {selectedYear}.</p>
                            <button 
                              onClick={async () => {
                                // Clone mock data template to populate immediately if they want
                                const updatedData: kpiYearData = {
                                  ...currentYearData,
                                  kpis: INITIAL_MOCK_KPIS,
                                  monthlyAchievements: generateInitialAchievements(INITIAL_MOCK_KPIS)
                                };
                                setYearRecords(prev => ({
                                  ...prev,
                                  [selectedYear]: updatedData
                                }));
                                try {
                                  await setDoc(doc(db, 'yearRecords', String(selectedYear)), updatedData);
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.WRITE, `yearRecords/${selectedYear}`);
                                }
                                showToast('Templat Penunjuk SPAN dimuat turun ke dalam Kerangka kpi tahun semasa!', 'success');
                              }}
                              className="mt-3 text-xs text-sky-600 hover:underline font-bold bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200"
                            >
                              Suaikan dari Templat Standard SPAN
                            </button>
                          </td>
                        </tr>
                      ) : (
                        currentYearData.kpis.map((kpi) => (
                          <tr key={kpi.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-900 font-mono text-center">
                              {kpi.noKpi}
                            </td>
                            <td className="p-4 space-y-1">
                              <span className="font-semibold text-slate-800 block text-[11px] leading-tight">{kpi.komponen}</span>
                              <span className="text-[9px] text-slate-400 font-mono block leading-tight">{kpi.noSsp}</span>
                              <span className="bg-sky-50 text-sky-800 border border-sky-100 text-[9px] px-1.5 py-0.5 rounded font-medium inline-block mt-1">
                                {kpi.bidangUtama}
                              </span>
                            </td>
                            <td className="p-4 max-w-sm space-y-1">
                              <div className="text-slate-500 font-semibold leading-tight text-[11px]" title={kpi.objektif}>{kpi.objektif}</div>
                              <div className="text-slate-900 font-extrabold tracking-tight text-xs uppercase" title={kpi.kpi}>{kpi.kpi}</div>
                              {kpi.bahagian.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {kpi.bahagian.map(b => (
                                    <span key={b} className="bg-slate-100 text-slate-500 font-mono font-medium rounded text-[8px] px-1.5 py-0.5 leading-none">
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            
                            {/* Sasaran 1 & justifikasi */}
                            <td className="p-4 text-center relative group">
                              <span className="font-mono font-bold text-slate-800 block text-[14px]">{kpi.sasaran1.toFixed(1)}</span>
                              <span className="text-[9px] text-slate-400 block max-w-[80px] mx-auto truncate font-medium cursor-help hover:text-slate-650 transition-colors" title={kpi.justifikasiSasaran1}>{kpi.justifikasiSasaran1}</span>
                              {kpi.justifikasiSasaran1 && (
                                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur-xs text-white text-[10px] p-2 rounded-xl shadow-xl z-50 text-center leading-relaxed font-sans font-normal border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-250 block before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-900">
                                  {kpi.justifikasiSasaran1}
                                </div>
                              )}
                            </td>

                            {/* Sasaran 2 & justifikasi */}
                            <td className="p-4 text-center relative group">
                              <span className="font-mono font-bold text-slate-800 block text-[14px]">{kpi.sasaran2.toFixed(1)}</span>
                              <span className="text-[9px] text-slate-400 block max-w-[80px] mx-auto truncate font-medium cursor-help hover:text-slate-650 transition-colors" title={kpi.justifikasiSasaran2}>{kpi.justifikasiSasaran2}</span>
                              {kpi.justifikasiSasaran2 && (
                                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur-xs text-white text-[10px] p-2 rounded-xl shadow-xl z-50 text-center leading-relaxed font-sans font-normal border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-250 block before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-900">
                                  {kpi.justifikasiSasaran2}
                                </div>
                              )}
                            </td>

                            {/* Sasaran 3 & justifikasi */}
                            <td className="p-4 text-center bg-sky-50/50 relative group">
                              <span className="font-mono font-bold text-sky-900 block text-[14px]">{kpi.sasaran3.toFixed(1)}</span>
                              <span className="text-[9px] text-sky-800/80 block max-w-[80px] mx-auto truncate font-semibold cursor-help hover:text-sky-900 transition-colors" title={kpi.justifikasiSasaran3}>{kpi.justifikasiSasaran3}</span>
                              {kpi.justifikasiSasaran3 && (
                                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur-xs text-white text-[10px] p-2 rounded-xl shadow-xl z-50 text-center leading-relaxed font-sans font-normal border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-250 block before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-900">
                                  {kpi.justifikasiSasaran3}
                                </div>
                              )}
                            </td>

                            {/* Sasaran 4 & justifikasi */}
                            <td className="p-4 text-center relative group">
                              <span className="font-mono font-bold text-slate-800 block text-[14px]">{kpi.sasaran4.toFixed(1)}</span>
                              <span className="text-[9px] text-slate-400 block max-w-[80px] mx-auto truncate font-medium cursor-help hover:text-slate-650 transition-colors" title={kpi.justifikasiSasaran4}>{kpi.justifikasiSasaran4}</span>
                              {kpi.justifikasiSasaran4 && (
                                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur-xs text-white text-[10px] p-2 rounded-xl shadow-xl z-50 text-center leading-relaxed font-sans font-normal border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-250 block before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-900">
                                  {kpi.justifikasiSasaran4}
                                </div>
                              )}
                            </td>

                            {/* Final sasaran */}
                            <td className="p-4 text-center font-bold font-mono text-[14px] text-slate-800">
                              {kpi.sasaranAkhir.toFixed(1)}%
                            </td>

                            {/* Pemberat */}
                            <td className="p-4 text-center font-extrabold font-mono text-[14px] text-slate-900 bg-slate-50/35">
                              {kpi.pemberat.toFixed(1)}%
                            </td>

                            {/* Actions if draft only */}
                            {!currentYearData.isSubmitted && (
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => handleStartEditKpi(kpi)}
                                    className="p-1.5 text-sky-600 hover:text-white hover:bg-sky-600 rounded-lg transition-all"
                                    title="Edit data KPI"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveKpi(kpi.id, kpi.noKpi)}
                                    className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all"
                                    title="Gugurkan KPI dari Kerangka"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>

                    {/* Bottom Total Rows */}
                    {currentYearData.kpis.length > 0 && (
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                        <tr>
                          <td colSpan={2} className="p-4 font-extrabold text-slate-800 text-right uppercase">
                            JUMLAH KESELURUHAN
                          </td>
                          <td className="p-4 text-slate-500 text-xs">
                            Kompilasi {kpiCount} Petunjuk Utama
                          </td>
                          <td colSpan={4}></td>
                          <td className="p-4 text-center text-slate-800 font-mono text-xs">
                            <span className="block text-[8px] text-slate-400 font-mono uppercase font-normal leading-none mb-1">Purata Sasaran</span>
                            <b className="text-[14px]">{purataSasaranAkhir.toFixed(1)}%</b>
                          </td>
                          <td 
                            className={`p-4 text-center font-mono ${
                              Math.abs(totalPemberat - 100.0) < 0.01 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            <span className="block text-[8px] text-slate-500 font-mono uppercase font-normal leading-none mb-1">Total Pemberat</span>
                            <span className="text-sm font-black">
                              {totalPemberat.toFixed(1)}%
                            </span>
                            {/* Alert indicator if Pemberat is not 100% */}
                            {Math.abs(totalPemberat - 100.0) >= 0.01 && (
                              <span className="block text-[8px] mt-0.5 font-bold uppercase tracking-wider animate-pulse">
                                Ralat Wajaran!
                              </span>
                            )}
                          </td>
                          {!currentYearData.isSubmitted && <td></td>}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Submit Panel at bottom for drafts */}
                {currentYearData.kpis.length > 0 && !currentYearData.isSubmitted && (
                  <div className="p-5 border-t border-slate-100 bg-[#f8fafc] flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-2.5 text-xs text-slate-600">
                      {Math.abs(totalPemberat - 100.0) < 0.01 ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          <span>Jumlah wajaran pemberat diisi dengan sempurna (100.0%). Kerangka sedia dikunci.</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 animate-bounce" />
                          <span className="text-rose-600 font-semibold">
                            Sila pastikan jumlah wajaran pemberat adalah tepat 100.0% sebelum submit (Kurang/Lebih: { (100 - totalPemberat).toFixed(1) }%).
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      id="btn_submit_kerangka"
                      onClick={handleSubmitKerangka}
                      className={`font-extrabold px-6 py-3 rounded-xl text-xs flex items-center space-x-2 shadow-lg transition-all ${
                        Math.abs(totalPemberat - 100.0) < 0.01
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <FileCheck className="h-4 w-4" />
                      <span>SUBMIT KERANGKA {selectedYear}</span>
                    </button>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 3: PENCAPAIAN BULANAN (MONTHLY TRACKING) */}
          {activeTab === 'PENCAPAIAN' && (
            <div className="space-y-6">
              
              {/* Kerangka missing guard */}
              {currentYearData.kpis.length === 0 ? (
                <div className="bg-white rounded-2xl border border-rose-100 p-8 text-center max-w-xl mx-auto shadow-sm space-y-4 pt-12">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-900">Kerangka KPI Tidak Ditemui</h3>
                  <p className="text-xs text-slate-500">
                    Sila lengkapkan fasa penetapan Kerangka KPI strategik di panel <b>KERANGKA KPI</b> terlebih dahulu sebelum mengisi atau mengaudit pencapaian bulanan.
                  </p>
                  <button 
                    onClick={() => setActiveTab('KERANGKA')}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    Set Kerangka Sekarang
                  </button>
                </div>
              ) : (
                <>
                  {/* Lock Warning Banner if Draft */}
                  {!currentYearData.isSubmitted && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 animate-bounce" />
                      <div>
                        <span className="block text-xs font-bold text-amber-900">Perhatian: Mod Deraft Kerangka</span>
                        <p className="text-[11px] text-amber-800 leading-normal">
                          Kerangka KPI belum disahkan secara rasmi (SUBMIT). Anda dibenarkan melakukan simulasi isi, tetapi amat disyorkan untuk meluluskan ralat Kerangka di tab <b>KERANGKA KPI</b> supaya ia dikunci mengikut regulasi SPAN.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Google Sheets Integration Card */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-emerald-600 text-white p-2.5 rounded-xl flex-shrink-0 shadow-md">
                          <FileCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-emerald-900">Integrasi Data Google Sheets ({selectedMonth})</span>
                          <p className="text-xs text-emerald-700 leading-normal max-w-2xl">
                            Pautkan sistem KPI anda terus ke Google Sheets untuk memuat naik pencapaian bulanan secara automatik. Sediakan helaian mengandungi No KPI (cth: <b>KPI 1</b>), Nilai Pencapaian (nombor), dan ulasan status (pilihan).
                          </p>
                        </div>
                      </div>

                      {sheetsUser && (
                        <div className="flex items-center space-x-2 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Dipautkan: {sheetsUser.email}</span>
                          <button
                            onClick={handleGoogleSheetsLogout}
                            className="text-emerald-950 underline hover:text-rose-600 ml-1.5 font-bold transition-all"
                            title="Tamatkan pautan akaun"
                          >
                            Tamatkan
                          </button>
                        </div>
                      )}
                    </div>

                    {!sheetsUser && (
                      <div className="pt-2">
                        <button
                          id="google_sheets_signin_btn"
                          onClick={handleGoogleSheetsLogin}
                          className="bg-white text-slate-700 font-bold border border-slate-300 rounded-xl px-5 py-2.5 inline-flex items-center space-x-3 hover:bg-slate-50 transition-all font-sans text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                          </svg>
                          <span className="text-sm">Pautkan Akaun Google untuk Google Sheets</span>
                        </button>
                      </div>
                    )}

                    {sheetsUser && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1 items-end">
                        <div className="md:col-span-6 space-y-1 bg-white p-3 rounded-xl border border-emerald-100/80">
                          <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">ID atau URL Google Spreadsheet</label>
                          <input
                            id="sheets_spreadsheet_id_input"
                            type="text"
                            value={spreadsheetIdInput}
                            onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                            placeholder="Sila tampal ID helaian atau URL pautan Google Sheets..."
                            className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1 bg-white p-3 rounded-xl border border-emerald-100/80">
                          <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Tab & Julat Lajur</label>
                          <input
                            id="sheets_range_input"
                            type="text"
                            value={sheetRangeInput}
                            onChange={(e) => setSheetRangeInput(e.target.value)}
                            placeholder="Contoh: JANUARY!A1:C50"
                            className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <button
                            id="sheets_import_action_btn"
                            onClick={handleImportFromGoogleSheets}
                            disabled={isSyncingWithSheets}
                            className={`w-full text-xs font-bold text-white px-5 py-3 h-[46px] rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all ${
                              isSyncingWithSheets
                                ? 'bg-emerald-700 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                            }`}
                          >
                            <RefreshCw className={`h-4 w-4 ${isSyncingWithSheets ? 'animate-spin' : ''}`} />
                            <span>{isSyncingWithSheets ? 'MEMPROSES...' : 'MUAT NAIK DATA'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Horizontal Months Timeline Selector */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div>
                      <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Timeline Kemaskini Bulanan ({selectedYear})</span>
                      <p className="text-[10px] text-slate-400">Pilih bulan tertentu bagi melihat, mengedit, memasukkan pencapaian & memautkan fail sokongan</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 pt-2">
                      {MONTHS_LIST.map((m) => {
                        const monthGrp = currentYearData.monthlyAchievements[m];
                        const isSelected = selectedMonth === m;
                        const isEdited = monthGrp?.isEdited;

                        return (
                          <button
                            key={m}
                            onClick={() => setSelectedMonth(m)}
                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col justify-between items-center h-20 ${
                              isSelected
                                ? 'bg-sky-600 text-white border-sky-600 font-bold scale-102 ring-4 ring-sky-500/10 shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="text-[10px] uppercase tracking-wider font-bold">
                              {m.substring(0, 3)}
                            </span>
                            
                            <div className="pt-2">
                              {isEdited ? (
                                <span className={`h-2.5 w-2.5 rounded-full block border ${
                                  isSelected ? 'bg-white border-sky-600' : 'bg-emerald-500 border-white'
                                }`}></span>
                              ) : (
                                <span className="h-2.5 w-2.5 rounded-full block bg-slate-300 border border-white"></span>
                              )}
                            </div>
                            
                            <span className={`text-[7px] uppercase tracking-tighter leading-none block font-semibold ${
                              isEdited 
                                ? (isSelected ? 'text-emerald-200 font-extrabold' : 'text-emerald-600 font-extrabold') 
                                : ''
                            }`}>
                              {isEdited ? 'Telah Dikemaskini' : 'Sedia Dikemaskini'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Month Data Entry List */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h4 className="text-base font-bold text-slate-800">
                          Borang Pemantauan Pencapaian Bulan: <span className="text-sky-700 underline font-mono uppercase">{selectedMonth}</span>
                        </h4>
                        <p className="text-xs text-slate-400">Gunakan butang <b>EDIT</b> di lajur hujung untuk mula mengisi dan mengemukakan dokumen rujukan.</p>
                      </div>

                      {(() => {
                        const styles = totalWeightedProgress >= 91.0
                          ? { bg: 'bg-[#e2f0d9]/70', text: 'text-[#385723]', border: 'border-[#c5e0b4]' }
                          : totalWeightedProgress >= 71.0
                          ? { bg: 'bg-[#e0ebf9]/70', text: 'text-[#004a8d]', border: 'border-[#adcbf2]' }
                          : totalWeightedProgress >= 21.0
                          ? { bg: 'bg-[#fef3c7]/70', text: 'text-[#b45309]', border: 'border-[#fde68a]' }
                          : { bg: 'bg-[#ffe4e6]/70', text: 'text-[#be123c]', border: 'border-[#fecdd3]' };

                        return (
                          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
                            <span>% Pencapaian Keseluruhan:</span>
                            <span className={`${styles.bg} ${styles.text} border ${styles.border} px-3.5 py-1.5 rounded-xl font-black font-mono text-[22px] shadow-sm leading-none transition-all duration-300`}>
                              {totalWeightedProgress.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Achievement Item Rows */}
                    <div className="divide-y divide-slate-100">
                      {currentYearData.kpis.map((kpi) => {
                        const ach = monthAchievementsGroup?.achievements[kpi.noKpi] || {
                          noKpi: kpi.noKpi,
                          pencapaian: 0.0,
                          persenPencapaian: 0.0,
                          persenPemberat: kpi.pemberat,
                          persenPencapaianSebenar: 0.0,
                          statusPencapaian: 'Belum Dilaksanakan',
                          dokumenSokongan: null
                        };

                        const isEditingThis = editingAchievementKpiNo === kpi.noKpi;

                        return (
                          <div key={kpi.id} className="p-6 transition-colors hover:bg-slate-50/30">
                            
                            {!isEditingThis ? (
                              /* COMPACT DEFAULT VIEW: Show No. KPI, PETUNJUK PRESTASI, Pencapaian, Sasaran (S3), % Pencapaian, % Pemberat, % Pencapaian Sebenar and Edit Button */
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
                                <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                                  <span className="bg-slate-900 text-white font-mono font-bold text-xs px-3.5 py-2 rounded-xl flex-shrink-0 shadow-sm">
                                    {kpi.noKpi}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800 uppercase leading-relaxed font-sans">
                                      {kpi.kpi}
                                    </p>
                                  </div>
                                </div>

                                {/* Right side metrics group & action button */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 flex-shrink-0">
                                  {/* Metrics group */}
                                  <div className="grid grid-cols-2 sm:flex items-center gap-3 sm:gap-4 bg-slate-50/80 border border-slate-100 rounded-xl p-2 px-3">
                                    <div className="text-center min-w-[70px]">
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pencapaian</span>
                                      <span className="font-mono text-[16px] font-bold text-slate-700">{ach.pencapaian.toFixed(1)}</span>
                                    </div>
                                    <div className="text-center min-w-[70px] border-l border-slate-200 pl-3">
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sasaran (S3)</span>
                                      <span className="font-mono text-[16px] font-bold text-slate-700">{kpi.sasaran3.toFixed(1)}</span>
                                    </div>
                                    <div className="text-center min-w-[75px] border-l border-slate-200 pl-3">
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">% Pencapaian</span>
                                      <span className={`font-mono text-[16px] font-extrabold ${getGradeColorStyle(ach.persenPencapaian)}`}>{ach.persenPencapaian.toFixed(1)}%</span>
                                    </div>
                                    <div className="text-center min-w-[70px] border-l border-slate-200 pl-3">
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">% Pemberat</span>
                                      <span className="font-mono text-[16px] font-bold text-slate-600">{kpi.pemberat.toFixed(1)}%</span>
                                    </div>
                                    <div className="text-center min-w-[80px] border-l border-slate-200 pl-3">
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">% Sebenar</span>
                                      <span className="font-mono text-[16px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">{ach.persenPencapaianSebenar.toFixed(1)}%</span>
                                    </div>
                                  </div>

                                  <button
                                    id={`btn_edit_achievement_${kpi.noKpi}`}
                                    onClick={() => handleStartEditAchievement(kpi.noKpi, ach)}
                                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition-all shadow-md shadow-sky-600/15 cursor-pointer hover:-translate-y-0.5"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    <span>EDIT PENCAPAIAN</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* FULL EXPANDED EDITING VIEW */
                              <>
                                {/* Headline Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-4 mb-4">
                                  <div className="flex items-center space-x-3">
                                    <span className="bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1 rounded-lg">
                                      {kpi.noKpi}
                                    </span>
                                    <div>
                                      <span className="bg-sky-50 text-sky-800 border border-sky-100 text-[10px] px-2 py-0.5 rounded font-bold">
                                        {kpi.komponen}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono ml-2.5">{kpi.noSsp}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <span className="bg-rose-50 text-rose-700 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center animate-pulse">
                                      <Edit2 className="h-3 w-3 mr-1" /> MOD EDITING AKTIF (Hanya 3 Medan Berfungsi)
                                    </span>
                                  </div>
                                </div>

                                {/* Core description grid */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                  
                                  {/* Left column: static descriptors (locked) */}
                                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    
                                    <div className="space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">OBJEKTIF STRATEGIK</span>
                                      <p className="text-xs text-slate-500 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                                        {kpi.objektif}
                                      </p>
                                    </div>

                                    <div className="space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">PETUNJUK PRESTASI - KPI (Locked)</span>
                                      <p className="text-xs text-slate-950 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-bold uppercase">
                                        {kpi.kpi}
                                      </p>
                                    </div>

                                    <div className="space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">INISIATIF EKSEKUSI</span>
                                      <p className="text-xs text-slate-600 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        {kpi.inisiatif}
                                      </p>
                                    </div>

                                    <div className="space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">KAEDAH PENGUKURAN</span>
                                      <p className="text-xs text-slate-600 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        {kpi.pengukuran}
                                      </p>
                                    </div>

                                    <div className="space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pencapaian Tahun Sebelum</span>
                                      <p className="text-xs text-slate-500 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        {kpi.statusPencapaianTahunSebelum}
                                      </p>
                                    </div>

                                    <div className="space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ambang Sasaran Utama (S3)</span>
                                      <p className="text-xs text-slate-900 leading-normal bg-sky-50 px-3 py-2.5 rounded-lg border border-sky-100 font-bold font-mono">
                                        {kpi.sasaran3.toFixed(1)}
                                      </p>
                                      <div className="mt-3 space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Justifikasi Sasaran Utama (S3)</span>
                                        <p className="text-xs text-sky-900 leading-normal bg-[#f0f9ff] p-2.5 rounded-lg border border-sky-100 font-medium">
                                          {kpi.justifikasiSasaran3 || 'Tiada Justifikasi'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <span className="hidden">Justifikasi Sasaran Utama (S3) [Hiden]</span>
                                      <p className="hidden">
                                        {kpi.justifikasiSasaran3 || 'Tiada Justifikasi'}
                                      </p>
                                    </div>

                                  </div>

                                  {/* Right column: reactive metrics & dynamic inputs */}
                                  <div className="md:col-span-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
                                    
                                    {/* ACTIVE EDIT MODE PANEL */}
                                    <div className="space-y-4">
                                      <div className="flex items-center space-x-1.5 text-slate-800 pb-1.5 border-b border-slate-200">
                                        <Edit2 className="h-4 w-4 text-rose-500" />
                                        <span className="text-xs font-bold uppercase text-rose-700">Pindaan Pencapaian {kpi.noKpi}</span>
                                      </div>

                                      {/* 1. Pencapaian input */}
                                      <div className="space-y-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-700">
                                          PENCAPAIAN *
                                        </label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          required
                                          value={achInputPencapaian}
                                          onChange={(e) => setAchInputPencapaian(parseFloat(e.target.value) || 0)}
                                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white font-mono focus:outline-none focus:border-rose-500"
                                        />
                                        <span className="text-[8px] text-slate-400 block leading-none">
                                          Perlu dibandingkan dengan S3 (<b>{kpi.sasaran3.toFixed(1)}</b>)
                                        </span>
                                      </div>

                                      {/* 2. Status Pencapaian */}
                                      <div className="space-y-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-700">
                                          STATUS PENCAPAIAN (Long Text) *
                                        </label>
                                        <textarea
                                          rows={2}
                                          required
                                          placeholder="Tulis status kemajuan semasa, isu, atau ringkasan tindakan..."
                                          value={achInputStatus}
                                          onChange={(e) => setAchInputStatus(e.target.value)}
                                          onBlur={() => setAchInputStatus(handleCapitalizeEachWord(achInputStatus))}
                                          className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white focus:outline-none focus:border-rose-500 font-medium"
                                        />
                                      </div>

                                      {/* 3. Dokumen Sokongan (File uploader, max 2MB, PDF/Image) */}
                                      <div className="space-y-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-700">
                                          DOKUMEN SOKONGAN (PDF & IMAGE MAKS 2MB)
                                        </label>
                                        
                                        <div className="flex items-center space-x-2 pt-1">
                                          <label className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shadow-xs">
                                            <Upload className="h-3 w-3 text-slate-500" />
                                            <span>Pilih Fail</span>
                                            <input
                                              type="file"
                                              accept=".pdf, .png, .jpg, .jpeg"
                                              onChange={handleFileChange}
                                              className="hidden"
                                            />
                                          </label>

                                          {achInputFile && (
                                            <button
                                              type="button"
                                              onClick={() => setAchInputFile(null)}
                                              className="p-1 px-1.5 bg-rose-50 text-rose-600 rounded text-[9px] hover:bg-rose-100 font-bold transition-all"
                                            >
                                              Padam Fail
                                            </button>
                                          )}
                                        </div>

                                        {/* Selected file visualization */}
                                        {achInputFile ? (
                                          <div className="mt-2 bg-slate-100/80 rounded-lg p-2 flex items-center justify-between border border-slate-200">
                                            <div className="flex items-center space-x-1.5 min-w-0">
                                              <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                                              <div className="truncate text-[10px] font-semibold text-slate-800">
                                                {achInputFile.name}
                                              </div>
                                            </div>
                                            <span className="text-[9px] font-mono text-slate-400 flex-shrink-0 ml-2">
                                              {(achInputFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[9px] italic text-slate-400 block pt-1">Tiada fail dipautkan. Dokumen audit digalakkan.</span>
                                        )}

                                        {fileError && (
                                          <span className="text-[9px] font-bold text-rose-500 leading-none pt-1 block">
                                            {fileError}
                                          </span>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                                        <button
                                          type="button"
                                          onClick={() => setEditingAchievementKpiNo(null)}
                                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                        >
                                          Batal
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveAchievement(kpi.noKpi)}
                                          className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                          Simpan
                                        </button>
                                      </div>

                                      {/* Reactive Live Calculations preview */}
                                      <div className="bg-white/80 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 mt-2">
                                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Kalkulator Pengisian Masa Nyata</span>
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">% PENCAPAIAN:</span>
                                          <span className="font-mono font-bold text-sky-800">
                                            { Math.min(100.0, kpi.sasaran3 > 0 ? (achInputPencapaian / kpi.sasaran3) * 100 : 0).toFixed(1) }%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">% PEMBERAT:</span>
                                          <span className="font-mono font-bold text-slate-600">
                                            { kpi.pemberat.toFixed(1) }%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">% PENCAPAIAN SEBENAR:</span>
                                          <span className="font-mono font-bold text-emerald-800">
                                            { ((Math.min(100.0, kpi.sasaran3 > 0 ? (achInputPencapaian / kpi.sasaran3) * 100 : 0) * kpi.pemberat) / 100).toFixed(1) }%
                                          </span>
                                        </div>
                                      </div>

                                    </div>

                                  </div>

                                </div>
                              </>
                            )}

                          </div>
                        );
                      })}
                    </div>

                    {/* Action Footer with 2 Buttons */}
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-xs text-slate-500">
                        Status bulan {selectedMonth}: <span className={`font-bold uppercase ${monthAchievementsGroup?.isEdited ? 'text-emerald-600' : 'text-slate-600'}`}>{monthAchievementsGroup?.isEdited ? 'TELAH DIKEMASKINI' : 'SEDIA DIKEMASKINI'}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-end gap-3 self-end sm:self-auto">
                        {/* Button 1: Refresh & Recalculate */}
                        <button
                          id="btn_refresh_month_achievements"
                          onClick={handleRefreshMonthAchievementsData}
                          className="px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/60 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-all flex items-center space-x-2 shadow-xs cursor-pointer active:scale-98"
                          title="Recalculate & synchronize achievements with any updated weights or target KPI values from the framework"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>SEGAR SEMULA DATA KPI</span>
                        </button>

                        {/* Button 2: HAS BEEN UPDATED Confirmation */}
                        <button
                          id="btn_confirm_month_updated"
                          onClick={handleConfirmMonthUpdated}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-sm cursor-pointer active:scale-98 ${
                            monthAchievementsGroup?.isEdited
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {monthAchievementsGroup?.isEdited ? 'TELAH DIKEMASKINI' : 'SAHKAN DIKEMASKINI'}
                          </span>
                        </button>
                      </div>
                    </div>

                  </div>
                </>
              )}

            </div>
          )}

        </div>

        {/* Global Modal for Year Selection */}
        {isKpiYearOpen && (
          <div 
            style={{ zIndex: 99990 }}
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
          >
            <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl relative">
              <button 
                onClick={() => setIsKpiYearOpen(false)} 
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-4 text-center">
                <div className="bg-sky-50 text-sky-600 p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">Tetapkan Tahun Sasaran KPI</h4>
                  <p className="text-xs text-slate-500 mt-1">Konfigurasi ini akan membuka tab penilaian, sasaran, dan pencatan kerangka prestasi mengikut Kalendar Belanjawan SPAN.</p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Tahun KPI (Sila taip/pilih)</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={yearInputVal}
                    onChange={(e) => setYearInputVal(parseInt(e.target.value) || 2026)}
                    className="w-full text-center text-sm font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-sky-500 outline-none font-mono"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setIsKpiYearOpen(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    id="btn_confirm_year"
                    onClick={handleSetKpiYear}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all shadow-md shadow-sky-600/10"
                  >
                    Mula Set KPI
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Modal for Unlock Confirmation */}
        {isUnlockModalOpen && (
          <div 
            style={{ zIndex: 99990 }}
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
          >
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
              <button 
                onClick={() => setIsUnlockModalOpen(false)} 
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-4 text-center">
                <div className="bg-rose-50 text-rose-600 p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                  <Unlock className="h-6 w-6" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-bold text-slate-900">Buka Kunci Kerangka KPI Tahun {selectedYear}?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Adakah anda pasti mahu membuka kunci Kerangka KPI bagi tahun ini? 
                    Ini akan mengembalikan status ke mod <strong>DERAF (Sedia Diedit)</strong> di mana 
                    anda dibenarkan meminda, menambah, atau memadam penunjuk KPI.
                  </p>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={() => setIsUnlockModalOpen(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn_confirm_unlock"
                    onClick={handleUnlockKerangka}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all shadow-md shadow-rose-600/10"
                  >
                    Teruskan / Unlock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Interactive Details Popout Modal */}
        {selectedKpiForModal && (
          <div 
            style={{ zIndex: 99990 }}
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm transition-opacity duration-300"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
              {/* Header Banner */}
              <div className="bg-[#0f2e5c] px-6 py-4 flex items-center justify-between shadow-md">
                <div className="flex items-center min-w-0 mr-4">
                  <span className="bg-sky-500 text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg uppercase tracking-wide mr-3 shrink-0">
                    {selectedKpiForModal.noKpi}
                  </span>
                  <h3 className="text-white text-xs sm:text-sm font-bold uppercase tracking-wide truncate" title={selectedKpiForModal.kpi}>
                    {selectedKpiForModal.kpi}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setSelectedKpiForModal(null);
                    setHoveredModalTrendPoint(null);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Tutup
                </button>
              </div>

              {/* Scrollable content container */}
              <div className="p-6 bg-slate-50 space-y-5 overflow-y-auto max-h-[72vh]">
                
                {/* Row 1: Objective & Initiatives */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200/60 rounded-xl p-4.5 shadow-2xs">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-sans">
                      OBJEKTIF STRATEGIKAL
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
                      {selectedKpiForModal.objektif || 'Tiada maklumat objektif strategikal'}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200/60 rounded-xl p-4.5 shadow-2xs">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-sans">
                      INISIATIF UTAMA
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                      {selectedKpiForModal.inisiatif || 'Tiada maklumat inisiatif utama'}
                    </p>
                  </div>
                </div>

                {/* Row 2: Measurement */}
                <div className="bg-white border border-slate-200/60 rounded-xl p-4.5 shadow-2xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-sans">
                    KAEDAH PENGUKURAN
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                    {selectedKpiForModal.pengukuran || 'Tiada kaedah pengukuran khusus'}
                  </p>
                </div>

                {/* Row 3: Current Month Achievement Card (Matches green style) */}
                {(() => {
                  const ach = currentYearData.monthlyAchievements[selectedMonth]?.achievements[selectedKpiForModal.noKpi] || {
                    pencapaian: 0.0,
                    persenPencapaian: 0.0,
                    persenPemberat: selectedKpiForModal.pemberat,
                    persenPencapaianSebenar: 0.0,
                    statusPencapaian: 'Belum Dilaksanakan'
                  };

                  const translateMonthToMalay = (monthStr: string): string => {
                    const mapping: Record<string, string> = {
                      JANUARY: 'JAN',
                      FEBRUARY: 'FEB',
                      MARCH: 'MAC',
                      APRIL: 'APR',
                      MAY: 'MEI',
                      JUNE: 'JUN',
                      JULY: 'JUL',
                      AUGUST: 'OGOS',
                      SEPTEMBER: 'SEPT',
                      OCTOBER: 'OKT',
                      NOVEMBER: 'NOV',
                      DECEMBER: 'DIS'
                    };
                    return mapping[monthStr] || monthStr;
                  };

                  return (
                    <div className="bg-[#e2f0d9] border border-[#c5e0b4] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between shadow-xs gap-4">
                      <div>
                        <span className="text-[10px] font-black text-[#385723] uppercase tracking-widest block mb-1.5 font-sans">
                          PENCAPAIAN BULAN {translateMonthToMalay(selectedMonth)}
                        </span>
                        <div className="text-4xl font-black text-[#385723] tracking-tight font-mono">
                          {ach.persenPencapaian.toFixed(1)}%
                        </div>
                      </div>

                      <div className="text-left sm:text-right font-mono text-xs text-slate-700 space-y-1 pr-2">
                        <div>Sasaran: <span className="font-bold text-slate-900">{selectedKpiForModal.sasaran3.toLocaleString()}</span></div>
                        <div>Pencapaian: <span className="font-bold text-slate-900">{ach.pencapaian.toLocaleString()}</span></div>
                        <div className="text-[#385723] font-semibold">
                          Wajaran: <span className="font-extrabold">{ach.persenPencapaianSebenar.toFixed(2)}% / {selectedKpiForModal.pemberat.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Row 4: YTD 12-Month Performance Trend Chart */}
                <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-2xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 font-sans">
                    TREND PENCAPAIAN 12 BULAN (YTD {selectedYear})
                  </span>

                  {(() => {
                    // Extract 12 months data
                    const modalTrendData = MONTHS_LIST.map((m) => {
                      const group = currentYearData.monthlyAchievements[m];
                      const ach = group?.achievements[selectedKpiForModal.noKpi];
                      return {
                        month: m,
                        value: ach ? ach.persenPencapaian : 0.0
                      };
                    });

                    const w = 750;
                    const h = 200;
                    const ml = 45;
                    const mr = 20;
                    const mt = 20;
                    const mb = 35;

                    const effW = w - ml - mr;
                    const effH = h - mt - mb;

                    const getX = (idx: number) => ml + (idx * effW) / 11;
                    const getY = (val: number) => mt + effH - Math.min(effH, Math.max(0, (val / 100) * effH));

                    const points = modalTrendData.map((d, i) => ({ x: getX(i), y: getY(d.value), month: d.month, value: d.value }));

                    const getSweepingPath = (pts: { x: number; y: number }[]) => {
                      if (pts.length === 0) return '';
                      let d = `M ${pts[0].x} ${pts[0].y}`;
                      for (let i = 0; i < pts.length - 1; i++) {
                        const p0 = pts[i];
                        const p1 = pts[i + 1];
                        const cp1x = p0.x + (p1.x - p0.x) / 3;
                        const cp1y = p0.y;
                        const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
                        const cp2y = p1.y;
                        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                      }
                      return d;
                    };

                    const pathD = getSweepingPath(points);
                    const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} ${getY(0)} L ${points[0].x} ${getY(0)} Z` : '';

                    const translateMonthToMalayShort = (monthStr: string): string => {
                      const mapping: Record<string, string> = {
                        JANUARY: 'JAN',
                        FEBRUARY: 'FEB',
                        MARCH: 'MAC',
                        APRIL: 'APR',
                        MAY: 'MEI',
                        JUNE: 'JUN',
                        JULY: 'JUL',
                        AUGUST: 'OGOS',
                        SEPTEMBER: 'SEPT',
                        OCTOBER: 'OKT',
                        NOVEMBER: 'NOV',
                        DECEMBER: 'DIS'
                      };
                      return mapping[monthStr] || monthStr;
                    };

                    return (
                      <div className="w-full relative">
                        <svg 
                          viewBox={`0 0 ${w} ${h}`} 
                          width="100%" 
                          height="auto" 
                          className="mx-auto block overflow-visible max-h-[260px]"
                        >
                          {/* Gradients */}
                          <defs>
                            <linearGradient id="modalTrendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#004a8d" stopOpacity="0.16" />
                              <stop offset="100%" stopColor="#004a8d" stopOpacity="0.00" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          {[0, 50, 75, 100].map((level) => {
                            const yPos = getY(level);
                            return (
                              <g key={level}>
                                <line 
                                  x1={ml} 
                                  y1={yPos} 
                                  x2={w - mr} 
                                  y2={yPos} 
                                  stroke="#e2e8f0" 
                                  strokeWidth="1" 
                                  strokeDasharray="4,4" 
                                />
                                <text 
                                  x={ml - 10} 
                                  y={yPos + 4} 
                                  textAnchor="end" 
                                  className="fill-slate-400 font-mono text-[10px] font-medium"
                                >
                                  {level}
                                </text>
                              </g>
                            );
                          })}

                          {/* Dynamic shading area under the curve */}
                          {areaD && (
                            <path d={areaD} fill="url(#modalTrendAreaGrad)" />
                          )}

                          {/* Connection Curve Line */}
                          {pathD && (
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke="#004a8d" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                            />
                          )}

                          {/* Interactive invisible tracking lines & circles */}
                          {points.map((pt, idx) => {
                            const isHovered = hoveredModalTrendPoint?.month === pt.month;
                            return (
                              <g key={idx} className="cursor-pointer">
                                {/* Hover interactive line */}
                                {isHovered && (
                                  <line 
                                    x1={pt.x} 
                                    y1={mt} 
                                    x2={pt.x} 
                                    y2={getY(0)} 
                                    stroke="#004a8d" 
                                    strokeWidth="1" 
                                    strokeDasharray="2,2" 
                                  />
                                )}

                                {/* Outer glow on hover */}
                                <circle 
                                  cx={pt.x} 
                                  cy={pt.y} 
                                  r={isHovered ? 8 : 4} 
                                  fill={isHovered ? '#004a8d' : '#ffffff'} 
                                  fillOpacity={isHovered ? 0.2 : 1.0}
                                  stroke="#004a8d" 
                                  strokeWidth={isHovered ? 2 : 2}
                                />
                                {isHovered && (
                                  <circle 
                                    cx={pt.x} 
                                    cy={pt.y} 
                                    r="4" 
                                    fill="#004a8d" 
                                  />
                                )}

                                {/* Month Label under X-axis */}
                                <text 
                                  x={pt.x} 
                                  y={h - 10} 
                                  textAnchor="middle" 
                                  className={`font-mono text-[9px] font-bold ${isHovered ? 'fill-slate-800' : 'fill-slate-400'}`}
                                >
                                  {translateMonthToMalayShort(pt.month)}
                                </text>

                                {/* Mouse hover area target */}
                                <rect 
                                  x={pt.x - effW / 24} 
                                  y={mt} 
                                  width={effW / 12} 
                                  height={effH} 
                                  fill="transparent" 
                                  onMouseEnter={(e) => {
                                    setHoveredModalTrendPoint({
                                      month: pt.month as MonthType,
                                      value: pt.value,
                                      x: pt.x,
                                      y: pt.y
                                    });
                                  }}
                                />
                              </g>
                            );
                          })}
                        </svg>

                        {/* Interactive Tooltip matching the image precisely */}
                        {hoveredModalTrendPoint && (
                          <div 
                            style={{
                              left: `${(hoveredModalTrendPoint.x / w) * 100}%`,
                              top: `${(hoveredModalTrendPoint.y / h) * 100 - 24}%`,
                              transform: 'translate(-50%, -100%)'
                            }}
                            className="absolute bg-white border border-slate-200/80 shadow-lg rounded-lg p-2.5 z-50 text-left pointer-events-none w-32 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-sans mb-0.5">
                              {translateMonthToMalayShort(hoveredModalTrendPoint.month)}
                            </div>
                            <div className="text-xs font-black text-[#004a8d] font-mono">
                              Pencapaian: {hoveredModalTrendPoint.value.toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer action */}
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end">
                <button 
                  onClick={() => {
                    setSelectedKpiForModal(null);
                    setHoveredModalTrendPoint(null);
                  }}
                  className="bg-[#0f2e5c] hover:bg-[#071d3d] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer font-sans uppercase tracking-wider"
                >
                  Tutup Paparan
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
