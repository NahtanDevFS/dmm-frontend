import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_PERSONAS,
  agregarContacto,
  agregarDiscapacidad,
  desvincularEncargado,
  eliminarContacto,
  quitarDiscapacidad,
  vincularEncargado,
  type ContactoDePersona,
  type DiscapacidadDePersona,
  type EncargadoDePersona,
} from "../../api/personas";
import type { ElementoCatalogo } from "../../types/api";
import { normalizarTelefono, telefonoValido } from "../../lib/telefono";
import estilos from "./Ficha.module.css";

/**
 * Hook común de las tres secciones.
 *
 * Todas hacen lo mismo alrededor de la mutación: refrescar la ficha, avisar y
 * traducir el error. Tenerlo en un sitio evita que una sección olvide
 * invalidar y deje la pantalla mostrando lo que ya no existe.
 */
function useAccionFicha(personaId: number) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const ejecutar = async (
    accion: () => Promise<unknown>,
    mensajeExito: string,
  ) => {
    try {
      await accion();
      await clienteQuery.invalidateQueries({
        queryKey: [CLAVE_PERSONAS, personaId],
      });
      avisar(mensajeExito, "exito");
      return true;
    } catch (error) {
      avisar(mensajeDeError(error), "error");
      return false;
    }
  };

  return { ejecutar, confirmar };
}

/* ═════════════════════════ Discapacidades ═════════════════════════ */

export function SeccionDiscapacidades({
  personaId,
  discapacidades,
}: {
  personaId: number;
  discapacidades: DiscapacidadDePersona[];
}) {
  const catalogo = useCatalogo<ElementoCatalogo>("discapacidades");
  const { ejecutar, confirmar } = useAccionFicha(personaId);
  const [seleccion, setSeleccion] = useState("");
  const mutacion = useMutation({
    mutationFn: async (f: () => Promise<unknown>) => f(),
  });

  // Solo se ofrecen las que la persona todavía no tiene: reagregar una
  // existente devolvería un 409 que el usuario no puede resolver.
  const disponibles = catalogo.opciones.filter(
    (d) =>
      !discapacidades.some((asignada) => asignada.discapacidad_id === d.id),
  );

  return (
    <section
      className={estilos.tarjeta + " " + estilos.tarjetaSensible}
      aria-labelledby="f-discapacidades"
    >
      <div className={estilos.tituloTarjeta}>
        <h2 id="f-discapacidades">Discapacidades</h2>
      </div>
      <p className={estilos.nota}>
        Información de salud. No aparece en el listado general.
      </p>

      {discapacidades.length === 0 ? (
        <p className={estilos.elementoDetalle}>Ninguna registrada.</p>
      ) : (
        <div className={estilos.listaSimple}>
          {discapacidades.map((d) => (
            <div key={d.discapacidad_id} className={estilos.elemento}>
              <Insignia tono="informativa">{d.nombre}</Insignia>
              <Boton
                pequeno
                variante="terciaria"
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: "Quitar discapacidad",
                    mensaje:
                      "Se quitará «" +
                      d.nombre +
                      "» del registro de esta persona.",
                    textoConfirmar: "Quitar",
                    destructiva: true,
                  });
                  if (!ok) return;
                  await mutacion.mutateAsync(() =>
                    ejecutar(
                      () => quitarDiscapacidad(personaId, d.discapacidad_id),
                      "Discapacidad quitada.",
                    ),
                  );
                }}
              >
                Quitar
              </Boton>
            </div>
          ))}
        </div>
      )}

      {disponibles.length > 0 && (
        <div className={estilos.formularioEnLinea}>
          <CampoSelect
            etiqueta="Agregar discapacidad"
            value={seleccion}
            onChange={(e) => setSeleccion(e.target.value)}
          >
            {disponibles.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </CampoSelect>
          <Boton
            variante="secundaria"
            disabled={!seleccion}
            cargando={mutacion.isPending}
            onClick={async () => {
              const ok = await mutacion.mutateAsync(() =>
                ejecutar(
                  () => agregarDiscapacidad(personaId, Number(seleccion)),
                  "Discapacidad agregada.",
                ),
              );
              if (ok) setSeleccion("");
            }}
          >
            Agregar
          </Boton>
        </div>
      )}
    </section>
  );
}

/* ═════════════════════════ Encargados ═════════════════════════ */

/**
 * Encargados de una persona ya registrada.
 *
 * El encargado se recomienda para menores de edad y para quienes tienen
 * alguna discapacidad registrada, pero nunca bloquea: la base dejó de
 * exigirlo en la migración 22. La ficha usa el mismo criterio y el mismo tono
 * que el alta, para que la regla no se lea distinta según por dónde se entre.
 */
