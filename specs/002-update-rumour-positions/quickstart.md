# Quickstart: Update Rumour Positions to Google Sheets

**Feature**: [spec.md](spec.md)  
**Date**: 2026-02-01  
**Prerequisites**: 001-google-sheets-integration must be fully implemented and working

## Overview

This guide walks through setting up, testing, and debugging the rumour position update feature. It covers OAuth scope configuration, testing the push updates workflow, and common troubleshooting scenarios.

---

## Prerequisites

Before implementing this feature, ensure:

1. ✅ **001-google-sheets-integration is working**:
   - Google Sheets data loads successfully
   - OAuth authentication works
   - Rumours display on map at correct coordinates

2. ✅ **Development environment setup**:
   - Node.js installed
   - Project runs with `npm run dev`
   - Environment variables configured (`.env.local`)

3. ✅ **Google Cloud Console access**:
   - OAuth Client ID already created (from 001)
   - Access to Google Cloud Console to update OAuth consent screen

---

## Step 1: Update OAuth Scope

### 1.1 Update Configuration File

Edit `src/config/google.ts`:

```typescript
export const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID,
  sheetName: import.meta.env.VITE_SHEET_NAME || 'Sheet1',
  sheetRange: import.meta.env.VITE_SHEET_RANGE || 'A2:J',
  scope: 'https://www.googleapis.com/auth/spreadsheets', // Changed from .readonly
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
}
```

**Key Change**: `scope` from `.readonly` to full read/write access.

### 1.2 Update OAuth Consent Screen (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **OAuth consent screen**
3. Under **Scopes**, verify `https://www.googleapis.com/auth/spreadsheets` is listed
4. If not listed, click **Add or Remove Scopes**:
   - Search for "Google Sheets API"
   - Select `https://www.googleapis.com/auth/spreadsheets`
   - Save changes

**Note**: If your app is in "Testing" mode, no external review needed. If published, scope change requires re-verification.

### 1.3 Clear Existing Authentication

Users who previously authenticated with read-only scope must re-consent:

**Option A - Clear sessionStorage** (automatic):
```typescript
// In useGoogleAuth.ts initializeAuth()
const currentScope = GOOGLE_CONFIG.scope
const storedScope = sessionStorage.getItem('auth_scope')

if (storedScope && storedScope !== currentScope) {
  // Scope changed, clear auth state to force re-consent
  sessionStorage.removeItem('auth_state')
  sessionStorage.setItem('auth_scope', currentScope)
}
```

**Option B - Manual** (during development):
- Open browser DevTools → Application → Storage → Session Storage
- Delete `auth_state` key
- Refresh page → Sign in again with new scope

---

## Step 2: Implement Core Files

### 2.1 Extend Rumour Interface

Edit `src/types/rumour.ts`, add to `Rumour` interface:

```typescript
export interface Rumour {
  // ... existing fields

  // NEW: Sync state fields
  sheetRowNumber: number  // 1-indexed row in Sheets
  originalX: number       // Last saved X
  originalY: number       // Last saved Y
  isModified: boolean     // Has pending changes
}
```

### 2.2 Create Update Composable

Create `src/composables/useRumourUpdates.ts`:

