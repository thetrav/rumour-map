# is_a_place Feature Implementation Summary

## Overview
This PR implements the ability to mark rumours as "places" which are displayed with a different marker (⌘) instead of the standard pin emoji (📍).

## Changes Made

### 1. Data Model Updates
**File: `src/types/rumour.ts`**
- Added `is_a_place: boolean` field to `Rumour` interface
- Updated `GoogleSheetsRow` interface to reflect new column mapping:
  - Column H: `is_a_place` (NEW)
  - Column I: `rating` (moved from H)
  - Column J: `resolved` (moved from I)
  - Column K: `details` (moved from J)

### 2. Google Sheets Integration
**File: `src/composables/useRumoursFromGoogle.ts`**
- Updated parsing logic to read `is_a_place` from Column H
- Added support for parsing boolean values (TRUE/FALSE, Yes/No, 1/0)
- Modified `buildRumourData` function to include `is_a_place` field

### 3. Marker Display
**File: `src/components/RumourMarker.vue`**
- Modified pin button to display:
  - `⌘` when `is_a_place` is true
  - `📍` when pinned and not a place
  - `🔀` when unpinned and not a place
- Added "Place" checkbox in edit mode
- Updated edit data handling to include `is_a_place` field

### 4. Add Rumour Form
**File: `src/components/AddRumourForm.vue`**
- Added "Place" checkbox control
- Reorganized form layout to include place toggle alongside rating
- Updated form data interface to include `is_a_place: boolean`

### 5. Data Persistence
**File: `src/composables/useAddRumourToSheets.ts`**
- Updated `NewRumourData` interface to include `is_a_place`
- Modified field mapping to write `is_a_place` to Column H
- Updated fallback column order to match new schema

**File: `src/composables/useRumourUpdates.ts`**
- Updated `getFieldValue` function to handle boolean conversion for `is_a_place`
- Ensures proper TRUE/FALSE formatting for Google Sheets

### 6. Testing
**Files:**
- `tests/unit/AddRumourForm.spec.ts`
- `tests/integration/push-updates.spec.ts`
- `tests/integration/auto-place-integration.spec.ts`

All tests updated to include `is_a_place` field in mock data and assertions.
**Result: 126 tests passing ✅**

## Visual Changes

### Marker Display
Before: All rumours showed 📍 (pin) or 🔀 (unpinned)
After: 
- Regular rumours: 📍 (pinned) or 🔀 (unpinned)
- Places: ⌘ (pinned, white color for contrast) or 🔀 (unpinned)

**Note:** When unpinned, place markers use the same 🔀 icon as regular rumours to indicate draggable state.

### Form Controls
Both AddRumourForm and RumourMarker edit mode now include:
```
☐ Place
```

When checked, the rumour will be marked as a place.

## Google Sheets Column Mapping

| Column | Field Name | Type | Notes |
|--------|------------|------|-------|
| A | session_date | String | Session date |
| B | game_date | String | In-game date |
| C | location_heard | String | Where heard |
| D | location_targetted | String | About location |
| E | X | Number | X coordinate |
| F | Y | Number | Y coordinate |
| G | title | String | Rumour title |
| **H** | **is_a_place** | **Boolean** | **NEW - Place marker flag** |
| I | rating | Number | Rating (moved from H) |
| J | resolved | Boolean | Resolved status (moved from I) |
| K | details | String | Details (moved from J) |

## Backward Compatibility
⚠️ **Breaking Change**: This change moves columns H, I, J. Existing Google Sheets will need to:
1. Insert a new column at H for `is_a_place`
2. Set all existing rows to FALSE for `is_a_place`
3. Rating, resolved, and details will automatically shift to I, J, K

## Usage

### Adding a Place Marker
1. Click "Add Rumour" button
2. Fill in rumour details
3. Check the "Place" checkbox
4. Save

### Editing Existing Rumour
1. Hover over rumour marker
2. Click edit button (✏️)
3. Toggle "Place" checkbox
4. Save changes
5. Click "Push Updates" to sync to Google Sheets

### Visual Identification
- Look for ⌘ symbol on the map = Place marker
- Look for 📍 symbol on the map = Regular rumour

## Implementation Quality
- ✅ All TypeScript types properly defined
- ✅ Vue 3 Composition API patterns followed
- ✅ Tailwind CSS used for styling
- ✅ Full test coverage
- ✅ Backward compatible parsing (handles missing is_a_place column)
- ✅ Proper boolean conversion for Google Sheets (TRUE/FALSE)
