// frontend/src/pages/Admin/ChangePassword.jsx
import React, { useState } from "react";
import API from "../../services/api";

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await API.post(
        "/auth/change-password",
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      alert("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      alert("Password change failed");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-lg mx-auto p-8 bg-tech-card rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-tech-accent mb-4">Change Password</h2>
      <input
        type="password"
        placeholder="Old Password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
        className="border border-gray-700 bg-tech-bg text-gray-200 p-3 w-full rounded focus:outline-none focus:border-tech-accent transition"
      />
      <input
        type="password"
        placeholder="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="border border-gray-700 bg-tech-bg text-gray-200 p-3 w-full rounded focus:outline-none focus:border-tech-accent transition"
      />
      <button className="bg-tech-accent hover:bg-cyan-500 text-black font-semibold px-6 py-2 rounded transition duration-200 w-full">
        Update
      </button>
    </form>
  );
}