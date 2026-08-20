import type { ReactNode, TdHTMLAttributes } from "react";
import estilos from "./Tabla.module.css";

/**
 * Tabla de datos del sistema.
 *
 * Envuelve en un contenedor con scroll propio: una tabla ancha desborda dentro
 * de su caja y nunca hace que el cuerpo de la página se desplace en
 * horizontal.
 *
 * `titulo` alimenta el caption, que es lo que anuncia un lector de pantalla al
 * entrar en la tabla. Se oculta a la vista porque el encabezado de la sección
 * ya lo dice.
 */
function Tabla({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[estilos.envoltura, className ?? ""].filter(Boolean).join(" ")}>
      <table className={estilos.tabla}>
        <caption className="solo-lectores">{titulo}</caption>
        {children}
      </table>
    </div>
  );
}

type PropsCelda = TdHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
};

/** Celda de identificador: CUI/DPI, código de lote, folio. Mono, a la izquierda. */
export function CeldaIdentificador({ className, children, ...resto }: PropsCelda) {
  return (
    <td
      className={[estilos.identificador, className ?? ""].filter(Boolean).join(" ")}
      {...resto}
    >
      {children}
    </td>
  );
}

/** Celda de cantidad: a la derecha y en cifras tabulares. */
export function CeldaCantidad({ className, children, ...resto }: PropsCelda) {
  return (
    <td
      className={[estilos.cantidad, className ?? ""].filter(Boolean).join(" ")}
      {...resto}
    >
      {children}
    </td>
  );
}

/** Celda de acciones de fila. No se estira ni parte los botones. */
export function CeldaAcciones({ className, children, ...resto }: PropsCelda) {
  return (
    <td
      className={[estilos.acciones, className ?? ""].filter(Boolean).join(" ")}
      {...resto}
    >
      {children}
    </td>
  );
}

/**
 * Fila de un registro inactivo. Se atenúa, pero quien la use debe seguir
 * diciendo el estado con texto en su propia celda: el color no basta.
 */
export function FilaInactiva({ children }: { children: ReactNode }) {
  return <tr className={estilos.inactiva}>{children}</tr>;
}

export default Tabla;
