import { gapi } from "gapi-script";
import { ref } from "vue";

const CLIENT_ID =
  "195188546056-mggt3lnbi74a0ku0qste80g6b4baj0qc.apps.googleusercontent.com";
const SPREADSHEET_ID = "141Z_pCcEpdx-XXl_VL5vN4xUA3OT5-h5zZ0Vo0Wal1o";

const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

let tokenClient = null;
let gapiReady = false;

export async function initGoogle() {
  return new Promise((resolve) => {
    gapi.load("client", async () => {
      await gapi.client.init({
        apiKey: "", // not required for Sheets reads with OAuth
        discoveryDocs: [
          "https://sheets.googleapis.com/$discovery/rest?version=v4",
        ],
      });
      gapiReady = true;
      resolve();
    });
  });
}

export async function initTokenClient() {
  if (tokenClient) return tokenClient;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) {
        console.error("OAuth error:", response);
      }
    },
  });

  return tokenClient;
}

export async function signIn() {
  await initGoogle();
  const client = await initTokenClient();

  return new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error) reject(resp);
      else resolve(resp);
    };
    client.requestAccessToken();
  });
}

export async function readRumours() {
  await initGoogle();
  await signIn();

  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Rumours",
  });

  const rows = res.result.values;
  if (!rows || rows.length === 0) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? null;
    });
    return obj;
  });
}

export function useRumoursFromGoogle() {
  const rumours = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function loadRumours() {
    loading.value = true;
    error.value = null;

    try {
      rumours.value = await readRumours();
      console.log(rumours.value);
    } catch (e) {
      console.error("Failed to load rumours:", e);
      error.value = e;
      rumours.value = [];
    } finally {
      loading.value = false;
    }
  }

  return {
    rumours,
    loading,
    error,
    loadRumours,
  };
}
