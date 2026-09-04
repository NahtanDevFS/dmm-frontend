import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { useCatalogo } from "../../hooks/useCatalogo";
import {
  calcularEdad,
  esMenorDeEdad,
  formatearCui,
  formatearFecha,
} from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import {
  CLAVE_PERSONAS,
  desactivarPersona,
  obtenerPersona,
  reactivarPersona,
} from "../../api/personas";
import type { Comunidad, ElementoCatalogo } from "../../types/api";
import {
  SeccionContactos,
  SeccionDiscapacidades,
  SeccionEncargados,
} from "./secciones";
import SeccionDocumentos from "./SeccionDocumentos";
import { datosFaltantesDelEstudio } from "./datosFaltantes";
import ModalEditar from "./ModalEditar";
import estilos from "./Ficha.module.css";

function Dato({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className={estilos.dato}>
      <dt>{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Ficha del beneficiario.
 *
 * Va en modal sobre el listado y no en pantalla aparte: consultar una ficha es
 * un vistazo dentro de una tarea que ocurre en la tabla —revisar varias
 * personas de una comunidad, por ejemplo—, y sacar al usuario de ella le
 * costaba perder el filtro, la búsqueda y la página en la que estaba. Al
 * cerrar, la tabla sigue exactamente donde la dejó.
 *
 * Es un modal amplio porque no es un formulario sino un expediente con cinco
 * regiones. La edición de los datos generales abre a su vez su propio modal
 * encima: el elemento `dialog` nativo los apila en la capa superior sin que
 * haya que coordinar nada.
 */
function ModalFicha({
  personaId,
  abierto,
  onCerrar,
}: {
  personaId: number;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();
  const [editando, setEditando] = useState(false);

  const cambioDeEstado = useMutation({
    mutationFn: (activar: boolean) =>
      activar ? reactivarPersona(personaId) : desactivarPersona(personaId),
    onSuccess: async (_datos, activar) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_PERSONAS] });
      avisar(
        activar ? "Beneficiario reactivado." : "Beneficiario desactivado.",
        "exito",
      );
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const consulta = useQuery({
    queryKey: [CLAVE_PERSONAS, personaId],
    queryFn: () => obtenerPersona(personaId),
    enabled: Number.isInteger(personaId),
  });

  const comunidades = useCatalogo<Comunidad>("comunidades", {
    // Incluye las dadas de baja: si la comunidad de esta persona se desactivó
    // después, sin esto la ficha mostraría un guion donde hay un dato.
    incluirInactivos: true,
  });
  const generos = useCatalogo<ElementoCatalogo>("tipos-genero");

  const persona = consulta.data;
  const edad = persona ? calcularEdad(persona.fecha_nacimiento) : Number.NaN;
  const menor = persona ? esMenorDeEdad(persona.fecha_nacimiento) : false;

  const estadosCiviles = useCatalogo<ElementoCatalogo>("estados-civiles");
  const estadoCivil = estadosCiviles.opciones.find(
    (e) => e.id === persona?.estado_civil_id,
  );

  const gradosAcademicos = useCatalogo<ElementoCatalogo>("grados-academicos");
  const gradoAcademico = gradosAcademicos.opciones.find(
    (g) => g.id === persona?.grado_academico_id,
  );

  const ocupaciones = useCatalogo<ElementoCatalogo>("ocupaciones");
  const ocupacion = ocupaciones.opciones.find(
    (o) => o.id === persona?.ocupacion_id,
  );

  const municipios = useCatalogo<ElementoCatalogo>("municipios");
  const municipioNacimiento = municipios.opciones.find(
    (m) => m.id === persona?.municipio_nacimiento_id,
  );

  /** Los datos de la sección I del estudio que esta ficha todavía no tiene. */
  const faltantes = persona ? datosFaltantesDelEstudio(persona) : [];
  const comunidad = comunidades.opciones.find(
    (c) => c.id === persona?.comunidad_id,
  );
  const genero = generos.opciones.find((g) => g.id === persona?.genero_id);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={
        persona
          ? persona.nombres + " " + persona.apellidos
          : "Ficha del beneficiario"
      }
      /*
        Subtítulo con lo que identifica a la persona de un vistazo. El CUI se
        omite cuando no lo hay en vez de poner un guion: «— · 36 años» hace
        pensar en un dato roto, y no tenerlo es lo normal en un menor.
      */
      descripcion={
        persona
          ? [
              persona.cui_dpi ? formatearCui(persona.cui_dpi) : null,
              Number.isFinite(edad) ? edad + " años" : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          : undefined
      }
      tamano="amplio"
      bloqueado={cambioDeEstado.isPending}
      pie={
        <GrupoBotones>
          <Boton variante="terciaria" onClick={onCerrar}>
            Cerrar
          </Boton>
          {persona &&
            (persona.activo ? (
              <Boton
                variante="terciaria"
                cargando={cambioDeEstado.isPending}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: "Desactivar beneficiario",
                    mensaje:
                      "Dejará de aparecer en los listados y no debería recibir nuevas entregas. Sus registros históricos se conservan y puede reactivarse después.",
                    textoConfirmar: "Desactivar",
                    destructiva: true,
                  });
                  if (ok) cambioDeEstado.mutate(false);
                }}
              >
                Desactivar
              </Boton>
            ) : (
              <Boton
                variante="secundaria"
                cargando={cambioDeEstado.isPending}
                onClick={() => cambioDeEstado.mutate(true)}
              >
                Reactivar
              </Boton>
            ))}
          {persona && (
            <Boton variante="secundaria" onClick={() => setEditando(true)}>
              Editar datos
            </Boton>
          )}
        </GrupoBotones>
      }
    >
      {consulta.isPending ? (
        <>
          <Esqueleto ancho={280} alto={28} />
          <div style={{ marginTop: 24 }}>
            <Esqueleto alto={16} />
          </div>
        </>
      ) : consulta.isError || !persona ? (
        <EstadoVacio
          titulo="No se pudo cargar la ficha"
          texto={mensajeDeError(consulta.error)}
          accion={
            <Boton
              variante="secundaria"
              onClick={() => void consulta.refetch()}
            >
              Reintentar
            </Boton>
          }
        />
      ) : (
        <div className={estilos.enModal}>
          <div className={estilos.identidad}>
            {menor && <Insignia tono="marca">Menor de edad</Insignia>}
            {!persona.activo && <Insignia tono="neutra">Inactivo</Insignia>}
          </div>

          {!persona.activo && (
            <p className={estilos.inactivo}>
              Este beneficiario está dado de baja. Sus registros históricos se
              conservan, pero no debería recibir nuevas entregas mientras siga
              inactivo.
            </p>
          )}

          <section className={estilos.tarjeta} aria-labelledby="f-generales">
            <div className={estilos.tituloTarjeta}>
              <h2 id="f-generales">Datos generales</h2>
            </div>
            <dl className={estilos.datos}>
              <Dato titulo="CUI / DPI">
                <span className={estilos.datoIdentificador}>
                  {formatearCui(persona.cui_dpi)}
                </span>
              </Dato>
              <Dato titulo="Fecha de nacimiento">
                {formatearFecha(persona.fecha_nacimiento)}
              </Dato>
              <Dato titulo="Edad">
                {Number.isFinite(edad) ? edad + " años" : "—"}
              </Dato>
              <Dato titulo="Género">{genero?.nombre ?? "—"}</Dato>
              <Dato titulo="Comunidad">{comunidad?.nombre ?? "—"}</Dato>
              <Dato titulo="Teléfono">{persona.telefono ?? "—"}</Dato>
              <Dato titulo="Estado civil">{estadoCivil?.nombre ?? "—"}</Dato>
              <Dato titulo="Lugar de nacimiento">
                {municipioNacimiento?.nombre ?? "—"}
              </Dato>
              <Dato titulo="Dirección de vivienda">
                {persona.direccion ?? "—"}
              </Dato>
              <Dato titulo="Grado académico">
                {gradoAcademico?.nombre ?? "—"}
              </Dato>
              <Dato titulo="Ocupación">{ocupacion?.nombre ?? "—"}</Dato>
            </dl>

            {/*
              Cuáles de estos datos faltan importa: son los que el estudio
              socioeconómico va a pedir, y descubrir que faltan cuando la
              persona ya se fue obliga a llamarla de vuelta. Se avisa aquí, en
              la ficha, y no al llenar el formulario.
            */}
            {faltantes.length > 0 && (
              <p className={estilos.nota}>
                Falta registrar: {faltantes.join(", ")}. El estudio
                socioeconómico los pide.
              </p>
            )}
          </section>

          <SeccionDiscapacidades
            personaId={persona.id}
            discapacidades={persona.discapacidades}
          />

          <SeccionEncargados
            personaId={persona.id}
            encargados={persona.encargados}
            menor={menor}
            tieneDiscapacidad={persona.discapacidades.length > 0}
            tieneCui={Boolean(persona.cui_dpi)}
          />

          <SeccionContactos
            personaId={persona.id}
            contactos={persona.contactos}
          />

          <SeccionDocumentos
            personaId={persona.id}
            cuiPersona={persona.cui_dpi}
          />

          {editando && (
            <ModalEditar
              persona={persona}
              abierto={editando}
              onCerrar={() => setEditando(false)}
            />
          )}
        </div>
      )}
    </Modal>
  );
}

export default ModalFicha;
