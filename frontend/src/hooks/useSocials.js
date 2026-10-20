import { subscribeProfileUpdates } from "../utils/profileUpdates";
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
    refresh();
    const unsubscribe = subscribeProfileUpdates(refresh);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return socials;
}