export function SeccionEncargados({
  personaId,
  encargados,
  menor,
  tieneDiscapacidad = false,
  tieneCui = true,
}: {
  personaId: number;
  encargados: EncargadoDePersona[];
  menor: boolean;
  tieneDiscapacidad?: boolean;
  tieneCui?: boolean;
}) {
  const parentescos = useCatalogo<ElementoCatalogo>("tipos-parentesco");
  const { ejecutar, confirmar } = useAccionFicha(personaId);
  const [idEncargado, setIdEncargado] = useState("");
  const [parentesco, setParentesco] = useState("");
  const mutacion = useMutation({
    mutationFn: async (f: () => Promise<unknown>) => f(),
  });

  return (
    <section className={estilos.tarjeta} aria-labelledby="f-encargados">
      <div className={estilos.tituloTarjeta}>
        <h2 id="f-encargados">Encargados</h2>
      </div>

      {encargados.length === 0 ? (
        <p className={estilos.elementoDetalle}>
          {menor
            ? "Ninguno registrado. La persona es menor de edad, así que conviene anotar quién responde por ella" +
              (tieneCui ? "." : ", sobre todo porque no tiene CUI/DPI.")
            : tieneDiscapacidad
              ? "Ninguno registrado. La persona tiene una discapacidad registrada, así que conviene anotar quién responde por ella."
              : "Ninguno registrado."}
        </p>
      ) : (
        <div className={estilos.listaSimple}>
          {encargados.map((e) => (
            <div key={e.encargado_id} className={estilos.elemento}>
              <div className={estilos.elementoTexto}>
                <p className={estilos.elementoNombre}>
                  {e.nombres} {e.apellidos}
                </p>
                <p className={estilos.elementoDetalle}>{e.parentesco_nombre}</p>
              </div>
              <Boton
                pequeno
                variante="terciaria"
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: "Desvincular encargado",
                    mensaje:
                      "Se desvinculará a " +
                      e.nombres +
                      " " +
                      e.apellidos +
                      ". La persona seguirá registrada por su cuenta.",
                    textoConfirmar: "Desvincular",
                    destructiva: true,
                  });
                  if (!ok) return;
                  await mutacion.mutateAsync(() =>
                    ejecutar(
                      () => desvincularEncargado(personaId, e.encargado_id),
                      "Encargado desvinculado.",
                    ),
                  );
                }}
              >
                Desvincular
              </Boton>
            </div>
          ))}
        </div>
      )}

      {/*
        Se vincula una persona ya registrada, por su identificador. Crear un
        encargado nuevo se hace desde el alta del beneficiario, donde entra en
        la misma transacción; aquí sería una persona suelta si algo fallara.
      */}
      <div className={estilos.formularioEnLinea}>
        <CampoTexto
          etiqueta="Vincular persona registrada"
          inputMode="numeric"
          placeholder="Id de la persona"
          ayuda="Búsquela en el listado y copie su identificador."
          value={idEncargado}
          onChange={(e) => setIdEncargado(e.target.value)}
        />
        <CampoSelect
          etiqueta="Parentesco"
          value={parentesco}
          onChange={(e) => setParentesco(e.target.value)}
        >
          {parentescos.opciones.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </CampoSelect>
        <Boton
          variante="secundaria"
          disabled={!idEncargado || !parentesco}
          cargando={mutacion.isPending}
          onClick={async () => {
            const ok = await mutacion.mutateAsync(() =>
              ejecutar(
                () =>
                  vincularEncargado(personaId, {
                    tipo: "existente",
                    personaId: Number(idEncargado),
                    tipoParentescoId: Number(parentesco),
                  }),
                "Encargado vinculado.",
              ),
            );
            if (ok) {
              setIdEncargado("");
              setParentesco("");
            }
          }}
        >
          Vincular
        </Boton>
      </div>
    </section>
  );
}

/* ═════════════════════════ Contactos ═════════════════════════ */

export function SeccionContactos({
  personaId,
  contactos,
}: {
  personaId: number;
  contactos: ContactoDePersona[];
}) {
  const { ejecutar, confirmar } = useAccionFicha(personaId);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const mutacion = useMutation({
    mutationFn: async (f: () => Promise<unknown>) => f(),
  });

  return (
    <section className={estilos.tarjeta} aria-labelledby="f-contactos">
      <div className={estilos.tituloTarjeta}>
        <h2 id="f-contactos">Contactos de referencia</h2>
      </div>

      {contactos.length === 0 ? (
        <p className={estilos.elementoDetalle}>Ninguno registrado.</p>
      ) : (
        <div className={estilos.listaSimple}>
          {contactos.map((c) => (
            <div key={c.id} className={estilos.elemento}>
              <div className={estilos.elementoTexto}>
                <p className={estilos.elementoNombre}>{c.nombre}</p>
                <p className={estilos.elementoDetalle}>
                  {c.telefono ?? "Sin teléfono"}
                  {c.observaciones ? " · " + c.observaciones : ""}
                </p>
              </div>
              <Boton
                pequeno
                variante="terciaria"
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: "Eliminar contacto",
                    mensaje:
                      "Se eliminará a " + c.nombre + " de los contactos.",
                    textoConfirmar: "Eliminar",
                    destructiva: true,
                  });
                  if (!ok) return;
                  await mutacion.mutateAsync(() =>
                    ejecutar(
                      () => eliminarContacto(personaId, c.id),
                      "Contacto eliminado.",
                    ),
                  );
                }}
              >
                Eliminar
              </Boton>
            </div>
          ))}
        </div>
      )}

      <div className={estilos.formularioEnLinea}>
        <CampoTexto
          etiqueta="Nombre del contacto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <CampoTexto
          etiqueta="Teléfono"
          obligatorio
          type="tel"
          placeholder="5512 3344"
          ayuda="8 dígitos."
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          error={
            telefono.trim() !== "" && !telefonoValido(telefono)
              ? "El teléfono debe tener 8 dígitos."
              : undefined
          }
        />
        <Boton
          variante="secundaria"
          disabled={!nombre.trim() || !telefonoValido(telefono)}
          cargando={mutacion.isPending}
          onClick={async () => {
            const ok = await mutacion.mutateAsync(() =>
              ejecutar(
                () =>
                  agregarContacto(personaId, {
                    nombre: nombre.trim(),
                    telefono: normalizarTelefono(telefono),
                  }),
                "Contacto agregado.",
              ),
            );
            if (ok) {
              setNombre("");
              setTelefono("");
            }
          }}
        >
          Agregar
        </Boton>
      </div>
    </section>
  );
}
