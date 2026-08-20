import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient.ts";
import { ProveedorAuth } from "./auth/ProveedorAuth.tsx";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* El router va por fuera: el proveedor de sesión necesita poder navegar
        cuando el servidor rechaza la sesión. */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ProveedorAuth>
          <App />
        </ProveedorAuth>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
