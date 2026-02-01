# Quickstart Guide: Google Sheets Integration

**Feature**: [spec.md](spec.md)  
**Date**: 2026-02-01  
**Audience**: Developers implementing the feature

## Prerequisites

- Node.js 18+ installed
- Git repository cloned
- Google account with access to Google Cloud Console
- Text editor (VS Code recommended)

---

## Part 1: Google Cloud Setup (15 minutes)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Project name: "Rumour Map" (or your preference)
4. Click "Create"
5. Wait for project creation, then select it from the dropdown

### Step 2: Enable Google Sheets API

1. In the Google Cloud Console, navigate to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click "Google Sheets API"
4. Click "Enable"
5. Wait for activation (~30 seconds)

### Step 3: Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: "Rumour Map"
   - User support email: (your email)
   - Developer contact: (your email)
   - Scopes: Add `https://www.googleapis.com/auth/spreadsheets.readonly`
   - Test users: Add your email (for testing)
   - Click "Save and Continue"
4. Back to "Create OAuth client ID":
   - Application type: "Web application"
   - Name: "Rumour Map Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - `http://localhost:4173`
     - (Add production URL later, e.g., `https://yourusername.github.io`)
   - Authorized redirect URIs: Leave empty (not needed for implicit flow)
   - Click "Create"
5. **Copy the Client ID** (format: `123456789-abc123.apps.googleusercontent.com`)
6. Click "OK" (no need to download JSON for client-side app)

### Step 4: Create API Key

1. Still in "Credentials" page, click "Create Credentials" → "API key"
2. **Copy the API key** (format: `AIzaSyABC123...`)
3. Click "Edit API key" (optional but recommended):
   - Name: "Rumour Map Browser Key"
   - Application restrictions: "HTTP referrers"
   - Website restrictions: Add `localhost:*` and your production domain
   - API restrictions: "Restrict key" → Select "Google Sheets API"
   - Click "Save"

---

## Part 2: Google Sheets Setup (5 minutes)

### Step 5: Create or Prepare Spreadsheet

1. Create a new Google Sheet or open an existing one
2. Set up the header row (Row 1):
   ```
   | session_date | game_date | location_heard | location_targetted | X | Y | title | rating | resolved | details |
   ```
3. Add sample data (Row 2+):
   ```
   | 2025-12-15 | 3rd Leaffall, 1247 | Broken Tavern, Westport | Northern Peaks | 1200 | 800 | Dragon Sighting | 7 | FALSE | Locals report seeing a large winged creature... |
   ```
4. **Copy the Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_THE_SPREADSHEET_ID]/edit
   ```
5. **Share the sheet** with yourself (the email you used for OAuth testing)
   - Click "Share" button
   - Add your email with "Viewer" permissions
   - Click "Send"

---

## Part 3: Local Development Setup (10 minutes)

### Step 6: Install Dependencies

```bash
cd rumour-map

# Install production dependencies
npm install gapi-script

# Install development dependencies (if not already installed)
npm install -D vitest @vue/test-utils happy-dom @types/node typescript
```

### Step 7: Configure Environment Variables

Create `.env.local` in the project root (this file is gitignored):

```bash
# .env.local
VITE_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyABC123DEF456GHI789JKL012MNO345PQR
VITE_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
VITE_SHEET_NAME=Sheet1
VITE_SHEET_RANGE=A2:J
```

**Replace with your actual values**:
- `VITE_GOOGLE_CLIENT_ID`: From Step 3
- `VITE_GOOGLE_API_KEY`: From Step 4
- `VITE_SPREADSHEET_ID`: From Step 5

### Step 8: Add GIS Script to HTML

Edit `index.html` and add the Google Identity Services script in the `<head>`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rumour Map</title>
    <!-- Add Google Identity Services -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script src="https://apis.google.com/js/api.js" async defer></script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

### Step 9: Create TypeScript Configuration

If `tsconfig.json` doesn't exist, create it:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowJs": true,
    "checkJs": false,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

Create `src/shims-vue.d.ts`:

```typescript
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

### Step 10: Rename Vite Config to TypeScript

```bash
mv vite.config.js vite.config.ts
```

Edit `vite.config.ts` to add test configuration:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/rumour-map/',
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

---

## Part 4: Implementation Order (Development Workflow)

### Phase 1: Type Definitions (30 min)

1. Create `src/types/rumour.ts` with interfaces from [data-model.md](data-model.md)
2. Create `src/config/google.ts` with configuration exports

### Phase 2: Authentication (1-2 hours)

1. Create `src/composables/useGoogleAuth.ts`:
   - OAuth2 initialization
   - Token client setup
   - Sign-in/sign-out functions
   - In-memory token storage
