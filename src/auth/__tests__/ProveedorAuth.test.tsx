import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import {
  crearQueryClientDePrueba,
  envolverConQueryClient,
} from "../../test/reactQuery";

/**
 * QA-16: si el POST /auth/logout no llega al servidor, la sesión (y su cookie
 * HttpOnly) siguen vivas. Antes se limpiaba el estado igual y se mostraba el
 * acceso como si se hubiera cerrado; al recargar, /auth/me la recuperaba sola.
 */
vi.mock("../../api/auth", () => ({
  obtenerSesion: vi.fn(),
  iniciarSesion: vi.fn(),
  cerrarSesion: vi.fn(),
}));

import { cerrarSesion, obtenerSesion } from "../../api/auth";
import { ProveedorAuth } from "../ProveedorAuth";
import { useAuth } from "../useAuth";
import PantallaCierrePendiente from "../../paginas/acceso/PantallaCierrePendiente";
import { hayCierrePendiente, marcarCierrePendiente } from "../cierrePendiente";

const cerrarMock = vi.mocked(cerrarSesion);
const sesionMock = vi.mocked(obtenerSesion);

const USUARIO = { id: 1, username: "ana", rol: "EMPLEADO_DMM" } as never;

function errorHttp(status: number) {
  return new AxiosError("fallo", "ERR", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });
}
const sinRed = () => new AxiosError("Network Error", "ERR_NETWORK");

/** Réplica mínima de App: cierre pendiente > comprobando > acceso > app */
function Consumidor() {
  const { usuario, comprobandoSesion, cierrePendiente, salir } = useAuth();
  if (cierrePendiente) return <PantallaCierrePendiente />;
  if (comprobandoSesion) return <p>comprobando</p>;
  if (!usuario) return <p>pantalla de acceso</p>;
  return (
    <button type="button" onClick={() => void salir()}>
      Cerrar sesión
    </button>
  );
}

function renderizar() {
  const client = crearQueryClientDePrueba();
  const Envoltorio = envolverConQueryClient(client);
  return render(
    <Envoltorio>
      <ProveedorAuth>
        <Consumidor />
      </ProveedorAuth>
    </Envoltorio>,
  );
}

beforeEach(() => {
  cerrarMock.mockReset();
  sesionMock.mockReset();
  window.localStorage.clear();
});

describe("cierre de sesión", () => {
  it("con confirmación del servidor muestra el acceso", async () => {
    sesionMock.mockResolvedValue(USUARIO);
    cerrarMock.mockResolvedValue();
    renderizar();

    await userEvent.click(await screen.findByText("Cerrar sesión"));

    expect(await screen.findByText("pantalla de acceso")).toBeInTheDocument();
    expect(hayCierrePendiente()).toBe(false);
  });

  it("un 401 cuenta como cerrado: la sesión ya no existía", async () => {
    sesionMock.mockResolvedValue(USUARIO);
    cerrarMock.mockRejectedValue(errorHttp(401));
    renderizar();

    await userEvent.click(await screen.findByText("Cerrar sesión"));

    expect(await screen.findByText("pantalla de acceso")).toBeInTheDocument();
    expect(hayCierrePendiente()).toBe(false);
  });

  it("sin red no finge el cierre: avisa y deja la marca para la recarga", async () => {
    sesionMock.mockResolvedValue(USUARIO);
    cerrarMock.mockRejectedValue(sinRed());
    renderizar();

    await userEvent.click(await screen.findByText("Cerrar sesión"));

    expect(
      await screen.findByText("No se pudo confirmar el cierre de sesión"),
    ).toBeInTheDocument();
    expect(screen.queryByText("pantalla de acceso")).not.toBeInTheDocument();
    expect(hayCierrePendiente()).toBe(true);
  });

  it("con un error 500 tampoco lo da por cerrado", async () => {
    sesionMock.mockResolvedValue(USUARIO);
    cerrarMock.mockRejectedValue(errorHttp(500));
    renderizar();

    await userEvent.click(await screen.findByText("Cerrar sesión"));

    expect(
      await screen.findByText("No se pudo confirmar el cierre de sesión"),
    ).toBeInTheDocument();
  });

  it("el reintento manual completa el cierre", async () => {
    sesionMock.mockResolvedValue(USUARIO);
    cerrarMock.mockRejectedValueOnce(sinRed()).mockResolvedValueOnce();
    renderizar();

    await userEvent.click(await screen.findByText("Cerrar sesión"));
    await userEvent.click(
      await screen.findByText("Reintentar cierre de sesión"),
    );

    expect(await screen.findByText("pantalla de acceso")).toBeInTheDocument();
    expect(hayCierrePendiente()).toBe(false);
  });

  it("si el reintento vuelve a fallar lo dice", async () => {
    sesionMock.mockResolvedValue(USUARIO);
    cerrarMock.mockRejectedValue(sinRed());
    renderizar();

    await userEvent.click(await screen.findByText("Cerrar sesión"));
    await userEvent.click(
      await screen.findByText("Reintentar cierre de sesión"),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Todavía no hay conexión",
    );
  });
});

describe("recarga con un cierre pendiente", () => {
  it("no rescata la sesión con /auth/me: reintenta el cierre", async () => {
    marcarCierrePendiente();
    cerrarMock.mockResolvedValue();
    renderizar();

    expect(await screen.findByText("pantalla de acceso")).toBeInTheDocument();
    expect(cerrarMock).toHaveBeenCalledTimes(1);
    expect(sesionMock).not.toHaveBeenCalled();
  });

  it("si sigue sin red, se mantiene el aviso y reintenta al volver la conexión", async () => {
    marcarCierrePendiente();
    cerrarMock.mockRejectedValueOnce(sinRed()).mockResolvedValueOnce();
    renderizar();

    expect(
      await screen.findByText("No se pudo confirmar el cierre de sesión"),
    ).toBeInTheDocument();
    await waitFor(() => expect(cerrarMock).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(await screen.findByText("pantalla de acceso")).toBeInTheDocument();
    expect(sesionMock).not.toHaveBeenCalled();
  });
});
