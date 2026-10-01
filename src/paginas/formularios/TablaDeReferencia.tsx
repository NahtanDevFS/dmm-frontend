import type { TablaReferencia } from "./sugerencias";
import estilos from "./Formularios.module.css";

/* La tabla de medidas del papel, bajo el campo donde se escribe la medida.
   La fila que corresponde a lo escrito se resalta, y además dice «(esta)»: el
   color acompaña al texto, nunca lo sustituye. */
function TablaDeReferencia({ tabla }: { tabla: TablaReferencia }) {
  return (
    <table className={estilos.tablaReferencia}>
      <caption>{tabla.titulo}</caption>
      <thead>
        <tr>
          {tabla.columnas.map((columna) => (
            <th key={columna} scope="col">
              {columna}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tabla.filas.map((fila, i) => (
          <tr key={i}>
            {fila.map((celda, j) => (
              <td
                key={j}
                className={celda.marcada ? estilos.celdaMarcada : undefined}
              >
                {celda.texto}
                {/* Una sola marca por tramo resaltado: al final de él */}
                {celda.marcada && !fila[j + 1]?.marcada && (
                  <span className={estilos.marcaCelda}> (esta)</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TablaDeReferencia;
