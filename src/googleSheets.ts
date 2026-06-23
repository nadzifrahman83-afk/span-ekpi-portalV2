import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();
// Add spreadsheet scope requested by user
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// In-memory token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const googleSheetsSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Access Token untuk Google Sheets tidak diperolehi daripada rujukan log masuk.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Ralat log masuk Google Sheets:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleSheetsSignOut = async () => {
  cachedAccessToken = null;
};

/**
 * Extracts the spreadsheet ID from a full Google Sheets URL or simply returns the ID.
 */
export function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}

export interface SheetRow {
  kpiNo: string; // e.g. KPI 1
  pencapaian: number; // e.g. 95.5
  status?: string; // e.g. "Selesai"
}

/**
 * Fetch and parse data from a range in Google Sheets.
 */
export async function loadKpiDataFromSheet(
  spreadsheetId: string,
  range: string,
  accessToken: string
): Promise<SheetRow[]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const cleanRange = range ? encodeURIComponent(range) : 'Sheet1!A1:C50'; // Default range
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${cleanRange}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const message = errorJson?.error?.message || `HTTP ${res.status}`;
      throw new Error(`Google Sheets API Error: ${message}`);
    }
    
    const data = await res.json();
    const rows = data.values as string[][] | undefined;
    
    if (!rows || rows.length === 0) {
      throw new Error('Helaian spreadsheet kosong atau tiada baris ditemui.');
    }
    
    const parsedRows: SheetRow[] = [];
    
    // We can handle raw tables with header detection or plain rows
    // Let's inspect row by row. If there is a header, we look for columns with 'KPI', 'Pencapaian' / 'Value', 'Status'.
    // Or we fall back to a standard format where:
    // Column 1 or Row substring matches "KPI"
    // Column 2 contains the number value
    // Column 3 optionally contains status description.
    
    let kpiColIdx = 0;
    let valColIdx = 1;
    let statusColIdx = 2;
    
    const firstRow = rows[0].map(v => String(v).toLowerCase().trim());
    const hasHeader = firstRow.some(cell => cell.includes('kpi') || cell.includes('pencapaian') || cell.includes('siri'));
    
    let startRowIndex = 0;
    if (hasHeader) {
      startRowIndex = 1;
      // Try to map column indices dynamically
      const foundKpi = firstRow.findIndex(cell => cell.includes('kpi') || cell.includes('siri') || cell.includes('no'));
      const foundVal = firstRow.findIndex(cell => cell.includes('pencapaian') || cell.includes('nilai') || cell.includes('value') || cell.includes('%') || cell.includes('percent'));
      const foundStatus = firstRow.findIndex(cell => cell.includes('status') || cell.includes('ulasan') || cell.includes('justifikasi') || cell.includes('catatan'));
      
      if (foundKpi !== -1) kpiColIdx = foundKpi;
      if (foundVal !== -1) valColIdx = foundVal;
      if (foundStatus !== -1) statusColIdx = foundStatus;
    }
    
    for (let i = startRowIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const kpiStrRaw = row[kpiColIdx];
      if (!kpiStrRaw) continue;
      
      const kpiStr = String(kpiStrRaw).toUpperCase().trim();
      
      // Look for string containing "KPI X"
      const kpiMatch = kpiStr.match(/KPI\s*\d+/);
      if (!kpiMatch) continue; // Skip non-KPI rows
      
      const kpiNo = kpiMatch[0].replace(/\s+/, ' '); // Normalise "KPI  1" to "KPI 1"
      
      const valRaw = row[valColIdx];
      // Clean up string like "95.5%" or "RM 50" to float
      const cleanedValStr = valRaw ? String(valRaw).replace(/[^\d.]/g, '') : '0';
      const pencapaian = parseFloat(cleanedValStr) || 0;
      
      const statusRaw = row[statusColIdx] || '';
      const status = String(statusRaw).trim();
      
      parsedRows.push({
        kpiNo,
        pencapaian,
        status: status || undefined
      });
    }
    
    return parsedRows;
  } catch (error: any) {
    console.error('Error fetching sheet rows:', error);
    throw error;
  }
}
