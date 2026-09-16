import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SmallPlanetApp from "./app/SmallPlanetApp";
import "./app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SmallPlanetApp />
  </StrictMode>,
);
