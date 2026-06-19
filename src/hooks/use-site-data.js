import { useEffect, useState } from "react";

import {
  DEFAULT_SITE_DATA,
  fetchSiteData,
  getStoredSiteData,
  storeSiteData,
} from "@/lib/site-data";

export function useSiteData() {
  const [siteData, setSiteData] = useState(DEFAULT_SITE_DATA);

  useEffect(() => {
    const controller = new AbortController();
    setSiteData(getStoredSiteData());

    fetchSiteData({ signal: controller.signal })
      .then((data) => {
        storeSiteData(data);
        setSiteData(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setSiteData(getStoredSiteData());
        }
      });

    return () => controller.abort();
  }, []);

  return siteData;
}
