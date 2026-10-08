import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../services/api";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let active = true;
    API.get("/auth/me").then(({ data }) => {
      if (!active) return;
      if (!["superadmin", "editor", "viewer"].includes(data.role)) {
        setStatus("unauthorized");
        return;
      }
      localStorage.setItem("admin_role", data.role);
      localStorage.setItem("admin_email", data.email);
      setStatus("authenticated");
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, []);
  if (status === "loading") return <p role="status">Checking your session...</p>;
  if (status === "error") return <p role="alert">Unable to verify your session. Please reload to retry.</p>;
  if (status === "unauthorized") return <Navigate to="/admin/login" replace />;
  return children;
}
