import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Logotipo from "../../componentes/marca/Logotipo";
import { useAuth } from "../../auth/useAuth";
import { esLimiteExcedido, mensajeDeError } from "../../lib/errores";
import { intentosRestantes } from "../../lib/limitePeticiones";
import { esquemaAcceso, type DatosAcceso } from "./esquema";
import estilos from "./PaginaAcceso.module.css";

/**
 * Redacta el error del intento fallido. El backend ya manda un texto en
 * español, así que se respeta y solo se le añade el conteo de intentos cuando
 * el servidor permite leerlo.
 */
function textoDeError(error: unknown): string {
  const base = mensajeDeError(error, "No se pudo iniciar sesión.");
  if (esLimiteExcedido(error)) return base;

  const restantes = intentosRestantes(error);
  if (restantes === null || restantes === 0) return base;
  if (restantes === 1) {
    return base + " Le queda 1 intento antes del bloqueo temporal.";
  }
  return base + " Le quedan " + restantes + " intentos antes del bloqueo temporal.";
}

function PaginaAcceso() {
  const idUsuario = useId();
  const idContrasena = useId();
  const [verContrasena, setVerContrasena] = useState(false);
  const { entrar } = useAuth();

  const {
    register,
    handleSubmit,
    setFocus,
    setError,
    clearErrors,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<DatosAcceso>({
    resolver: zodResolver(esquemaAcceso),
    defaultValues: { username: "", password: "" },
  });

  // El foco inicial cae en el campo de usuario (sección 5). Quien atiende en
  // ventanilla entra decenas de veces al día y no debería tener que apuntar.
  useEffect(() => setFocus("username"), [setFocus]);

  const errorGeneral = errors.root?.message;

  const enviar = handleSubmit(async (datos) => {
    clearErrors("root");
    try {
      await entrar(datos);
    } catch (error) {
      setError("root", { message: textoDeError(error) });
      // La contraseña se limpia y recupera el foco: reintentar es lo único
      // que se puede hacer, y no debería haber que borrarla a mano.
      resetField("password");
      setFocus("password");
    }
  });

  return (
    <div className={estilos.pagina}>
      <aside className={estilos.panel}>
        <Logotipo alto={64} sobreFondoOscuro alt="" className={estilos.marca} />
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

          <form onSubmit={enviar} noValidate>
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
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isSubmitting}
                  aria-invalid={errors.username ? "true" : undefined}
                  aria-describedby={
                    errors.username ? idUsuario + "-error" : undefined
                  }
                  className={estilos.entrada + " " + estilos.entradaUsuario}
                  {...register("username")}
                />
                {errors.username && (
                  <p id={idUsuario + "-error"} className={estilos.errorCampo}>
                    {errors.username.message}
                  </p>
                )}
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
                    type={verContrasena ? "text" : "password"}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    aria-invalid={errors.password ? "true" : undefined}
                    aria-describedby={
                      errors.password ? idContrasena + "-error" : undefined
                    }
                    className={estilos.entrada}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className={estilos.botonMostrar}
                    onClick={() => setVerContrasena((v) => !v)}
                    aria-pressed={verContrasena}
                    disabled={isSubmitting}
                  >
                    {verContrasena ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {errors.password && (
                  <p id={idContrasena + "-error"} className={estilos.errorCampo}>
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className={estilos.botonEntrar}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verificando…" : "Entrar"}
            </button>

            {/* role alert para que el lector de pantalla anuncie el fallo: el
                color por sí solo nunca es señal suficiente (sección 7). */}
            {errorGeneral && (
              <p className={estilos.errorGeneral} role="alert">
                {errorGeneral}
              </p>
            )}
          </form>

          <p className={estilos.pieCampos}>
            ¿Olvidó su contraseña? Solicite el restablecimiento al administrador
            del sistema: las cuentas no se recuperan por correo.
          </p>
        </div>
      </main>
    </div>
  );
}

export default PaginaAcceso;
