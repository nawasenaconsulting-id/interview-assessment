// Isi HANYA konfigurasi publik Firebase Web App dari Project Settings.
// API key Firebase web bukan password; keamanan data berasal dari Firestore Rules dan Auth.
export const firebaseConfig = {
  apiKey: "AIzaSyCEoOJN93eT5koJfMo_kvhfCwYk_M3i4pw",
  authDomain: "interview-manager-fat-bwbyaz.firebaseapp.com",
  projectId: "interview-manager-fat-bwbyaz",
  appId: "1:229872391278:web:a009d75a1a759d15ba027f"
};

// Alamat email login masing-masing akun Firebase Authentication.
// Email bukan rahasia; jangan pernah masukkan password atau PIN ke file ini.
export const reviewerLoginEmails = {
  alfian: "alfian1715@gmail.com",
  dekki: "dekz9000@gmail.com",
  raka: "raka.adikrisnha@gmail.com"
};

// URL Cloudflare Worker administrasi, contoh https://interview-admin.nama.workers.dev
// Jangan masukkan secret Google atau kata sandi siapa pun di file ini.
export const adminApiBase ="https://nawasena-api-pages.pages.dev";
