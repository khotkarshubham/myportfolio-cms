import { useEffect, useState } from "react";
import API from "../services/api";
import { resolveSocials } from "../data/socials";

export default function useSocials() {
  const [socials, setSocials] = useState(() => resolveSocials());

  useEffect(() => {
    let mounted = true;

    const refresh = () => API.get("/public/profile")
      .then((res) => {
        if (mounted) setSocials(resolveSocials(res.data || {}));
      })
      .catch(() => {
        if (mounted) setSocials(resolveSocials());
      });
    const onStorage = (event) => { if (event.key === "profile_updated_at") refresh(); };
    refresh();
    window.addEventListener("profile-updated", refresh);
    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      window.removeEventListener("profile-updated", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return socials;
}
