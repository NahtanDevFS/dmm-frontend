import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/* Despachar un medicamento exige la receta médica (config/receta.ts en el
   backend). Antes la receta no se pedía en ningún punto del despacho. */

vi.mock("../../../hooks/useCatalogo", () => ({
  claveCatalogo: (ruta: string) => ["catalogo", ruta],
  useCatalogo: (ruta: string) => ({
    isPending: false,
    isError: false,
    error: null,
    opciones:
      ruta === "tipos-evidencia-entrega"
        ? [
            { id: 4, nombre: "OTRO" },
            { id: 5, nombre: "RECETA_MEDICA" },
          ]
        : [],
  }),
}));

vi.mock("../../../api/entregas", () => ({
  CLAVE_ENTREGAS: "entregas",
  registrarEntrega: vi.fn(),
  subirEvidencia: vi.fn(),
}));

// Fuera de lo que se prueba: consultan la API por su cuenta
vi.mock("../PreviaLotes", () => ({ default: () => null }));
vi.mock("../../solicitudes/BuscadorPersona", () => ({ default: () => null }));

import ModalDespacho from "../ModalDespacho";
import { registrarEntrega, subirEvidencia } from "../../../api/entregas";

const registrarMock = vi.mocked(registrarEntrega);
const subirMock = vi.mocked(subirEvidencia);

function renderizar(requiereReceta: boolean) {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <ModalDespacho
          solicitudId={1}
          lineaId={2}
          personaId={3}
          insumoId={4}
          insumoNombre="Amoxicilina"
          pendiente={10}
          requiereReceta={requiereReceta}
          abierto
          onCerrar={() => {}}
        />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

// El <input type="file"> está oculto tras los botones «Seleccionar archivo» y
// «Tomar foto»; se le entrega el archivo directo, sin el chequeo de puntero.
const subir = (archivo: File) =>
  userEvent
    .setup({ pointerEventsCheck: 0 })
    .upload(screen.getByLabelText(/Receta médica/), archivo);

const botonRegistrar = () =>
  screen.getByRole("button", { name: "Registrar entrega" });

beforeEach(() => {
  registrarMock.mockReset();
  subirMock.mockReset();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

describe("receta médica al despachar", () => {
  it("un medicamento no se despacha sin adjuntar la receta", () => {
    renderizar(true);
    expect(screen.getByLabelText(/Receta médica/)).toBeInTheDocument();
    expect(botonRegistrar()).toBeDisabled();
  });

  it("con la receta se registra y se guarda como evidencia «Receta médica»", async () => {
    registrarMock.mockResolvedValue({ id: 99 } as never);
    subirMock.mockResolvedValue({} as never);
    renderizar(true);

    const receta = new File(["x"], "receta.png", { type: "image/png" });
    await subir(receta);
    expect(botonRegistrar()).toBeEnabled();
    await userEvent.click(botonRegistrar());

    await waitFor(() =>
      expect(subirMock).toHaveBeenCalledWith(99, {
        archivo: receta,
        tipoEvidenciaId: 5,
      }),
    );
  });

  it("si la receta no se pudo subir, avisa que la entrega quedó sin ella", async () => {
    registrarMock.mockResolvedValue({ id: 99 } as never);
    subirMock.mockRejectedValue(new Error("red"));
    renderizar(true);

    await subir(new File(["x"], "receta.png", { type: "image/png" }));
    await userEvent.click(botonRegistrar());

    expect(
      await screen.findByText(/la receta no se pudo guardar/),
    ).toBeInTheDocument();
  });

  it("lo que no es medicamento no pide receta", () => {
    renderizar(false);
    expect(screen.queryByLabelText(/Receta médica/)).not.toBeInTheDocument();
    expect(botonRegistrar()).toBeEnabled();
  });
});
