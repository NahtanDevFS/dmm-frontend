import type { ReactNode } from "react";
import estilos from "./Estado.module.css";

/* ─────────────────────── Indicadores ─────────────────────── */

export function RejillaIndicadores({ children }: { children: ReactNode }) {
  return <div className={estilos.rejilla}>{children}</div>;
}

/**
 * Tarjeta indicadora del panel de inicio.
 *
 * `tono` no decora: marca los indicadores que exigen atención, como el stock
 * por vencer. Los semánticos solo comunican estado (sección 2).
 */
export function TarjetaIndicador({
  titulo,
  valor,
  detalle,
  tono = "marca",
}: {
  titulo: string;
  valor: number | string;
  detalle?: string;
  tono?: "marca" | "advertencia" | "peligro";
}) {
  const clases = [
    estilos.indicador,
    tono === "advertencia" ? estilos.advertencia : "",
    tono === "peligro" ? estilos.peligro : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={clases}>
      <h3 className={estilos.titulo}>{titulo}</h3>
      <p className={estilos.valor}>
        {typeof valor === "number" ? valor.toLocaleString("es-GT") : valor}
      </p>
      {detalle && <p className={estilos.detalle}>{detalle}</p>}
    </article>
  );
}

/* ─────────────────────── Estado vacío ─────────────────────── */

/**
 * Qué se ve cuando no hay nada que ver.
 *
 * `titulo` dice qué falta y `texto` qué hacer al respecto. Una tabla vacía sin
 * explicación deja al usuario sin saber si no hay registros, si el filtro los
 * escondió o si algo falló.
 */
export function EstadoVacio({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto?: string;
  accion?: ReactNode;
}) {
  return (
    <div className={estilos.vacio}>
      <p className={estilos.vacioTitulo}>{titulo}</p>
      {texto && <p className={estilos.vacioTexto}>{texto}</p>}
      {accion}
    </div>
  );
}

/* ─────────────────────── Esqueletos ─────────────────────── */

/** Bloque de carga. Se dimensiona desde fuera para imitar lo que sustituye. */
export function Esqueleto({
  ancho = "100%",
  alto = 16,
}: {
  ancho?: string | number;
  alto?: string | number;
}) {
  return (
    <span
      className={estilos.esqueleto}
      style={{ display: "block", width: ancho, height: alto }}
      aria-hidden="true"
    />
  );
}

/**
 * Esqueleto de una tabla mientras llega la primera página.
 *
 * Lleva role de estado con texto oculto: las barras grises no dicen nada a un
 * lector de pantalla, que sin esto anunciaría una tabla vacía.
 */
export function EsqueletoTabla({
  filas = 5,
  columnas = 4,
}: {
  filas?: number;
  columnas?: number;
}) {
  return (
    <div role="status">
      <span className="solo-lectores">Cargando registros…</span>
      {Array.from({ length: filas }, (_, fila) => (
        <div key={fila} className={estilos.filaEsqueleto}>
          {Array.from({ length: columnas }, (_, columna) => (
            <Esqueleto key={columna} />
          ))}
        </div>
      ))}
    </div>
  );
}