2. Create `src/components/GoogleAuthButton.vue`:
   - Sign-in button UI
   - Loading states
   - Error display
3. Test authentication flow manually

### Phase 3: Google Sheets Fetching (1-2 hours)

1. Create `src/composables/useRumoursFromGoogle.ts`:
   - Initialize gapi client
   - Fetch sheet data
   - Parse rows to Rumour objects
   - Error handling
   - Caching logic
2. Test with console logging

### Phase 4: Filter Logic (30 min)

1. Create `src/composables/useRumourFilter.ts`:
   - Filter mode state
   - Computed filtered list
   - Count statistics
2. Add filter UI controls to `RumourOverlay.vue`

### Phase 5: Integration (1 hour)

1. Modify `src/composables/useRumours.ts`:
   - Call `useRumoursFromGoogle` instead of fetching PSV
   - Handle authentication state
   - Return same interface for backward compatibility
2. Update `App.vue`:
   - Add GoogleAuthButton component
   - Display auth state
   - Handle errors

### Phase 6: Testing (2-3 hours)

1. Create unit tests for each composable
2. Create integration test for full flow
3. Run tests: `npm run test`
4. Fix any failures

---

## Part 5: Verification Checklist

### Functional Testing

- [ ] Sign-in button appears when unauthenticated
- [ ] Clicking sign-in triggers Google OAuth popup
- [ ] After granting permission, rumours load from Google Sheets
- [ ] Rumours display at correct X,Y coordinates on map
- [ ] Hover shows full details including metadata
- [ ] Filter controls toggle between all/resolved/unresolved
- [ ] Manual refresh button fetches latest data
- [ ] Sign-out button clears authentication and rumours

### Error Scenarios

- [ ] Invalid spreadsheet ID shows "Spreadsheet not found" error
- [ ] User without sheet access sees "Permission denied" error
- [ ] Network offline shows "Network error" message
- [ ] Malformed sheet data (missing X/Y) skips rows with console warning
- [ ] Expired token triggers re-authentication automatically

### Performance

- [ ] Initial load completes in <3 seconds
- [ ] Filter updates apply in <500ms
- [ ] No jank during pan/zoom (60fps maintained)
- [ ] Manual refresh with 10 rapid clicks only sends 1 request (debounced)

---

## Part 6: Common Issues & Troubleshooting

### Issue: "Origin not allowed" error during OAuth

**Cause**: JavaScript origin not configured in Google Cloud Console

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Edit OAuth Client ID
3. Add `http://localhost:5173` to "Authorized JavaScript origins"
4. Save and wait 5 minutes for propagation

### Issue: "API key not valid" error

**Cause**: API key not configured or restricted incorrectly

**Fix**:
1. Verify API key in `.env.local` matches Google Cloud Console
2. Check API restrictions allow "Google Sheets API"
3. Ensure HTTP referrer restrictions include `localhost`

### Issue: 403 "Permission denied" when fetching sheet

**Cause**: User (your Google account) doesn't have access to the sheet

**Fix**:
1. Open the Google Sheet
2. Click "Share"
3. Add your email with "Viewer" or "Editor" access
4. Try again

### Issue: Empty rumours array despite sheet having data

**Cause**: Incorrect sheet name or range in `.env.local`

**Fix**:
1. Verify `VITE_SHEET_NAME` matches the actual sheet tab name (case-sensitive)
2. Verify `VITE_SHEET_RANGE` is correct (default: `A2:J`)
3. Check browser console for parsing errors

### Issue: TypeScript errors about gapi or google

**Cause**: Missing type definitions

**Fix**:
```bash
npm install -D @types/gapi @types/gapi.auth2
```

Then create `src/types/google.d.ts`:
```typescript
declare global {
  interface Window {
    google: any
    gapi: any
  }
}

export {}
```

---

## Part 7: Next Steps

After completing the quickstart:

1. **Run the application**:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:5173` and test the full flow.

2. **Write tests**:
   ```bash
   npm run test
   ```
   Ensure all unit and integration tests pass.

3. **Build for production**:
   ```bash
   npm run build
   ```
   Verify bundle size is <200KB gzipped.

4. **Deploy**:
   - Add production domain to OAuth authorized origins
   - Deploy to GitHub Pages or hosting platform
   - Update `.env` for production environment

---

## Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Identity Services Guide](https://developers.google.com/identity/oauth2/web/guides/overview)
- [Feature Specification](spec.md)
- [Data Model](data-model.md)
- [API Contract](contracts/google-sheets-api.md)
- [Research Document](research.md)

---

## Support

For issues or questions:
1. Check [Troubleshooting](#part-6-common-issues--troubleshooting) section
2. Review browser console for error messages
3. Verify `.env.local` configuration
4. Test with a fresh Google Sheet and new credentials
