import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/small-planet-life/",
  plugins: [react()],
  build: {
    outDir: "dist-github",
    emptyOutDir: true,
  },
});
