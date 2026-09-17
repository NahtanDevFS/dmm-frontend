import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Setup global de Vitest. Trae los matchers de jest-dom
 * (toBeInTheDocument, toHaveTextContent, etc.), un único polyfill, y la
 * limpieza del DOM entre tests.
 *
 * El cleanup se registra a mano en vez de confiar en el auto-cleanup de
 * @testing-library/react: ese auto-registro depende de que `afterEach` ya
 * exista como global en el momento en que el módulo se importa por primera
 * vez, y con `isolate: false` (vite.config.ts) los módulos se comparten
 * entre archivos de test dentro del mismo worker — el auto-registro corre
 * una sola vez y deja de limpiar el DOM entre archivos, así que los tests
 * de un archivo terminan viendo el DOM que dejó el archivo anterior.
 * Registrarlo aquí, explícito, no depende de ese orden de carga.
 */
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver =
    ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

afterEach(() => {
  cleanup();
});
