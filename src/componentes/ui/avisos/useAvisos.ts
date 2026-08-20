import { useContext } from "react";
import { ContextoAvisos, type ValorAvisos } from "./contexto";

export function useAvisos(): ValorAvisos {
  const valor = useContext(ContextoAvisos);
  if (valor === null) {
    throw new Error("useAvisos debe usarse dentro de <ProveedorAvisos>.");
  }
  return valor;
}
