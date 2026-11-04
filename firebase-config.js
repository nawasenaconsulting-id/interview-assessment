// Isi HANYA konfigurasi publik Firebase Web App dari Project Settings.
// API key Firebase web bukan password; keamanan data berasal dari Firestore Rules dan Auth.
export const firebaseConfig = {
  apiKey: "ISI_FIREBASE_API_KEY",
  authDomain: "ISI_PROJECT_ID.firebaseapp.com",
  projectId: "ISI_PROJECT_ID",
  appId: "ISI_FIREBASE_APP_ID"
};

// Alamat email login masing-masing akun Firebase Authentication.
// Email bukan rahasia; jangan pernah masukkan password atau PIN ke file ini.
export const reviewerLoginEmails = {
  alfian: "ISI_EMAIL_ALFIAN",
  dekki: "ISI_EMAIL_DEKKI",
  raka: "ISI_EMAIL_RAKA"
};

// URL Cloudflare Worker administrasi, contoh https://interview-admin.nama.workers.dev
// Jangan masukkan secret Google atau kata sandi siapa pun di file ini.
export const adminApiBase = "ISI_URL_CLOUDFLARE_WORKER";
