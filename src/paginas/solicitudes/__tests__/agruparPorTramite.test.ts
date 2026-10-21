import { describe, expect, it } from "vitest";
import { agruparPorTramite } from "../agruparPorTramite";

/* El listado de solicitudes va por insumo; antes, dos filas del mismo trámite
   no tenían nada que las uniera y una solicitud de varios insumos parecía
   varias solicitudes. */

describe("agrupar filas del listado por trámite", () => {
  it("las filas seguidas de una solicitud continúan la primera, que dice cuántas abarca", () => {
    expect(
      agruparPorTramite([
        { solicitud_id: 9 },
        { solicitud_id: 9 },
        { solicitud_id: 8 },
        { solicitud_id: 7 },
        { solicitud_id: 7 },
        { solicitud_id: 7 },
      ]),
    ).toEqual([
      { continua: false, filas: 2, par: false },
      { continua: true, filas: 1, par: false },
      { continua: false, filas: 1, par: true },
      { continua: false, filas: 3, par: false },
      { continua: true, filas: 1, par: false },
      { continua: true, filas: 1, par: false },
    ]);
  });

  it("la primera fila de la página siempre muestra su trámite completo", () => {
    // Una solicitud repartida entre dos páginas: en la segunda arranca de nuevo
    expect(agruparPorTramite([{ solicitud_id: 5 }])[0].continua).toBe(false);
  });

  it("sin filas no hay grupos", () => {
    expect(agruparPorTramite([])).toEqual([]);
  });
});
