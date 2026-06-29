import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { getRouter } from "./router";
import "./styles.css";

// Lightweight, privacy-friendly analytics (Plausible).
// Enable by setting VITE_PLAUSIBLE_DOMAIN (e.g. "ozodflow.uz") at build time.
const plausibleDomain = import.meta.env?.VITE_PLAUSIBLE_DOMAIN;
if (plausibleDomain && typeof document !== "undefined") {
  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = plausibleDomain;
  script.src =
    import.meta.env?.VITE_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}

// PWA: register service worker so the site is installable and loads faster.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const router = getRouter();
const rootElement = document.getElementById("root");

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