```typescript
import { ref, computed, type Ref } from 'vue'
import { gapi } from 'gapi-script'
import { GOOGLE_CONFIG } from '@/config/google'
import { useGoogleAuth } from './useGoogleAuth'
import type { Rumour } from '@/types/rumour'

const modifiedRumours: Ref<Set<string>> = ref(new Set())

export function useRumourUpdates() {
  const { getAccessToken } = useGoogleAuth()
  const isPushing = ref(false)
  const pushError: Ref<string | null> = ref(null)

  const hasPendingChanges = computed(() => modifiedRumours.value.size > 0)
  const pendingCount = computed(() => modifiedRumours.value.size)

  const markAsModified = (rumourId: string) => {
    modifiedRumours.value.add(rumourId)
  }

  const pushUpdates = async (rumours: Rumour[]) => {
    isPushing.value = true
    pushError.value = null

    try {
      // Filter to only modified rumours
      const toUpdate = rumours.filter(r => modifiedRumours.value.has(r.id))

      if (toUpdate.length === 0) {
        pushError.value = 'No changes to push'
        return
      }

      // Build batch update request
      const updates = toUpdate.map(rumour => ({
        range: `${GOOGLE_CONFIG.sheetName}!E${rumour.sheetRowNumber}:F${rumour.sheetRowNumber}`,
        values: [[rumour.x, rumour.y]]
      }))

      // Make API call
      const response = await gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: updates
        }
      })

      // Success: clear modified state
      toUpdate.forEach(rumour => {
        rumour.originalX = rumour.x
        rumour.originalY = rumour.y
        rumour.isModified = false
        modifiedRumours.value.delete(rumour.id)
      })

      console.log(`✅ Updated ${response.result.totalUpdatedCells} cells`)
      
    } catch (error: any) {
      console.error('Push failed:', error)
      pushError.value = error.status === 403 
        ? 'Permission denied. Check Google Sheets sharing settings.'
        : 'Failed to update positions. Please try again.'
    } finally {
      isPushing.value = false
    }
  }

  return {
    hasPendingChanges,
    pendingCount,
    isPushing,
    pushError,
    markAsModified,
    pushUpdates
  }
}
```

### 2.3 Modify Drag Handler

Edit `src/composables/useRumourDrag.js`:

```javascript
import { useRumourUpdates } from './useRumourUpdates'

export function useRumourDrag(mapTransform) {
  const { markAsModified } = useRumourUpdates()

  const startDrag = (rumour, event) => {
    // ... existing drag start logic

    const onDragEnd = () => {
      rumour.isDragging = false

      // Check if position changed
      if (rumour.x !== rumour.originalX || rumour.y !== rumour.originalY) {
        rumour.isModified = true
        markAsModified(rumour.id)
      }
    }

    // ... attach event listeners
  }

  return { startDrag }
}
```

### 2.4 Create Push Button Component

Create `src/components/PushUpdatesButton.vue`:

```vue
<template>
  <button
    :disabled="!hasPendingChanges || isPushing"
    @click="handlePush"
    class="push-updates-btn"
  >
    <span v-if="isPushing">⏳ Pushing...</span>
    <span v-else>📤 Push Updates</span>
    <span v-if="hasPendingChanges && !isPushing" class="badge">
      {{ pendingCount }}
    </span>
  </button>
  <div v-if="pushError" class="error-message">
    {{ pushError }}
  </div>
</template>

<script setup lang="ts">
import { useRumourUpdates } from '@/composables/useRumourUpdates'
import { useRumours } from '@/composables/useRumours'

const { hasPendingChanges, pendingCount, isPushing, pushError, pushUpdates } = useRumourUpdates()
const { rumours } = useRumours()

const handlePush = async () => {
  await pushUpdates(rumours.value)
}
</script>

<style scoped>
.push-updates-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  background: #0969da;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.push-updates-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.badge {
  background: #cf222e;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  margin-left: 8px;
  font-size: 12px;
}

.error-message {
  position: fixed;
  bottom: 80px;
  right: 24px;
  background: #cf222e;
  color: white;
  padding: 12px;
  border-radius: 6px;
  max-width: 300px;
}
</style>
```

### 2.5 Add Button to App

Edit `src/App.vue`:

```vue
<template>
  <div id="app">
    <!-- Existing components -->
    <PanZoomMap :rumours="rumours" />
    
    <!-- NEW: Push button -->
    <PushUpdatesButton />
  </div>
</template>

<script setup lang="ts">
import PushUpdatesButton from '@/components/PushUpdatesButton.vue'
// ... other imports
</script>
```

---

## Step 3: Test the Feature

### 3.1 Basic Functionality Test

