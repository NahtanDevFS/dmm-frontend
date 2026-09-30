import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/* Resumen del paso 2 al prestar equipo con número de serie.
   
   Regresión: la serie se buscaba en la lista de unidades disponibles después
   de registrar el préstamo. Esa lista se recarga al registrarlo y la unidad
   prestada ya no está disponible, así que el resumen decía "serie" en blanco. */
vi.mock("../../../api/axiosClient", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({
    usuario: { id: 1, username: "ana", rol: "EMPLEADO_DMM", programa_id: null },
  }),
}));

import axiosClient from "../../../api/axiosClient";
import ModalRegistrarPrestamo from "../ModalRegistrarPrestamo";

const getMock = vi.mocked(axiosClient.get);
const postMock = vi.mocked(axiosClient.post);
let yaPrestado = false;

const ANDADOR = {
  insumo_id: 5,
  insumo_nombre: "Andador de aluminio",
  categoria_id: 3,
  categoria_nombre: "Equipo médico",
  permite_prestamo: true,
  unidad_base_nombre: "Unidad",
  requiere_fecha_caducidad: false,
  requiere_codigo_fabricante: false,
  bloquea_solicitud_sin_stock: false,
  serie_por_unidad: true,
  stock_total: 2,
  proxima_caducidad: null,
  semaforo: null,
};

const UNIDAD = {
  detalle_inventario_lote_id: 42,
  insumo_id: 5,
  insumo_nombre: "Andador de aluminio",
  numero_serie: "AND-2026-002",
  codigo_envio: "CR-2026-033",
  fecha_recepcion: "2026-08-05",
  institucion_nombre: "Cruz Roja",
  marca_nombre: null,
  cantidad_disponible: 1,
};

beforeEach(() => {
  yaPrestado = false;
  getMock.mockReset();
  getMock.mockImplementation(async (url: string) => {
    if (url === "insumos/stock") return { data: [ANDADOR] };
    // Tras el préstamo la unidad deja de estar disponible
    if (url === "insumos/5/unidades") return { data: yaPrestado ? [] : [UNIDAD] };
    if (url === "personas") {
      return {
        data: {
          total: 1, limite: 8, desplazamiento: 0, hay_mas: false,
          datos: [{ id: 4, nombres: "Juana Isabel", apellidos: "Martínez Díaz", cui_dpi: null, fecha_nacimiento: "1980-07-05", telefono: null, activo: true }],
        },
      };
    }
    if (url === "contratos/9") return { data: { id: 9, evidencias: [], multas: [] } };
    return { data: [] };
  });
  postMock.mockReset();
  postMock.mockImplementation(async () => {
    yaPrestado = true;
    return { data: { id: 9, entrega_id: 3 } };
  });
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

describe("ModalRegistrarPrestamo", () => {
  it("el resumen del paso 2 muestra la serie de la unidad prestada", async () => {
    const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
    render(
      <Envoltorio>
        <ProveedorAvisos>
          <ModalRegistrarPrestamo abierto onCerrar={() => undefined} />
        </ProveedorAvisos>
      </Envoltorio>,
    );

    await userEvent.type(screen.getByLabelText(/Persona que firma el contrato/), "Juana");
    await userEvent.click(await screen.findByRole("option", { name: /Juana Isabel/ }));

    const equipo = screen.getByLabelText(/^Equipo/);
    await userEvent.selectOptions(equipo, await within(equipo).findByRole("option", { name: /Andador/ }));
    const unidad = await screen.findByLabelText(/Unidad que se entrega/);
    await userEvent.selectOptions(unidad, await within(unidad).findByRole("option", { name: /AND-2026-002/ }));
    fireEvent.change(screen.getByLabelText(/Fecha de devolución pactada/), { target: { value: "2099-12-31" } });

    await userEvent.click(screen.getByRole("button", { name: "Registrar préstamo" }));

    expect(await screen.findByText(/Préstamo registrado/)).toBeInTheDocument();
    expect(screen.getByText(/serie AND-2026-002/)).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith(
      "contratos/directo",
      expect.objectContaining({ detalle_inventario_lote_id: 42 }),
    );
  });
});
