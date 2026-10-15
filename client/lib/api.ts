import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9005";

// Interceptor to automatically attach credentials and Authorization Bearer header
axios.interceptors.request.use((config) => {
  config.withCredentials = true;
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      if (!config.headers["Authorization"]) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
  }
  return config;
});
