import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
var stdin_default = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_PROXY ?? "http://127.0.0.1:8000",
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5173
  }
});
export {
  stdin_default as default
};
