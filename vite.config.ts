/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    css: true,
    // Un solo jsdom compartido entre archivos en vez de uno por archivo:
    // era el 73% del tiempo de la suite y solo crece según agreguemos más
    // tests de componentes. Los tests ya no comparten estado entre sí
    // (cada uno monta y limpia su propio árbol con RTL / cleanup automático
    // en el setup), así que compartir el entorno es seguro.
    isolate: false,
  },
});
