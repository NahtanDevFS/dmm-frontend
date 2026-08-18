import { createContext } from "react";
import type { UsuarioSesion } from "../types/api";

export interface ValorAuth {
  usuario: UsuarioSesion | null;
  /** Verdadero mientras se resuelve el GET /auth/me del arranque. */
  comprobandoSesion: boolean;
  entrar: (credenciales: {
    username: string;
    password: string;
  }) => Promise<UsuarioSesion>;
  salir: () => Promise<void>;
  saliendo: boolean;
}

/**
 * Vive en su propio archivo, separado del proveedor: si el contexto y el
 * componente compartieran módulo, cada edición del proveedor invalidaría el
 * contexto y Fast Refresh remontaría el árbol entero en desarrollo.
 */
export const ContextoAuth = createContext<ValorAuth | null>(null);

/** Clave de caché de la sesión. Vive aquí, junto al contexto, y no en el
 *  proveedor: ese archivo exporta un componente y Fast Refresh deja de
 *  funcionar si además comparte constantes. */
export const CLAVE_SESION = ["sesion"] as const;
