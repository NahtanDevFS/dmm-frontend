import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CampoTexto } from "../../componentes/ui/Campo";
import Boton from "../../componentes/ui/Boton";
import { buscarPersonas } from "../../api/personas";
import { calcularEdad, formatearCui } from "../../lib/fechas";
import type { Persona } from "../../types/api";
import estiloCampo from "../../componentes/ui/Campo.module.css";
import estilos from "./Solicitudes.module.css";

const LARGO_MINIMO = 2;
const RETARDO_MS = 350;

/** Nombre y apellido juntos, tal como se leen en el resto del sistema. */
function nombreCompleto(persona: Persona): string {
  return persona.nombres + " " + persona.apellidos;
}

interface PropsBuscadorPersona {
  etiqueta: string;
  personaElegida: Persona | null;
  onElegir: (persona: Persona | null) => void;
  obligatorio?: boolean;
  error?: string;
  /**
   * Si el panel de resultados flota sobre el resto del formulario
   * (position: absolute) o empuja el contenido hacia abajo.
   *
   * Flotante es lo correcto en una fila de filtros compacta —donde ocupar
   * espacio real desalinearía los controles vecinos—, pero dentro de un modal
   * el panel queda recortado por el overflow-y: auto del cuerpo del modal
   * (Modal.module.css), que es lo que necesita ese scroll para que la
   * cabecera y el pie queden fijos. Un modal tiene espacio de sobra para
   * hacer sitio, así que ahí el panel empuja en vez de flotar.
   */
  flotante?: boolean;
}

/**
 * Buscador de persona por nombre o CUI/DPI, con resultados por similitud.
 *
 * Es el reemplazo, para este flujo, de pedir un id que nadie tiene a mano: se
 * escribe el nombre o el documento, se elige de la lista, y de ahí en
 * adelante el formulario solo conoce el id — el mismo patrón que
 * SelectorComunidad usa para departamento/municipio/comunidad.
 *
 * Escribir sin llegar a elegir a nadie de la lista es el error más fácil de
 * cometer aquí —el campo se ve lleno, pero por dentro sigue sin persona—, así
 * que ese caso se marca con un error explícito bajo el campo en cuanto se
 * abandona el control, en vez de dejar que el botón de enviar se quede
 * deshabilitado sin explicación.
 */
function BuscadorPersona({
  etiqueta,
  personaElegida,
  onElegir,
  obligatorio,
  error,
  flotante = true,
}: PropsBuscadorPersona) {
  const [texto, setTexto] = useState("");
  const [textoConRetardo, setTextoConRetardo] = useState("");
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTextoConRetardo(texto), RETARDO_MS);
    return () => clearTimeout(id);
  }, [texto]);

  const habilitada = textoConRetardo.trim().length >= LARGO_MINIMO;

  const resultados = useQuery({
    queryKey: ["buscador-personas", textoConRetardo],
    queryFn: () => buscarPersonas(textoConRetardo.trim()),
    enabled: habilitada,
  });

  /**
   * Hay texto escrito pero nadie elegido. Solo se avisa después de que el
   * campo pierde el foco (blur), no en cada tecla: mientras se escribe es
   * normal que todavía no haya elección, y marcarlo como error de inmediato
   * regañaría por algo que el usuario ni ha terminado de hacer.
   */
  const sinElegir = tocado && texto.trim() !== "" && !personaElegida;
  const errorMostrado =
    error ??
    (sinElegir
      ? "Escribió un nombre pero no eligió a nadie de la lista. Elija una persona o borre el texto."
      : undefined);

  if (personaElegida) {
    const edad = calcularEdad(personaElegida.fecha_nacimiento);
    return (
      <div className={estiloCampo.campo}>
        <span className={estiloCampo.etiqueta}>
          {etiqueta}
          {obligatorio && (
            <span className={estiloCampo.obligatorio} aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </span>
        <div className={estilos.personaElegida}>
          <div>
            <span className={estilos.personaElegidaNombre}>
              {nombreCompleto(personaElegida)}
            </span>
            <p className={estilos.auxiliar}>
              {[
                personaElegida.cui_dpi
                  ? "CUI/DPI: " + formatearCui(personaElegida.cui_dpi)
                  : "Sin CUI/DPI registrado",
                Number.isFinite(edad) ? edad + " años" : null,
                personaElegida.telefono,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Boton
            pequeno
            variante="terciaria"
            onClick={() => {
              onElegir(null);
              setTexto("");
              setTextoConRetardo("");
              setTocado(false);
            }}
          >
            Cambiar
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className={flotante ? estilos.contenedorBuscador : undefined}>
      <CampoTexto
        etiqueta={etiqueta}
        obligatorio={obligatorio}
        placeholder="Escriba el nombre o el CUI/DPI de la persona…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setTocado(false);
        }}
        onBlur={() => setTocado(true)}
        error={errorMostrado}
        ayuda={
          errorMostrado
            ? undefined
            : "Elija a la persona de la lista de resultados; escribir el nombre no basta."
        }
      />

      {habilitada && (
        <div
          className={
            flotante
              ? estilos.resultadosBusqueda
              : estilos.resultadosBusquedaFijos
          }
          role="listbox"
        >
          {resultados.isPending ? (
            <p className={estilos.auxiliar}>Buscando…</p>
          ) : resultados.isError ? (
            <p className={estilos.auxiliar}>
              No se pudo buscar. Intente de nuevo.
            </p>
          ) : resultados.data.length === 0 ? (
            <p className={estilos.auxiliar}>
              Nadie coincide con ese nombre o CUI/DPI. Verifique que la persona
              ya esté registrada en Beneficiarios.
            </p>
          ) : (
            resultados.data.map((persona) => (
              <button
                key={persona.id}
                type="button"
                role="option"
                aria-selected={false}
                className={estilos.resultadoPersona}
                onClick={() => {
                  onElegir(persona);
                  setTexto("");
                  setTextoConRetardo("");
                  setTocado(false);
                }}
              >
                <span>{nombreCompleto(persona)}</span>
                <span className={estilos.auxiliar}>
                  {persona.cui_dpi
                    ? "CUI/DPI: " + formatearCui(persona.cui_dpi)
                    : "Sin CUI/DPI registrado"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default BuscadorPersona;
