# Security Specification for SPAN e-KPI Tracker

This document outlines the security architecture, invariants, and testing strategy for the Firestore-backed SPAN e-KPI Corporate Tracker.

## 1. Data Invariants
- **Schema Validation**: Every document in the `yearRecords` collection must represent a valid `kpiYearData` model, which contains:
  - `year` (number between 2000 and 2100)
  - `isSubmitted` (boolean)
  - `kpis` (list of KPI definition objects)
  - `monthlyAchievements` (detailed month-by-month record)
- **Year-Document Alignment**: The document ID must match the string representation of the `year` attribute (e.g. ID "2026" contains `{ year: 2026 }`).
- **Audit Logging**: Any user creating or altering records must be authenticated (at least using Anonymous authentication to guarantee trace identity).

## 2. The "Dirty Dozen" Malicious Payloads
Here are 12 specific payloads intended to bypass security gates and cause "Update-Gaps", "State Shortcutting", or "Identity Spoofing":

1. **Unauthenticated Write**: Creating or changing `/yearRecords/2026` with no auth context at all.
2. **Invalid ID Injection**: Writing a year document with a poisoned identifier: `/yearRecords/../../../hack`.
3. **Invalid Year Out of Bounds**: Writing a year record with `"year": 1820`.
4. **Invalid Field Type**: Setting `"isSubmitted": "yes_definitely"`.
5. **No-KPI Injection**: Writing a document structure where `kpis` is missing or containing junk objects.
6. **Weightage Overrun**: Modifying the year record to have excessive, incorrect weights or schema validation omissions.
7. **Bypassing Submit Safeguard**: Overwriting monthly achievements when `isSubmitted === true`.
8. **Malicious Empty Arrays**: Initializing high-level KPI lists with raw null elements.
9. **Junk Field Poisoning**: Injecting random fields like `"admin_override": true` or `"attack_success": "yes"`.
10. **Spoofing Metadata**: Overwriting user logs or modifying locked corporate metadata.
11. **Malformed Document Type Check**: Writing objects in place of lists.
12. **Malicious Bulk Mutation / Out of Order state**: Deleting critical records of official corporate tracking without standard parameters.

## 3. Test Runner Design
The validation suite runs against the rules using simulated Firestore configurations verifying all Twelve Dirty Dozen payloads return `PERMISSION_DENIED`:

```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe("SPAN e-KPI Tracker Security Rules Suite", () => {
  it("rejects unauthenticated read/writes", async () => {
    // Expected to fail unauthenticated mutations
  });
  it("rejects out of bound years", async () => {
    // Expected to fail year values not in [2000, 2100]
  });
});
```
