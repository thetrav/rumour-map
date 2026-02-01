/**
 * Google API Configuration
 * Loads configuration from environment variables
 */

export const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID,
  sheetName: import.meta.env.VITE_SHEET_NAME || 'Sheet1',
  sheetRange: import.meta.env.VITE_SHEET_RANGE || 'A2:J',
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
}
