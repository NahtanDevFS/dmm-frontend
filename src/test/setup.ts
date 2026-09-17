import "@testing-library/jest-dom/vitest";

/**
 * Setup global de Vitest. Solo trae los matchers de jest-dom
 * (toBeInTheDocument, toHaveTextContent, etc.) — nada de mocks globales
 * aquí: cada suite mockea lo que necesita, para que quede explícito qué
 * dependencia externa está de por medio en cada test.
 */
