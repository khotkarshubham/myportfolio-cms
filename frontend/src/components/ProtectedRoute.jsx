import React from "react";
import { Navigate } from "react-router-dom";

const decodeJwt = (token) => {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = typeof window !== "undefined"
      ? window.atob(normalized)
      : Buffer.from(normalized, "base64").toString("utf8");

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("admin_token");
  const role = localStorage.getItem("admin_role");
  const payload = decodeJwt(token);
  const hasValidSession = Boolean(token && payload && (payload.role === "superadmin" || payload.role === "editor" || payload.role === "viewer") && (!payload.exp || payload.exp * 1000 > Date.now()));
  const hasRole = ["superadmin", "editor", "viewer"].includes(role);

  if (!hasValidSession || !hasRole) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}