1. **Start dev server**: `npm run dev`
2. **Open app** in browser: `http://localhost:5173`
3. **Sign in** with Google (will prompt for new scope consent)
4. **Verify rumours load** from Google Sheets

5. **Drag a rumour**:
   - Click and drag a rumour marker to a new position
   - Release mouse
   - ✅ Marker should show modified indicator (if visual indicator implemented)
   - ✅ "Push Updates" button should show badge with count "1"

6. **Push updates**:
   - Click "Push Updates" button
   - ✅ Button should show "⏳ Pushing..." state
   - ✅ After 1-2 seconds, button returns to normal, badge disappears
   - ✅ Console shows: "✅ Updated 2 cells"

7. **Verify in Google Sheets**:
   - Open the Google Sheets document
   - Find the row for the moved rumour
   - ✅ Columns E (X) and F (Y) should have new coordinate values

### 3.2 Batch Update Test

1. **Drag multiple rumours** (3-5 rumours)
2. **Check button badge** shows correct count (e.g., "5")
3. **Click "Push Updates"**
4. **Verify** all moved rumours update in Google Sheets
5. ✅ All rumours should clear modified state after push

### 3.3 Error Handling Test

**Test 1: Permission Error**
1. Remove your edit access to the Google Sheets document (make it view-only)
2. Drag a rumour and click "Push Updates"
3. ✅ Should show error: "Permission denied. Check Google Sheets sharing settings."
4. ✅ Modified state should persist (allow retry after fixing permissions)

**Test 2: Network Error**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Drag rumour and click "Push Updates"
4. ✅ Should show error: "Failed to update positions. Please try again."
5. ✅ Re-enable network, retry should work

**Test 3: Invalid Sheet Name**
1. Edit `.env.local`: `VITE_SHEET_NAME=NonExistentSheet`
2. Restart dev server
3. Sign in, drag rumour, push updates
4. ✅ Should show error (400 Bad Request)

---

## Step 4: Update Tests

### 4.1 Unit Test for useRumourUpdates

Create `tests/unit/useRumourUpdates.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRumourUpdates } from '@/composables/useRumourUpdates'
import type { Rumour } from '@/types/rumour'

// Mock gapi
vi.mock('gapi-script', () => ({
  gapi: {
    client: {
      sheets: {
        spreadsheets: {
          values: {
            batchUpdate: vi.fn().mockResolvedValue({
              result: {
                totalUpdatedCells: 2,
                responses: [{ updatedCells: 2 }]
              }
            })
          }
        }
      }
    }
  }
}))

describe('useRumourUpdates', () => {
  it('tracks pending changes count', () => {
    const { pendingCount, markAsModified } = useRumourUpdates()
    
    expect(pendingCount.value).toBe(0)
    
    markAsModified('rumour_1')
    expect(pendingCount.value).toBe(1)
    
    markAsModified('rumour_2')
    expect(pendingCount.value).toBe(2)
  })

  it('pushes updates and clears modified state', async () => {
    const { pushUpdates, markAsModified, pendingCount } = useRumourUpdates()
    
    const rumour: Rumour = {
      id: 'rumour_5',
      sheetRowNumber: 5,
      x: 1234,
      y: 567,
      originalX: 1000,
      originalY: 500,
      isModified: true,
      // ... other required fields
    }
    
    markAsModified(rumour.id)
    expect(pendingCount.value).toBe(1)
    
    await pushUpdates([rumour])
    
    expect(rumour.isModified).toBe(false)
    expect(rumour.originalX).toBe(1234)
    expect(rumour.originalY).toBe(567)
    expect(pendingCount.value).toBe(0)
  })
})
```

Run tests: `npm test`

### 4.2 Integration Test

Create `tests/integration/push-updates.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PushUpdatesButton from '@/components/PushUpdatesButton.vue'

describe('Push Updates Integration', () => {
  it('button is disabled when no pending changes', () => {
    const wrapper = mount(PushUpdatesButton)
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('shows pending count badge when changes exist', async () => {
    // TODO: Add test with mocked rumours state
  })
})
```

