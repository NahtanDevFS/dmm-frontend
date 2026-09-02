import estilos from "./Auditoria.module.css";

/** Campos que fn_auditoria() siempre toca aunque nadie haya cambiado nada de negocio. */
const CAMPOS_TECNICOS = new Set([
  "updated_at",
  "updated_by",
  "created_at",
  "created_by",
]);

function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function sonIguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compara valores_antiguos y valores_nuevos campo por campo, en vez de
 * volcar los dos JSON crudos: lo que de verdad importa al revisar un
 * cambio es qué campo cambió y a qué valor, no releer una fila entera para
 * encontrarlo a ojo. Los campos que no cambiaron se muestran igual, pero
 * atenuados, al final.
 */
function TablaCambios({
  anteriores,
  nuevos,
}: {
  anteriores: Record<string, unknown> | null;
  nuevos: Record<string, unknown> | null;
}) {
  // INSERT: no hay "antes". DELETE: no hay "después". UPDATE: hay ambos.
  if (!anteriores) {
    return (
      <div>
        <p className={estilos.nota}>Registro creado con estos valores:</p>
        <table className={estilos.tablaCambios}>
          <tbody>
            {Object.entries(nuevos ?? {}).map(([campo, valor]) => (
              <tr key={campo}>
                <td className={estilos.campoCambiado}>{campo}</td>
                <td className={estilos.valorNuevo}>{formatearValor(valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!nuevos) {
    return (
      <div>
        <p className={estilos.nota}>Registro eliminado. Últimos valores:</p>
        <table className={estilos.tablaCambios}>
          <tbody>
            {Object.entries(anteriores).map(([campo, valor]) => (
              <tr key={campo}>
                <td className={estilos.campoCambiado}>{campo}</td>
                <td className={estilos.valorAnterior}>
                  {formatearValor(valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const campos = Array.from(
    new Set([...Object.keys(anteriores), ...Object.keys(nuevos)]),
  ).sort();

  const cambiados = campos.filter(
    (c) => !sonIguales(anteriores[c], nuevos[c]) && !CAMPOS_TECNICOS.has(c),
  );
  const sinCambio = campos.filter((c) => !cambiados.includes(c));

  return (
    <table className={estilos.tablaCambios}>
      <thead>
        <tr>
          <th>Campo</th>
          <th>Antes</th>
          <th>Después</th>
        </tr>
      </thead>
      <tbody>
        {cambiados.length === 0 &&
        sinCambio.every((c) => CAMPOS_TECNICOS.has(c)) ? (
          <tr>
            <td colSpan={3} className={estilos.auxiliar}>
              Sin cambios de datos — solo se actualizó la marca de fecha.
            </td>
          </tr>
        ) : (
          cambiados.map((campo) => (
            <tr key={campo}>
              <td className={estilos.campoCambiado}>{campo}</td>
              <td className={estilos.valorAnterior}>
                {formatearValor(anteriores[campo])}
              </td>
              <td className={estilos.valorNuevo}>
                {formatearValor(nuevos[campo])}
              </td>
            </tr>
          ))
        )}
        {sinCambio
          .filter((c) => !CAMPOS_TECNICOS.has(c))
          .map((campo) => (
            <tr key={campo} className={estilos.filaSinCambio}>
              <td>{campo}</td>
              <td className={estilos.valorSinCambio} colSpan={2}>
                {formatearValor(nuevos[campo])}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default TablaCambios;
