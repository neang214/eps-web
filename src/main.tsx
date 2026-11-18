import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ContentProvider, SettingsProvider } from "./store";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsProvider>
      <ContentProvider>
        <App />
      </ContentProvider>
    </SettingsProvider>
  </StrictMode>,
);

// Offline support: register the service worker in production builds only.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
