import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * QueryClient para tests de hooks que usan useQuery.
 *
 * retry: false es la diferencia clave con el cliente real (lib/queryClient.ts):
 * en producción vale un reintento porque la red municipal se corta a ratos,
 * pero en un test un reintento solo alarga la espera de waitFor sin aportar
 * nada — el mock de axios ya decide determinísticamente si la petición
 * "falla" o no.
 */
export function crearQueryClientDePrueba(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function envolverConQueryClient(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}
