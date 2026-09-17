import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Gráficas del panel con Recharts.
 *
 * Los colores se pasan explícitos (var(--color-...)) en vez de dejar la
 * paleta por defecto de la librería: el manual de marca (sección 9) no
 * admite colores fuera de la escala de tokens.css.
 */

const COLOR_LINEA = "var(--color-primary-dark)";
const COLOR_AREA = "var(--color-primary-mid)";
const COLOR_BARRA = "var(--color-primary-mid)";
const COLOR_BARRA_RESALTADA = "var(--color-danger)";
const COLOR_EJE = "var(--color-text-muted)";
const COLOR_REJILLA = "var(--color-border-soft)";

/* ─────────────────────── Línea ─────────────────────── */

export interface PuntoLinea {
  etiqueta: string;
  valor: number;
}

export function GraficaLinea({
  datos,
  etiquetaVacio = "Sin datos en este período",
}: {
  datos: PuntoLinea[];
  etiquetaVacio?: string;
}) {
  if (datos.length === 0 || datos.every((d) => d.valor === 0)) {
    return <Vacio texto={etiquetaVacio} />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="etiqueta"
          tick={{ fontSize: 12, fill: COLOR_EJE }}
          axisLine={{ stroke: COLOR_REJILLA }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: COLOR_EJE }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            borderColor: "var(--color-border-soft)",
            fontSize: 13,
          }}
          labelStyle={{ color: "var(--color-text-main)" }}
          formatter={(valor) => [String(valor ?? 0), "Entregas"]}
        />
        <Area
          type="monotone"
          dataKey="valor"
          stroke={COLOR_LINEA}
          strokeWidth={2}
          fill={COLOR_AREA}
          fillOpacity={0.35}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────── Barras ─────────────────────── */

export interface BarraDato {
  etiqueta: string;
  valor: number;
  /** Marca la barra como la que exige atención (p.ej. lotes vencidos > 0). */
  resaltada?: boolean;
}

/** Barras horizontales: los nombres de categoría/programa suelen ser largos. */
export function GraficaBarras({
  datos,
  etiquetaVacio = "Sin datos para mostrar",
  sufijo = "",
}: {
  datos: BarraDato[];
  etiquetaVacio?: string;
  sufijo?: string;
}) {
  if (datos.length === 0) {
    return <Vacio texto={etiquetaVacio} />;
  }

  const alto = Math.max(datos.length * 36, 80);

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="etiqueta"
          tick={{ fontSize: 12, fill: "var(--color-text-main)" }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            borderColor: "var(--color-border-soft)",
            fontSize: 13,
          }}
          formatter={(valor) => [
            `${Number(valor ?? 0).toLocaleString("es-GT")}${sufijo}`,
            "",
          ]}
        />
        <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={16}>
          {datos.map((d) => (
            <Cell
              key={d.etiqueta}
              fill={d.resaltada ? COLOR_BARRA_RESALTADA : COLOR_BARRA}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────── Pastel ─────────────────────── */

export interface PorcionPastel {
  etiqueta: string;
  valor: number;
  /** Color explícito para esta porción (token de tokens.css). Si se omite, usa la escala por defecto en orden. */
  color?: string;
}

const ESCALA_PASTEL_DEFECTO = [
  "var(--color-primary-dark)",
  "var(--color-primary-mid)",
  "var(--color-primary-soft)",
  "var(--color-info)",
  "var(--color-text-muted)",
];

/**
 * Pastel genérico. Sin filtro de porciones en cero: una porción en 0 todavía
 * es información (p.ej. "cero lotes vencidos" es justo lo que se quiere
 * poder confirmar de un vistazo), así que solo se oculta la gráfica entera
 * si TODO el total es cero.
 *
 * La leyenda es propia (HTML, no <Legend> de Recharts) porque esa componente
 * fuerza una altura fija para el bloque de leyenda: con 5 etiquetas largas
 * ("Vence en menos de 3 meses") el texto se corta en vez de hacer wrap. Una
 * lista normal a un lado no tiene ese límite.
 */
export function GraficaPastel({
  datos,
  etiquetaVacio = "Sin datos para mostrar",
}: {
  datos: PorcionPastel[];
  etiquetaVacio?: string;
}) {
  const total = datos.reduce((suma, d) => suma + d.valor, 0);
  if (datos.length === 0 || total === 0) {
    return <Vacio texto={etiquetaVacio} />;
  }

  const coloreados = datos.map((d, i) => ({
    ...d,
    colorResuelto:
      d.color ?? ESCALA_PASTEL_DEFECTO[i % ESCALA_PASTEL_DEFECTO.length],
  }));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 140, height: 140, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={coloreados}
              dataKey="valor"
              nameKey="etiqueta"
              innerRadius="55%"
              outerRadius="100%"
              paddingAngle={2}
            >
              {coloreados.map((d) => (
                <Cell key={d.etiqueta} fill={d.colorResuelto} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                borderColor: "var(--color-border-soft)",
                fontSize: 13,
              }}
              formatter={(valor, nombre) => [
                `${Number(valor ?? 0).toLocaleString("es-GT")}`,
                nombre,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 0,
        }}
      >
        {coloreados.map((d) => (
          <li
            key={d.etiqueta}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              fontSize: 12.5,
              color: "var(--color-text-main)",
              lineHeight: 1.3,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: d.colorResuelto,
                marginTop: 2,
                flexShrink: 0,
              }}
            />
            <span>
              {d.etiqueta}{" "}
              <span style={{ color: "var(--color-text-muted)" }}>
                ({d.valor.toLocaleString("es-GT")})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────── Estado vacío ─────────────────────── */

function Vacio({ texto }: { texto: string }) {
  return (
    <p
      style={{
        padding: "24px 16px",
        textAlign: "center",
        color: "var(--color-text-muted)",
        fontSize: "0.9rem",
      }}
    >
      {texto}
    </p>
  );
}
