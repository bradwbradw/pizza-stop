import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  //set build path to relative
  base: "./",
  plugins: [react()],
});
