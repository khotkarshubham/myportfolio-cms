import { useEffect, useState } from "react";
import API from "../services/api";
import { resolveSocials } from "../data/socials";

export default function useSocials() {
  const [socials, setSocials] = useState(() => resolveSocials());

  useEffect(() => {
    let mounted = true;

    API.get("/public/profile")
      .then((res) => {
        if (mounted) setSocials(resolveSocials(res.data || {}));
      })
      .catch(() => {
        if (mounted) setSocials(resolveSocials());
      });

    return () => {
      mounted = false;
    };
  }, []);

  return socials;
}
