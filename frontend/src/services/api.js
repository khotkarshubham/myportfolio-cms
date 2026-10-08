import axios from "axios";

const API = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_API_URL,
});

const normalizeResponse = (response) => {
  const payload = response?.data;

  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return {
      ...response,
      data: payload.success ? payload.data : payload,
    };
  }

  return response;
};

// Remove legacy credentials during migration; JWTs are now HttpOnly cookies.
localStorage.removeItem("admin_token");
sessionStorage.removeItem("admin_token");
API.interceptors.request.use((config) => {
  if (!["get", "head", "options"].includes((config.method || "get").toLowerCase())) {
    config.headers["X-CSRF-Protection"] = "1";
  }
  return config;
});

API.interceptors.response.use(normalizeResponse, (error) => {
  if (error?.response?.status === 401) {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    delete API.defaults.headers.common["Authorization"];

    if (!window.location.pathname.startsWith("/admin/login")) {
      window.location.assign("/admin/login");
    }
  }

  const payload = error?.response?.data;

  if (payload && typeof payload === "object" && "success" in payload) {
    return Promise.reject({
      ...error,
      response: {
        ...error.response,
        data: payload.success ? payload.data : payload,
      },
    });
  }

  return Promise.reject(error);
});

export default API;
