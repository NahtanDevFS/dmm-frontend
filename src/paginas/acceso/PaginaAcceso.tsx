import { useId, useState } from "react";
import Logotipo from "../../componentes/marca/Logotipo";
import estilos from "./PaginaAcceso.module.css";

function PaginaAcceso() {
  const idUsuario = useId();
  const idContrasena = useId();
  const [verContrasena, setVerContrasena] = useState(false);

  return (
    <div className={estilos.pagina}>
      <aside className={estilos.panel}>
        <Logotipo variante="compacto" alto={72} sobreFondoOscuro alt="" />
        <div>
          <h1 className={estilos.panelTitulo}>
            Dirección Municipal de la Mujer
          </h1>
          <p className={estilos.panelSubtitulo}>
            Sistema de gestión de beneficiarios, programas y entregas.
          </p>
        </div>
        <p className={estilos.panelAviso}>Solo acceso autorizado</p>
      </aside>

      <main className={estilos.zonaFormulario}>
        <div className={estilos.tarjeta}>
          <h2 className={estilos.titulo}>Iniciar sesión</h2>
          <p className={estilos.ayuda}>Ingrese con su usuario institucional.</p>

          <form noValidate>
            <div className={estilos.campos}>
              <div className={estilos.campo}>
                <label htmlFor={idUsuario}>
                  Usuario
                  <span className={estilos.obligatorio} aria-hidden="true">
                    *
                  </span>
                  <span className="solo-lectores"> (obligatorio)</span>
                </label>
                <input
                  id={idUsuario}
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={`${estilos.entrada} ${estilos.entradaUsuario}`}
                />
              </div>

              <div className={estilos.campo}>
                <label htmlFor={idContrasena}>
                  Contraseña
                  <span className={estilos.obligatorio} aria-hidden="true">
                    *
                  </span>
                  <span className="solo-lectores"> (obligatorio)</span>
                </label>
                <div className={estilos.grupoContrasena}>
                  <input
                    id={idContrasena}
                    name="password"
                    type={verContrasena ? "text" : "password"}
                    autoComplete="current-password"
                    className={estilos.entrada}
                  />
                  <button
                    type="button"
                    className={estilos.botonMostrar}
                    onClick={() => setVerContrasena((v) => !v)}
                    aria-pressed={verContrasena}
                  >
                    {verContrasena ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className={estilos.botonEntrar}>
              Entrar
            </button>
          </form>

          <p className={estilos.pieCampos}>
            ¿Olvidó su contraseña? Solicite el restablecimiento al
            administrador del sistema: las cuentas no se recuperan por correo.
          </p>
        </div>
      </main>
    </div>
  );
}

export default PaginaAcceso;
