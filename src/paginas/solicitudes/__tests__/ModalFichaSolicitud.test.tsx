import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/* Cuándo se ofrece «Cancelar solicitud».

   Regresión: el botón miraba solo `activo`, pero cancelar la solicitud
   cancela sus líneas y deja la cabecera activa. Una solicitud ya cancelada
   seguía ofreciendo cancelarse, y el intento terminaba en el error de
   sp_cancelar_solicitud_completa («no tiene líneas pendientes de cancelar»). */
vi.mock("../../../api/axiosClient", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({
    usuario: { id: 1, username: "ana", rol: "EMPLEADO_DMM", programa_id: null },
  }),
}));

import axiosClient from "../../../api/axiosClient";
import ModalFichaSolicitud from "../ModalFichaSolicitud";

const ESTADOS = [
  { id: 1, nombre: "PENDIENTE_ADQUISICION", activo: true },
  { id: 2, nombre: "PENDIENTE_ENTREGA", activo: true },
  { id: 6, nombre: "ENTREGADA", activo: true },
  { id: 7, nombre: "CANCELADA", activo: true },
];

function linea(id: number, estadoId: number) {
  return {
    id, solicitud_id: 5, insumo_id: 4, cantidad_requerida: 1, cantidad_entregada: 0,
    estado_id: estadoId, fecha_asignacion: null, receta_medica_id: null,
    modalidad_solicitud_id: 1, presentacion_solicitud_id: null,
    cantidad_presentacion: null, activo: true,
  };
}

function preparar(estadosDeLineas: number[]) {
  vi.mocked(axiosClient.get).mockImplementation(async (url: string) => {
    if (url === "solicitudes/5") {
      return {
        data: {
          id: 5, persona_id: 3, programa_id: 1, fecha_solicitud: "2026-09-23",
          requiere_aprobacion: false, aprobada: false, estado_id: 7,
          fecha_aprobacion: null, aprobado_por: null, observaciones_trabajo_social: null,
          registrada_en_suplencia: false, activo: true,
          lineas: estadosDeLineas.map((e, i) => linea(i + 1, e)),
          recetas: [], documentos: [],
        },
      };
    }
    if (url === "estados-solicitud") return { data: ESTADOS };
    if (url === "personas/3") {
      return { data: { id: 3, nombres: "Sofía", apellidos: "Juárez", cui_dpi: null, fecha_nacimiento: "1950-03-14", activo: true } };
    }
    return { data: [] };
  });
}

function renderizar() {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <ModalFichaSolicitud solicitudId={5} abierto onCerrar={() => undefined} />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

beforeEach(() => {
  vi.mocked(axiosClient.get).mockReset();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

describe("ModalFichaSolicitud: cancelar la solicitud", () => {
  it("se ofrece mientras alguna línea sigue pendiente", async () => {
    preparar([1, 7]);
    renderizar();
    expect(await screen.findByRole("button", { name: "Cancelar solicitud" })).toBeInTheDocument();
  });

  it("no se ofrece si todas las líneas ya están canceladas", async () => {
    preparar([7, 7]);
    renderizar();
    await screen.findByRole("button", { name: "Exportar expediente" });
    expect(screen.queryByRole("button", { name: "Cancelar solicitud" })).not.toBeInTheDocument();
  });

  it("no se ofrece si lo que queda está entregado o cancelado", async () => {
    preparar([6, 7]);
    renderizar();
    await screen.findByRole("button", { name: "Exportar expediente" });
    expect(screen.queryByRole("button", { name: "Cancelar solicitud" })).not.toBeInTheDocument();
  });
});
