import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/* Edición del nombre de un catálogo. El backend ya la permitía (PATCH /:id),
   pero la pantalla solo ofrecía crear, desactivar y reactivar: un error de
   escritura obligaba a crear otro registro y dejar el historial en el viejo. */

const elementos = [
  { id: 8, nombre: "Dispacidad y técnico en trabajo social", descripcion: null, activo: true },
];

vi.mock("../../../hooks/useCatalogo", () => ({
  claveCatalogo: (ruta: string) => ["catalogo", ruta],
  useCatalogo: () => ({
    isPending: false,
    isError: false,
    error: null,
    opciones: elementos,
  }),
}));

vi.mock("../../../api/catalogos", () => ({
  crearElemento: vi.fn(),
  editarElemento: vi.fn(),
  desactivarElemento: vi.fn(),
  reactivarElemento: vi.fn(),
}));

import CatalogoGenerico from "../CatalogoGenerico";
import { CATALOGOS } from "../definiciones";
import { editarElemento } from "../../../api/catalogos";

const editarMock = vi.mocked(editarElemento);
const programas = CATALOGOS.find((c) => c.ruta === "programas")!;
const unidades = CATALOGOS.find((c) => c.ruta === "unidades-medida")!;

function renderizar(definicion = programas) {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <CatalogoGenerico definicion={definicion} />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

function dialogoAbierto(): HTMLElement {
  const dialogo = document.querySelector("dialog[open]");
  if (!dialogo) throw new Error("No hay modal abierto");
  return dialogo as HTMLElement;
}

beforeEach(() => {
  editarMock.mockReset();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

describe("editar un registro del catálogo", () => {
  it("corrige el nombre y conserva los campos propios", async () => {
    editarMock.mockResolvedValue({});
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const modal = within(dialogoAbierto());
    const nombre = modal.getByLabelText(/Nombre/);
    expect(nombre).toHaveValue("Dispacidad y técnico en trabajo social");

    await userEvent.clear(nombre);
    await userEvent.type(nombre, "Discapacidad y técnico en trabajo social");
    await userEvent.click(modal.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(editarMock).toHaveBeenCalledWith("programas", 8, {
        nombre: "Discapacidad y técnico en trabajo social",
        descripcion: null,
      }),
    );
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });

  it("avisa que el cambio se verá en lo ya registrado", async () => {
    renderizar();
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(dialogoAbierto()).toHaveTextContent(
      "Úselo para corregir; si es otro programa distinto, agréguelo como nuevo",
    );
  });

  it("en unidades de medida advierte no cambiar una unidad por otra", async () => {
    renderizar(unidades);
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(dialogoAbierto()).toHaveTextContent("Nunca cambie una unidad por otra");
  });

  it("un nombre repetido se explica y el modal sigue abierto", async () => {
    editarMock.mockRejectedValue(
      new AxiosError("conflicto", "ERR", undefined, undefined, {
        status: 409,
        statusText: "",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: 'Ya existe un registro con el nombre "OMSAN"' },
      }),
    );
    renderizar();
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const modal = within(dialogoAbierto());
    await userEvent.clear(modal.getByLabelText(/Nombre/));
    await userEvent.type(modal.getByLabelText(/Nombre/), "OMSAN");
    await userEvent.click(modal.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText('Ya existe un registro con el nombre "OMSAN"'),
    ).toBeInTheDocument();
    expect(document.querySelector("dialog[open]")).not.toBeNull();
  });
});