---

## Troubleshooting

### Issue: "OAuth consent required" on every page load

**Cause**: Token not persisting between page refreshes  
**Solution**: 
- Verify `useGoogleAuth` stores auth state flag in sessionStorage
- Check browser doesn't block sessionStorage (incognito mode issues)

### Issue: Updates succeed but don't persist in Sheets

**Cause**: Updating wrong row number or wrong sheet name  
**Debug**:
```typescript
// Add logging in pushUpdates
console.log('Update ranges:', updates.map(u => u.range))
// Example output: ["Sheet1!E5:F5", "Sheet1!E12:F12"]
```
**Solution**: Verify `sheetRowNumber` matches actual row in Sheets (1-indexed)

### Issue: 403 Permission Denied error

**Cause**: User lacks edit permission on spreadsheet  
**Solution**:
1. Open Google Sheets document
2. Click Share button
3. Change user permission from "Viewer" to "Editor"
4. Retry push

### Issue: Modified markers don't clear after push

**Cause**: Success logic not updating rumour state correctly  
**Debug**:
```typescript
// In pushUpdates success block
console.log('Clearing modified state for:', toUpdate.map(r => r.id))
toUpdate.forEach(rumour => {
  console.log(`${rumour.id}: ${rumour.x},${rumour.y} -> ${rumour.originalX},${rumour.originalY}`)
  rumour.originalX = rumour.x
  rumour.originalY = rumour.y
  rumour.isModified = false
})
```

### Issue: Button badge shows wrong count

**Cause**: Mismatch between Set and rumour.isModified flag  
**Solution**: Ensure `markAsModified` is called **only** when position actually changes:
```javascript
if (rumour.x !== rumour.originalX || rumour.y !== rumour.originalY) {
  rumour.isModified = true
  markAsModified(rumour.id)
}
```

---

## Development Workflow

### Typical Development Cycle

1. **Make changes** to composable or component
2. **Save file** (Vite hot-reloads automatically)
3. **Test in browser** (no page refresh needed usually)
4. **Check console** for logs/errors
5. **Verify in Google Sheets** (refresh sheet to see updates)

### Debugging Tips

**Enable verbose logging**:
```typescript
// In useRumourUpdates.ts
const DEBUG = true

if (DEBUG) {
  console.log('[useRumourUpdates] Pending changes:', modifiedRumours.value)
  console.log('[useRumourUpdates] Pushing updates:', toUpdate.length)
}
```

**Inspect network requests**:
1. Open DevTools → Network tab
2. Filter: `sheets.googleapis.com`
3. Click on `batchUpdate` request
4. Check **Payload** tab for request body
5. Check **Response** tab for API response

**Verify OAuth scope**:
```typescript
// In useGoogleAuth.ts
console.log('Current scope:', GOOGLE_CONFIG.scope)
console.log('Token client:', tokenClient)
```

---

## Next Steps

After basic functionality works:

1. ✅ **Add visual indicators** to modified markers (border, icon)
2. ✅ **Improve error messages** (specific to error type)
3. ✅ **Add success toast notification** (user feedback)
4. ✅ **Implement retry button** for failed pushes
5. ✅ **Add loading progress** ("Updating 3 of 5...")
6. ✅ **Handle partial failures** (some rumours succeed, others fail)

See [spec.md](spec.md) for full requirements and acceptance criteria.

---

## Summary

**Setup**:
1. Change OAuth scope from `.readonly` to full access
2. Extend Rumour interface with sync state fields
3. Create `useRumourUpdates` composable
4. Add `PushUpdatesButton` component

**Test**:
1. Drag rumour → verify badge shows count
2. Push updates → verify coordinates change in Sheets
3. Test error cases (permissions, network)

**Debug**:
- Console logs for state changes
- Network tab for API requests
- Verify row numbers match Sheets

**Ready**: You now have bidirectional sync between map and Google Sheets! 🎉
