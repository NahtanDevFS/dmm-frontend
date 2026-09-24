import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../../test/reactQuery";
import { ProveedorAvisos } from "../../../componentes/ui/avisos/ProveedorAvisos";

/**
 * QA-06: el cambio de contraseña limita los intentos. Lo que quedan se muestra
 * fijo bajo el campo de la contraseña actual, no en un aviso que desaparece.
 */
vi.mock("../../../api/usuarios", () => ({
  cambiarPasswordPropia: vi.fn(),
}));

import { cambiarPasswordPropia } from "../../../api/usuarios";
import ModalCambiarPassword from "../ModalCambiarPassword";

const cambiarMock = vi.mocked(cambiarPasswordPropia);

function respuesta(status: number, data: object) {
  return new AxiosError("fallo", "ERR", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });
}

function renderizar() {
  const Envoltorio = envolverConQueryClient(crearQueryClientDePrueba());
  render(
    <Envoltorio>
      <ProveedorAvisos>
        <ModalCambiarPassword abierto onCerrar={() => undefined} />
      </ProveedorAvisos>
    </Envoltorio>,
  );
}

async function enviar(actual = "incorrecta1") {
  const campoActual = screen.getByLabelText(/Contraseña actual/);
  await userEvent.clear(campoActual);
  await userEvent.type(campoActual, actual);
  const campoNueva = screen.getByLabelText(/Contraseña nueva/);
  await userEvent.clear(campoNueva);
  await userEvent.type(campoNueva, "NuevaClave123");
  await userEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

beforeEach(() => {
  cambiarMock.mockReset();
  // jsdom no implementa <dialog>.showModal(), que usa el componente Modal
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

describe("ModalCambiarPassword", () => {
  it("muestra bajo el campo cuántos intentos quedan", async () => {
    cambiarMock.mockRejectedValue(
      respuesta(400, {
        code: "CURRENT_PASSWORD_INVALID",
        intentos_restantes: 3,
        message: "La contraseña actual no es correcta. Le quedan 3 intentos.",
      }),
    );
    renderizar();

    await enviar();

    const campo = screen.getByLabelText(/Contraseña actual/);
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(
      await screen.findByText(/Le quedan 3 intentos/),
    ).toBeInTheDocument();
  });

  it("el mensaje se quita al corregir la contraseña", async () => {
    cambiarMock.mockRejectedValue(
      respuesta(400, {
        code: "CURRENT_PASSWORD_INVALID",
        intentos_restantes: 4,
        message: "La contraseña actual no es correcta. Le quedan 4 intentos.",
      }),
    );
    renderizar();
    await enviar();
    await screen.findByText(/Le quedan 4 intentos/);

    await userEvent.type(screen.getByLabelText(/Contraseña actual/), "x");

    expect(screen.queryByText(/Le quedan 4 intentos/)).not.toBeInTheDocument();
  });

  it("con el último intento gastado deshabilita el envío", async () => {
    cambiarMock.mockRejectedValue(
      respuesta(400, {
        code: "CURRENT_PASSWORD_INVALID",
        intentos_restantes: 0,
        message:
          "La contraseña actual no es correcta. Era su último intento: deberá esperar 15 minutos para volver a intentarlo.",
      }),
    );
    renderizar();

    await enviar();

    expect(await screen.findByText(/último intento/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    ).toBeDisabled();
  });

  it("bloqueado por el servidor (429) también deshabilita el envío", async () => {
    cambiarMock.mockRejectedValue(
      respuesta(429, {
        code: "CAMBIO_PASSWORD_BLOQUEADO",
        intentos_restantes: 0,
        message:
          "Agotó los 5 intentos para cambiar su contraseña. Podrá intentarlo de nuevo en 12 minutos.",
      }),
    );
    renderizar();

    await enviar();

    expect(await screen.findByText(/de nuevo en 12 minutos/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    ).toBeDisabled();
  });
});
