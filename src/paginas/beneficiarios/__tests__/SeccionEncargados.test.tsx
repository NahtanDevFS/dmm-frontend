import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/* Vincular un encargado ya registrado.
   
   Regresión: la ficha pedía el identificador interno de la persona, que no
   aparece en ninguna pantalla, así que en la práctica no se podía vincular a
   nadie. Ahora se busca por nombre o CUI/DPI, igual que en solicitudes. */
vi.mock("../../../api/axiosClient", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({
    usuario: { id: 1, username: "ana", rol: "EMPLEADO_DMM", programa_id: null },
  }),
}));

import axiosClient from "../../../api/axiosClient";
import { SeccionEncargados } from "../secciones";

const getMock = vi.mocked(axiosClient.get);
const postMock = vi.mocked(axiosClient.post);

const persona = (id: number, nombres: string) => ({
  id, nombres, apellidos: "Juárez López", cui_dpi: null,
  fecha_nacimiento: "1978-02-02", telefono: null, activo: true,
});

beforeEach(() => {
  getMock.mockReset();
  getMock.mockImplementation(async (url: string) => {
    if (url === "tipos-parentesco") return { data: [{ id: 3, nombre: "HIJO_A", activo: true }] };
    if (url === "personas") {
      return {
        data: {
          total: 2, limite: 8, desplazamiento: 0, hay_mas: false,
          datos: [persona(24, "Sofía Margarita"), persona(25, "Lorena Beatriz")],
        },
      };
    }
    return { data: [] };
  });
  postMock.mockReset();
  postMock.mockResolvedValue({ data: null });
});

function renderizar() {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <SeccionEncargados personaId={24} encargados={[]} menor={false} />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

async function elegir(nombre: RegExp) {
  await userEvent.type(screen.getByLabelText(/Vincular persona registrada/), "Juárez");
  await userEvent.click(await screen.findByRole("option", { name: nombre }));
}

describe("SeccionEncargados: vincular", () => {
  it("vincula a la persona elegida en el buscador", async () => {
    renderizar();
    await elegir(/Lorena Beatriz/);
    const parentesco = screen.getByLabelText(/Parentesco/);
    await userEvent.selectOptions(parentesco, await within(parentesco).findByRole("option", { name: "Hijo(a)" }));

    await userEvent.click(screen.getByRole("button", { name: "Vincular" }));

    expect(postMock).toHaveBeenCalledWith("personas/24/encargados", {
      tipo: "existente",
      personaId: 25,
      tipoParentescoId: 3,
    });
  });

  it("no deja vincular a la persona como su propio encargado", async () => {
    renderizar();
    await elegir(/Sofía Margarita/);

    expect(screen.getByText(/no puede ser su propio encargado/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vincular" })).toBeDisabled();
  });
});
