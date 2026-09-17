import axios from "axios";

const API = axios.create({
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

/* AUTO ADD TOKEN */

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

export const setToken = (token) => {
  if (token) {
    API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common["Authorization"];
  }
};

export default API;
