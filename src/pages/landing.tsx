import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initA11yFromStorage } from "../lib/a11y-preferences";
import { LandingPage } from "./LandingPage";
import "../styles/landing.css";

initA11yFromStorage();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>
);
