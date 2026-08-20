import type { ButtonHTMLAttributes, ReactNode } from "react";
import estilos from "./Boton.module.css";

export type VarianteBoton =
  | "primaria"
  | "secundaria"
  | "terciaria"
  | "aprobar"
  | "rechazar";

type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  pequeno?: boolean;
  anchoCompleto?: boolean;
  /**
   * Deshabilita el botón y muestra `textoCargando`. Se separa de `disabled`
   * para que la pantalla no tenga que sincronizar dos props a mano y arriesgue
   * dejar activo un botón que ya disparó su petición.
   */
  cargando?: boolean;
  textoCargando?: string;
  children: ReactNode;
};

/**
 * Botón del sistema.
 *
 * Una sola acción primaria por pantalla, siempre a la derecha del grupo
 * (sección 5). Aprobar y rechazar existen como variantes propias porque son
 * decisiones irreversibles, no porque estén por encima en la jerarquía.
 *
 * No admite icono: la sección 9 prohíbe iconos decorativos en botones.
 */
function Boton({
  variante = "terciaria",
  pequeno = false,
  anchoCompleto = false,
  cargando = false,
  textoCargando = "Procesando…",
  disabled,
  className,
  type = "button",
  children,
  ...resto
}: PropsBoton) {
  const clases = [
    estilos.boton,
    estilos[variante],
    pequeno ? estilos.pequeno : "",
    anchoCompleto ? estilos.anchoCompleto : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={clases}
      disabled={disabled || cargando}
      // Anuncia el cambio de estado a un lector de pantalla, que si no vería
      // el botón deshabilitarse sin saber por qué.
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? textoCargando : children}
    </button>
  );
}

/**
 * Pie de acciones. Alinea a la derecha y separa con la línea que cierra la
 * región, de modo que ninguna pantalla tenga que recordar dónde va la primaria.
 */
export function GrupoBotones({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[estilos.grupo, className ?? ""].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export default Boton;
