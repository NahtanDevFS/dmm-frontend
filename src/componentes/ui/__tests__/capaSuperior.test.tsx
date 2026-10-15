import { StrictMode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Modal from "../Modal";
import { modalSuperior } from "../capaSuperior";

/* Los avisos se montan dentro del modal que está encima (ProveedorAvisos).
   Regresión vista en el navegador: en modo estricto React monta, desmonta y
   vuelve a montar los efectos; el modal salía del registro y no volvía a
   entrar, y el aviso quedaba debajo de la ficha. */

// jsdom no implementa el dialog modal; lo mínimo que usa Modal
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

function Ficha({ abierto, titulo }: { abierto: boolean; titulo: string }) {
  return (
    <Modal abierto={abierto} onCerrar={() => {}} titulo={titulo}>
      <p>contenido</p>
    </Modal>
  );
}

describe("registro del modal superior", () => {
  it("en modo estricto el modal abierto queda registrado", () => {
    const { container, unmount } = render(
      <StrictMode>
        <Ficha abierto titulo="Ficha" />
      </StrictMode>,
    );
    expect(modalSuperior()).toBe(container.querySelector("dialog"));
    unmount();
    expect(modalSuperior()).toBeNull();
  });

  it("el último en abrirse es el de encima, y al cerrarlo vuelve el anterior", () => {
    const { container, rerender, unmount } = render(
      <StrictMode>
        <Ficha abierto titulo="Ficha" />
        <Ficha abierto={false} titulo="Confirmación" />
      </StrictMode>,
    );
    const [ficha, confirmacion] = container.querySelectorAll("dialog");

    rerender(
      <StrictMode>
        <Ficha abierto titulo="Ficha" />
        <Ficha abierto titulo="Confirmación" />
      </StrictMode>,
    );
    expect(modalSuperior()).toBe(confirmacion);

    rerender(
      <StrictMode>
        <Ficha abierto titulo="Ficha" />
        <Ficha abierto={false} titulo="Confirmación" />
      </StrictMode>,
    );
    expect(modalSuperior()).toBe(ficha);
    unmount();
  });
});
