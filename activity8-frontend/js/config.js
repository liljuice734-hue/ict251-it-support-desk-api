const localHost = typeof window !== "undefined"
    && ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_BASE_URL = localHost
    ? "http://localhost:3000"
    : "https://activity7-backend-6gx4.onrender.com";
