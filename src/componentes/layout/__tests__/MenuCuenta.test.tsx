import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../ui/avisos/ProveedorAvisos";
import type { UsuarioSesion } from "../../../types/api";

const salir = vi.fn();
let usuario: UsuarioSesion;

vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({ usuario, salir, saliendo: false }),
}));

import MenuCuenta from "../MenuCuenta";

function renderizar() {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <p>Fuera del menú</p>
        <MenuCuenta />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

const disparador = () => screen.getByRole("button", { name: /^Cuenta de/ });

beforeEach(() => {
  salir.mockReset();
  usuario = {
    id: 7,
    username: "marinee",
    nombre_completo: "Marineé Recinos",
    rol: "EMPLEADO_DMM",
    programa_id: 7,
    programa_nombre: "Adulto mayor",
  } as UsuarioSesion;
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

describe("MenuCuenta", () => {
  it("muestra la inicial del nombre completo y empieza cerrado", () => {
    renderizar();

    expect(disparador()).toHaveTextContent("M");
    expect(disparador()).toHaveAccessibleName("Cuenta de Marineé Recinos");
    expect(disparador()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Cerrar sesión")).not.toBeInTheDocument();
  });

  it("al abrirlo muestra nombre, usuario, rol legible y programa", async () => {
    renderizar();

    await userEvent.click(disparador());

    expect(disparador()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Marineé Recinos")).toBeInTheDocument();
    expect(screen.getByText("marinee")).toBeInTheDocument();
    expect(screen.getByText("Trabajo social")).toBeInTheDocument();
    expect(screen.getByText("Adulto mayor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("sin nombre completo usa el usuario y no lo repite", async () => {
    usuario = { ...usuario, nombre_completo: null, programa_nombre: null };
    renderizar();

    expect(disparador()).toHaveTextContent("M");
    await userEvent.click(disparador());

    expect(screen.getAllByText("marinee")).toHaveLength(1);
    expect(screen.queryByText("Programa a su cargo")).not.toBeInTheDocument();
  });

  it("Escape lo cierra y devuelve el foco al botón", async () => {
    renderizar();
    await userEvent.click(disparador());

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByText("Cerrar sesión")).not.toBeInTheDocument();
    expect(disparador()).toHaveFocus();
  });

  it("se cierra al pulsar fuera", async () => {
    renderizar();
    await userEvent.click(disparador());

    await userEvent.click(screen.getByText("Fuera del menú"));

    expect(screen.queryByText("Cerrar sesión")).not.toBeInTheDocument();
  });

  it("«Cerrar sesión» cierra la sesión", async () => {
    renderizar();
    await userEvent.click(disparador());

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(salir).toHaveBeenCalledTimes(1);
  });

  it("«Cambiar contraseña» cierra el panel y abre el modal", async () => {
    renderizar();
    await userEvent.click(disparador());

    await userEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(screen.queryByText("Cerrar sesión")).not.toBeInTheDocument();
    expect(await screen.findByText("Cambiar mi contraseña")).toBeInTheDocument();
  });
});
