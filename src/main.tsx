import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient.ts";
import { ProveedorAuth } from "./auth/ProveedorAuth.tsx";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ProveedorAuth>
        <App />
      </ProveedorAuth>
    </QueryClientProvider>
  </StrictMode>,
);
