import { createContext } from "react";

export type TonoAviso = "exito" | "error" | "info" | "advertencia";

export interface Aviso {
  id: number;
  tono: TonoAviso;
  mensaje: string;
}

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma. Debe nombrar la acción, no decir «Aceptar». */
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Marca la acción como destructiva: el botón pasa a rojo. */
  destructiva?: boolean;
}

export interface ValorAvisos {
  avisar: (mensaje: string, tono?: TonoAviso) => void;
  /**
   * Abre el diálogo y resuelve a true o false. Devolver una promesa deja el
   * código de la pantalla lineal —`if (await confirmar(...))`— en vez de
   * partirlo entre callbacks y estados sueltos.
   */
  confirmar: (opciones: OpcionesConfirmacion) => Promise<boolean>;
}

/**
 * Vive en su propio archivo, separado del proveedor: si compartieran módulo,
 * cada edición del proveedor invalidaría el contexto y Fast Refresh
 * remontaría el árbol entero en desarrollo.
 */
export const ContextoAvisos = createContext<ValorAvisos | null>(null);
