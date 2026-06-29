import { useEffect, useState } from "react";

import {
  DEFAULT_SITE_DATA,
  fetchSiteData,
  getStoredSiteData,
  storeSiteData,
} from "@/lib/site-data";

export function useSiteData() {
  const [data, setData] = useState(DEFAULT_SITE_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setData(getStoredSiteData());

    fetchSiteData({ signal: controller.signal })
      .then((fresh) => {
        storeSiteData(fresh);
        setData(fresh);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setData(getStoredSiteData());
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return { data, loading };
}
