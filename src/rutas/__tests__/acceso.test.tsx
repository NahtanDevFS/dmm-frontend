import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { destinoTrasEntrar, direccionDeAcceso } from "../acceso";
import type { ValorAuth } from "../../auth/contexto";

/* La dirección frente a la pantalla de acceso.

   Antes: el login se mostraba sin cambiar la dirección («/donaciones»), y al
   cerrar sesión a mano la siguiente persona entraba a la pantalla de la
   anterior; con otro rol, lo primero que veía era «Acceso denegado». */

let auth: Partial<ValorAuth>;
vi.mock("../../auth/useAuth", () => ({ useAuth: () => auth }));
vi.mock("../../paginas/acceso/PaginaAcceso", () => ({
  default: () => <p>Pantalla de acceso</p>,
}));
vi.mock("../Rutas", () => ({ default: () => <p>Aplicación</p> }));

import App from "../../App";

function Direccion() {
  const { pathname, search } = useLocation();
  return <output data-testid="direccion">{pathname + search}</output>;
}

function abrir(en: string) {
  render(
    <MemoryRouter initialEntries={[en]}>
      <App />
      <Direccion />
    </MemoryRouter>,
  );
  return screen.getByTestId("direccion");
}

const empleada = { id: 2, username: "amorales", rol: "EMPLEADO_DMM" } as ValorAuth["usuario"];

beforeEach(() => {
  auth = { usuario: null, comprobandoSesion: false, cierrePendiente: false, salidaManual: false };
});

describe("sin sesión", () => {
  it("si la sesión venció, la dirección es /acceso y recuerda la pantalla", () => {
    const direccion = abrir("/donaciones?recepcion=4");
    expect(screen.getByText("Pantalla de acceso")).toBeInTheDocument();
    expect(direccion.textContent).toBe("/acceso?volver=%2Fdonaciones%3Frecepcion%3D4");
  });

  it("tras cerrar sesión a mano no recuerda nada", () => {
    auth.salidaManual = true;
    expect(abrir("/usuarios").textContent).toBe("/acceso");
  });
});

describe("al entrar", () => {
  it("vuelve a la pantalla guardada si su rol la puede abrir", () => {
    auth.usuario = empleada;
    const direccion = abrir("/acceso?volver=%2Fdonaciones");
    expect(direccion.textContent).toBe("/donaciones");
    expect(screen.getByText("Aplicación")).toBeInTheDocument();
  });

  it("va a su inicio si su rol no puede abrirla", () => {
    auth.usuario = empleada;
    expect(abrir("/acceso?volver=%2Fusuarios").textContent).toBe("/");
  });
});

describe("destinoTrasEntrar", () => {
  it("descarta lo que no es una pantalla de la aplicación", () => {
    for (const volver of ["//otro-sitio.com", "https://otro-sitio.com", "/no-existe", "/acceso"]) {
      expect(destinoTrasEntrar("DIRECTORA", "?volver=" + encodeURIComponent(volver))).toBe("/");
    }
  });

  it("al alcalde lo lleva a Reportes, su inicio", () => {
    expect(destinoTrasEntrar("ALCALDE", "")).toBe("/reportes");
    expect(destinoTrasEntrar("ALCALDE", "?volver=%2Fdonaciones")).toBe("/reportes");
  });

  it("la raíz no se guarda: es el inicio de todos modos", () => {
    expect(direccionDeAcceso("/", "", true)).toBe("/acceso");
  });
});
