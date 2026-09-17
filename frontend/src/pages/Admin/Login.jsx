import React, { useState } from "react";
import API, { setToken } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();

  const submit = async (e) => {

    e.preventDefault();

    try {

      const res = await API.post("/auth/login", {
        email,
        password
      });

      const token = res.data.token;
      const admin = res.data.admin;

      if (token && admin) {

        /* ✅ SAVE TOKEN */
        localStorage.setItem("admin_token", token);

        /* 🔥 SAVE ROLE (IMPORTANT FIX) */
        localStorage.setItem("admin_role", admin.role);

        /* OPTIONAL: store email */
        localStorage.setItem("admin_email", admin.email);

        /* ✅ SET AXIOS HEADER */
        setToken(token);

        /* 🚀 REDIRECT */
        navigate("/admin");

      } else {

        alert("Login failed: Invalid response");

      }

    } catch (err) {

      console.error("Login error:", err.response?.data || err.message);

      alert(
        err.response?.data?.message || "Login failed"
      );

    }

  };

  return (

    <div className="admin-login-page">
      <button
        type="button"
        className="admin-theme-toggle admin-login-theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
        title={`Switch to ${dark ? "light" : "dark"} mode`}
      >
        {dark ? <FiSun /> : <FiMoon />}
      </button>

      <form
        onSubmit={submit}
        className="admin-login-form"
      >

        <h2 className="text-3xl font-bold text-center text-tech-accent">
          Admin Login
        </h2>

        {/* EMAIL */}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          required
          className="
            border border-gray-700
            bg-tech-bg text-gray-200
            p-3 w-full rounded
            focus:outline-none
            focus:border-tech-accent
            transition
          "
        />

        {/* PASSWORD */}

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          required
          className="
            border border-gray-700
            bg-tech-bg text-gray-200
            p-3 w-full rounded
            focus:outline-none
            focus:border-tech-accent
            transition
          "
        />

        {/* BUTTON */}

        <button
          type="submit"
          className="
            bg-tech-accent
            hover:bg-cyan-500
            text-black
            font-semibold
            px-6 py-3
            rounded
            transition
            duration-200
            w-full
          "
        >
          Login
        </button>

      </form>

    </div>

  );

}
