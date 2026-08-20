import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient.ts";
import { ProveedorAuth } from "./auth/ProveedorAuth.tsx";
import { ProveedorAvisos } from "./componentes/ui/avisos/ProveedorAvisos.tsx";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* El router va por fuera: el proveedor de sesion necesita poder navegar
        cuando el servidor rechaza la sesion. */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ProveedorAuth>
          {/* Los avisos envuelven a App para que tambien la pantalla de acceso
              pueda usarlos. */}
          <ProveedorAvisos>
            <App />
          </ProveedorAvisos>
        </ProveedorAuth>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
