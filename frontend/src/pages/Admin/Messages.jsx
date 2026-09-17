import { useEffect, useState } from "react";
import API from "../../services/api";

export default function Messages() {

  const [messages, setMessages] = useState([]);

  const loadMessages = async () => {

    try {

      const token = localStorage.getItem("admin_token");

      const res = await API.get(
        "/admin/contacts",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessages(res.data);

    } catch (err) {

      console.error("Failed to load messages:", err);

    }

  };

  const deleteMsg = async (id) => {

    try {

      const token = localStorage.getItem("admin_token");

      await API.delete(
        `/admin/contacts/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      loadMessages();

    } catch (err) {

      console.error("Delete failed:", err);

    }

  };

  useEffect(() => {

    loadMessages();

  }, []);

  return (

    <div className="space-y-6">

      <h1 className="text-3xl font-bold text-tech-accent">
        Inbox
      </h1>

      {messages.length === 0 && (

        <p className="text-gray-400">
          No messages yet.
        </p>

      )}

      {messages.map(m => (

        <div
          key={m._id}
          className="bg-tech-card border border-gray-700 p-6 rounded-xl hover:border-tech-accent transition"
        >

          <div className="flex justify-between">

            <div>

              <h3 className="text-tech-accent font-semibold">
                {m.name}
              </h3>

              <p className="text-gray-400 text-sm">
                {m.email}
              </p>

            </div>

            <button
              onClick={() => deleteMsg(m._id)}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </button>

          </div>

          <p className="text-gray-300 mt-4">
            {m.message}
          </p>

        </div>

      ))}

    </div>

  );

}