import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/* Contraseña nueva escrita dos veces, y con «Mostrar».

   Al restablecer, quien la escribe tiene que comunicarla; al cambiar la
   propia, un error de dedo deja a la persona fuera de su cuenta. Sin
   confirmación, ninguno de los dos se notaba hasta el siguiente inicio de
   sesión. */
vi.mock("../../../api/usuarios", () => ({
  resetearPassword: vi.fn(),
  cambiarPasswordPropia: vi.fn(),
}));

import { resetearPassword, type Usuario } from "../../../api/usuarios";
import ModalResetearPassword from "../ModalResetearPassword";

const usuario = { id: 7, username: "celeste" } as Usuario;

function renderizar() {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <ModalResetearPassword usuario={usuario} abierto onCerrar={() => undefined} />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

beforeEach(() => {
  vi.mocked(resetearPassword).mockReset();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
});

describe("Restablecer contraseña", () => {
  it("no deja restablecer mientras la confirmación no coincida", async () => {
    renderizar();
    const boton = screen.getByRole("button", { name: "Restablecer" });

    await userEvent.type(screen.getByLabelText(/^Contraseña nueva/), "Clave1234");
    expect(boton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Confirme la contraseña nueva/), "Clave1235");
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(boton).toBeDisabled();

    const confirmacion = screen.getByLabelText(/Confirme la contraseña nueva/);
    await userEvent.clear(confirmacion);
    await userEvent.type(confirmacion, "Clave1234");
    expect(screen.queryByText("Las contraseñas no coinciden.")).toBeNull();
    expect(boton).toBeEnabled();
  });

  it("«Mostrar» enseña la nueva y su confirmación a la vez, para compararlas", async () => {
    renderizar();
    const nueva = screen.getByLabelText(/^Contraseña nueva/);
    const confirmacion = screen.getByLabelText(/Confirme la contraseña nueva/);
    expect(nueva).toHaveAttribute("type", "password");

    await userEvent.click(screen.getAllByRole("button", { name: "Mostrar" })[0]);

    expect(nueva).toHaveAttribute("type", "text");
    expect(confirmacion).toHaveAttribute("type", "text");
    expect(screen.getAllByRole("button", { name: "Ocultar" })[0]).toHaveAttribute("aria-pressed", "true");
  });
});
