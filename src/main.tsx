import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { startVersionCheck } from "./lib/version-check";
import "./index.css";

startVersionCheck();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
