import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/* Cuándo se ofrece aplicar una multa.
   
   Regresión: el formulario se escondía en cuanto el préstamo tenía devolución
   registrada. El atraso o el daño se descubren justamente al recibir el
   equipo, así que registrar la devolución dejaba sin forma de cobrarlos. Solo
   un préstamo anulado no admite multas. */
vi.mock("../../../api/axiosClient", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({
    usuario: { id: 1, username: "carmen", rol: "DIRECTORA", programa_id: null },
  }),
}));

import axiosClient from "../../../api/axiosClient";
import SeccionMultas from "../SeccionMultas";

beforeEach(() => {
  vi.mocked(axiosClient.get).mockResolvedValue({
    data: [{ id: 1, nombre: "ATRASO", monto_sugerido: "50.00", activo: true }],
  });
});

function renderizar(admiteMultas: boolean) {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <SeccionMultas contratoId={7} multas={[]} admiteMultas={admiteMultas} />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

describe("SeccionMultas", () => {
  it("ofrece aplicar una multa a un préstamo ya devuelto", () => {
    // ModalFichaContrato pasa admiteMultas={contrato.activo}: un préstamo
    // devuelto sigue activo.
    renderizar(true);
    expect(screen.getByLabelText(/Tipo de multa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar multa" })).toBeInTheDocument();
  });

  it("no ofrece aplicar multas a un préstamo anulado", () => {
    renderizar(false);
    expect(screen.queryByLabelText(/Tipo de multa/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aplicar multa" })).not.toBeInTheDocument();
  });
});
