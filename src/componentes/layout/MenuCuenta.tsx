import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { etiquetaDe } from "../../lib/etiquetas";
import ModalCambiarPassword from "../../paginas/usuarios/ModalCambiarPassword";
import estilos from "./MenuCuenta.module.css";

/** Primera letra para el avatar. Con el nombre completo si lo hay: "María" da "M", no la del usuario de acceso. */
function inicialDe(texto: string): string {
  const primera = texto.trim().charAt(0);
  return primera ? primera.toLocaleUpperCase("es") : "?";
}

/**
 * Cuenta de quien tiene la sesión: un botón con su inicial que despliega sus
 * datos y las acciones de la cuenta.
 *
 * Es un disclosure (botón con aria-expanded que muestra un panel), no un
 * role="menu": el panel mezcla información y acciones, y un menú de ARIA
 * obligaría a navegar con flechas en vez de con Tab. Se cierra con Escape
 * (devolviendo el foco al botón), al pulsar fuera o al elegir una acción.
 */
function MenuCuenta() {
  const { usuario, salir, saliendo } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const idPanel = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAbierto(false);
        disparador.current?.focus();
      }
    };
    document.addEventListener("pointerdown", alPulsarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alPulsarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  if (!usuario) return null;

  const nombreCompleto = usuario.nombre_completo?.trim() || null;
  const nombre = nombreCompleto ?? usuario.username;
  const inicial = inicialDe(nombre);

  return (
    <div className={estilos.contenedor} ref={contenedor}>
      <button
        ref={disparador}
        type="button"
        className={estilos.disparador}
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={"Cuenta de " + nombre}
        onClick={() => setAbierto((v) => !v)}
      >
        <span aria-hidden="true">{inicial}</span>
      </button>

      {abierto && (
        <div id={idPanel} className={estilos.panel}>
          <div className={estilos.cabecera}>
            <span className={estilos.avatar} aria-hidden="true">
              {inicial}
            </span>
            <div className={estilos.datos}>
              <p className={estilos.nombre}>{nombre}</p>
              {/* Sin nombre completo, el nombre ya es el usuario: no repetirlo */}
              {nombreCompleto && (
                <p className={estilos.usuario}>
                  <span className="solo-lectores">Usuario: </span>
                  {usuario.username}
                </p>
              )}
              <p className={estilos.rol}>{etiquetaDe(usuario.rol)}</p>
            </div>
          </div>

          {usuario.programa_nombre && (
            <p className={estilos.programa}>
              <span className={estilos.programaEtiqueta}>Programa a su cargo</span>
              {usuario.programa_nombre}
            </p>
          )}

          <div className={estilos.acciones}>
            <button
              type="button"
              className={estilos.accion}
              onClick={() => {
                setAbierto(false);
                setCambiandoPassword(true);
              }}
            >
              Cambiar contraseña
            </button>
            <button
              type="button"
              className={estilos.accion + " " + estilos.salir}
              onClick={() => void salir()}
              disabled={saliendo}
            >
              {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      )}

      {/* Fuera del panel: sigue abierto aunque el panel se cierre */}
      {cambiandoPassword && (
        <ModalCambiarPassword
          abierto
          onCerrar={() => setCambiandoPassword(false)}
        />
      )}
    </div>
  );
}

export default MenuCuenta;
