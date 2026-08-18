import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

/**
 * Códigos en los que reintentar no tiene sentido: la respuesta no va a cambiar
 * por insistir. Un 409 del backend suele venir de un trigger de la base
 * («ya fue entregado», «sin stock»), así que tampoco se reintenta.
 */
const SIN_REINTENTO = new Set([400, 401, 403, 404, 409, 422]);

function convieneReintentar(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const estado = error.response?.status;
  // Sin respuesta es fallo de red o el backend caído: ahí sí vale reintentar.
  if (estado === undefined) return true;
  return !SIN_REINTENTO.has(estado);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Un solo reintento: la DMM trabaja sobre red municipal, que se corta a
      // ratos, pero encadenar reintentos solo alarga la espera del usuario.
      retry: (intentos, error) => convieneReintentar(error) && intentos < 1,
      staleTime: 30_000,
      /**
       * El personal deja la pantalla abierta mientras atiende a la persona en
       * ventanilla. Refrescar cada vez que la ventana recupera el foco haría
       * que un listado se reordene bajo el cursor mientras alguien lee.
       */
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Reintentar una escritura puede duplicar una entrega o una recepción.
      retry: 0,
    },
  },
});
