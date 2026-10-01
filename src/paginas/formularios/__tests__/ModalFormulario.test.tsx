import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";
import type { FormularioCampo } from "../../../api/formularios";
import { bloquesDeFormulario, totalDeGrupo } from "../bloques";
import { tablaReferencia } from "../sugerencias";

/* Formularios en el orden del papel (migración 31).

   Antes: todos los campos sueltos primero, todos los grupos al final y sin
   títulos. En el estudio socioeconómico los ingresos quedaban después de la
   vivienda, y en la solicitud de silla no se veía dónde empezaba la hoja 2.
   Además: el total de ingresos y egresos se suma solo, y las medidas de la
   hoja 2 muestran la tabla de referencia del papel. */
vi.mock("../../../api/axiosClient", () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import axiosClient from "../../../api/axiosClient";
import ModalFormulario from "../ModalFormulario";

function campo(
  id: number,
  etiqueta: string,
  seccion: string | null,
  extra: Partial<FormularioCampo> = {},
): FormularioCampo {
  return {
    id,
    formulario_id: 3,
    etiqueta,
    tipo_dato_id: 1,
    tipo_dato_nombre: "TEXTO_CORTO",
    catalogo_id: null,
    obligatorio: false,
    orden: id,
    grupo_repetible: null,
    ayuda: null,
    seccion,
    activo: true,
    ...extra,
  };
}

const NUMERO = { tipo_dato_nombre: "NUMERO" as const };

const ESTUDIO: FormularioCampo[] = [
  campo(1, "Registro médico", "I. Datos generales"),
  campo(2, "Quién aporta", "II. Ingresos y egresos", { grupo_repetible: "ingresos" }),
  campo(3, "Ingreso mensual (Q)", "II. Ingresos y egresos", { grupo_repetible: "ingresos", ...NUMERO }),
  campo(4, "Tipo de gasto", "II. Ingresos y egresos", { grupo_repetible: "egresos" }),
  campo(5, "Monto (Q)", "II. Ingresos y egresos", { grupo_repetible: "egresos", ...NUMERO }),
  campo(6, "Tipo de vivienda", "III. Vivienda"),
];

describe("bloquesDeFormulario", () => {
  it("sigue el orden del papel: título por sección y cada grupo donde está su primer campo", () => {
    const resumen = bloquesDeFormulario(ESTUDIO).map((b) =>
      b.tipo === "seccion"
        ? "# " + b.titulo
        : b.tipo === "grupo"
          ? "[" + b.nombre + "]"
          : b.campos.map((c) => c.etiqueta).join(", "),
    );
    expect(resumen).toEqual([
      "# I. Datos generales",
      "Registro médico",
      "# II. Ingresos y egresos",
      "[ingresos]",
      "[egresos]",
      "# III. Vivienda",
      "Tipo de vivienda",
    ]);
  });

  it("un campo sin sección sigue en la del anterior, sin repetir el título", () => {
    const bloques = bloquesDeFormulario([
      campo(1, "A", "Hoja 1"),
      campo(2, "B", null),
      campo(3, "C", "Hoja 1"),
    ]);
    expect(bloques).toHaveLength(2);
    expect(bloques[1]).toMatchObject({ tipo: "sueltos" });
  });
});

describe("totalDeGrupo", () => {
  it("suma solo los campos en quetzales e ignora lo vacío", () => {
    const campos = ESTUDIO.filter((c) => c.grupo_repetible === "ingresos");
    expect(
      totalDeGrupo(campos, [
        { 2: "Ana", 3: "1500" },
        { 2: "Luis", 3: "800.5" },
        { 2: "Sin dato", 3: null },
      ]),
    ).toBe(2300.5);
  });
});

describe("tablaReferencia", () => {
  it("marca la talla de GEN_2 y GEN_3 que corresponde a la cadera", () => {
    const tabla = tablaReferencia("Ancho de la cadera (cm)", "35")!;
    const marcadas = tabla.filas.flatMap((fila) =>
      fila.filter((c) => c.marcada).map((c) => fila[0].texto + " " + c.texto),
    );
    // 35 cm: GEN_2 M (33 a 37.9) y GEN_3 M (31 a 35.9)
    expect(marcadas).toEqual(["M 33 a 37.9", "M 31 a 35.9"]);
  });

  it("marca la posición del respaldo y no marca nada sin medida", () => {
    const conMedida = tablaReferencia("Altura de la espalda (cm)", "50")!;
    expect(conMedida.filas.find((f) => f[0].marcada)?.[1].texto).toBe("Media-alta");

    const sinMedida = tablaReferencia("Altura de la espalda (cm)", "")!;
    expect(sinMedida.filas.flat().some((c) => c.marcada)).toBe(false);
  });

  it("los demás campos no llevan tabla", () => {
    expect(tablaReferencia("Diagnóstico", "x")).toBeNull();
  });
});

describe("ModalFormulario", () => {
  beforeEach(() => {
    vi.mocked(axiosClient.get).mockReset();
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
  });

  it("muestra los títulos de sección y suma los ingresos y egresos guardados", async () => {
    vi.mocked(axiosClient.get).mockImplementation(async (url: string) => {
      if (url === "formularios/3") {
        return {
          data: { id: 3, nombre: "Estudio socioeconómico", descripcion: null, activo: true, campos: ESTUDIO },
        };
      }
      if (url === "formularios/lineas/9/3/respuestas") {
        const r = (id: number, campoId: number, fila: number, valor: string) => ({
          id, detalle_solicitud_formulario_id: 1, formulario_campo_id: campoId,
          numero_fila: fila, valor_texto: valor, activo: true,
        });
        return {
          data: {
            detalle: null,
            respuestas: [
              r(1, 2, 1, "Ana"), r(2, 3, 1, "1500"),
              r(3, 2, 2, "Luis"), r(4, 3, 2, "800.5"),
              r(5, 4, 1, "Luz"), r(6, 5, 1, "120"),
            ],
          },
        };
      }
      return { data: [] };
    });

    const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
    render(
      <Envoltorio>
        <ProveedorAvisos>
          <ModalFormulario
            detalleSolicitudId={9}
            formularioId={3}
            nombreFormulario="Estudio socioeconómico"
            abierto
            onCerrar={() => undefined}
          />
        </ProveedorAvisos>
      </Envoltorio>,
    );

    const secciones = await screen.findAllByRole("heading", { level: 3 });
    expect(secciones.map((h) => h.textContent)).toEqual([
      "I. Datos generales",
      "II. Ingresos y egresos",
      "III. Vivienda",
    ]);

    const ingresos = screen.getByRole("heading", { level: 4, name: "Ingresos" }).parentElement!;
    expect(within(ingresos).getByText(/Total de ingresos/).textContent).toMatch(/Q 2,300\.50/);
    const egresos = screen.getByRole("heading", { level: 4, name: "Egresos" }).parentElement!;
    expect(within(egresos).getByText(/Total de egresos/).textContent).toMatch(/Q 120\.00/);
  });
});
