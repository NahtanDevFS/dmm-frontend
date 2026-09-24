import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/**
 * Agregar un insumo a una solicitud nueva.
 *
 * Regresión: cuando la categoría del insumo admitía préstamo (la silla de
 * ruedas), la modalidad se tomaba de un selector que se había quitado de la
 * pantalla. Quedaba vacía y el formulario respondía "Elija la modalidad:
 * donación o préstamo." sin forma de elegirla. Las solicitudes son siempre
 * donaciones, sin importar la categoría.
 */
vi.mock("../../../api/axiosClient", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({
    usuario: { id: 1, username: "ana", rol: "EMPLEADO_DMM", programa_id: null },
  }),
}));

import axiosClient from "../../../api/axiosClient";
import ModalSolicitud from "../ModalSolicitud";

const getMock = vi.mocked(axiosClient.get);

function insumo(id: number, nombre: string, permitePrestamo: boolean) {
  return {
    insumo_id: id,
    insumo_nombre: nombre,
    categoria_id: id,
    categoria_nombre: permitePrestamo ? "Equipo médico" : "Medicamentos",
    permite_prestamo: permitePrestamo,
    unidad_base_nombre: "Unidad",
    requiere_fecha_caducidad: false,
    requiere_codigo_fabricante: false,
    bloquea_solicitud_sin_stock: false,
    serie_por_unidad: false,
    stock_total: 5,
    proxima_caducidad: null,
    semaforo: null,
  };
}

const RESPUESTAS: Record<string, unknown> = {
  "modalidades-solicitud": [
    { id: 1, nombre: "DONACION", activo: true },
    { id: 2, nombre: "PRESTAMO", activo: true },
  ],
  programas: [],
  "unidades-medida": [],
  "insumos/stock": [
    insumo(4, "silla de ruedas", true),
    insumo(1, "Paracetamol 500 mg", false),
  ],
};

beforeEach(() => {
  getMock.mockReset();
  getMock.mockImplementation(async (url: string) => ({
    // Presentaciones y formularios exigidos: vacíos, no intervienen aquí
    data: RESPUESTAS[url] ?? [],
  }));
  // jsdom no implementa <dialog>.showModal(), que usa el componente Modal
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

function renderizar() {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <ModalSolicitud abierto onCerrar={() => undefined} />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

async function agregarInsumo(nombre: RegExp) {
  const selector = screen.getByLabelText(/^Insumo/);
  const opcion = await within(selector).findByRole("option", { name: nombre });
  await userEvent.selectOptions(selector, opcion);
  await userEvent.type(screen.getByLabelText(/Cantidad requerida/), "1");
  await userEvent.click(screen.getByRole("button", { name: /Agregar insumo/ }));
}

describe("ModalSolicitud: agregar insumos", () => {
  it("agrega un insumo de una categoría que admite préstamo, como donación", async () => {
    renderizar();

    await agregarInsumo(/silla de ruedas/);

    expect(screen.queryByText(/Elija la modalidad/)).not.toBeInTheDocument();
    const fila = (await screen.findByRole("cell", { name: "silla de ruedas" }))
      .closest("tr")!;
    expect(within(fila).getByText("Donación")).toBeInTheDocument();
  });

  it("agrega un insumo de una categoría sin préstamo, como donación", async () => {
    renderizar();

    await agregarInsumo(/Paracetamol/);

    const fila = (
      await screen.findByRole("cell", { name: "Paracetamol 500 mg" })
    ).closest("tr")!;
    expect(within(fila).getByText("Donación")).toBeInTheDocument();
  });
});
