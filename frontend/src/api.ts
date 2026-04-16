const isLocalHost =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (isLocalHost ? "http://127.0.0.1:8000" : "https://cashflownow.onrender.com");
