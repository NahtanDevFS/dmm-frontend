import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { useCatalogo } from "../../hooks/useCatalogo";
import { calcularEdad, esMenorDeEdad, formatearCui, formatearFecha } from "../../lib/fechas";
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
import ModalEditar from "./ModalEditar";
import estilos from "./Ficha.module.css";

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className={estilos.dato}>
      <dt>{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PaginaFicha() {
  const { id } = useParams();
  const personaId = Number(id);
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();
  const [editando, setEditando] = useState(false);

  const cambioDeEstado = useMutation({
    mutationFn: (activar: boolean) =>
      activar ? reactivarPersona(personaId) : desactivarPersona(personaId),
    onSuccess: async (_datos, activar) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_PERSONAS] });
      avisar(activar ? "Beneficiario reactivado." : "Beneficiario desactivado.", "exito");
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

  if (!Number.isInteger(personaId)) {
    return <EstadoVacio titulo="Identificador inválido" texto="La dirección no corresponde a una ficha." />;
  }

  if (consulta.isPending) {
    return (
      <div className={estilos.tarjeta}>
        <Esqueleto ancho={280} alto={28} />
        <div style={{ marginTop: 24 }}>
          <Esqueleto alto={16} />
        </div>
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <EstadoVacio
        titulo="No se pudo cargar la ficha"
        texto={mensajeDeError(consulta.error)}
        accion={
          <Link to="/beneficiarios">
            <Boton variante="secundaria">Volver al listado</Boton>
          </Link>
        }
      />
    );
  }

  const persona = consulta.data;
  const edad = calcularEdad(persona.fecha_nacimiento);
  const menor = esMenorDeEdad(persona.fecha_nacimiento);
  const comunidad = comunidades.opciones.find((c) => c.id === persona.comunidad_id);
  const genero = generos.opciones.find((g) => g.id === persona.genero_id);

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <Link className={estilos.volver} to="/beneficiarios">
            ← Volver al listado
          </Link>
          <div className={estilos.identidad}>
            <h1>
              {persona.nombres} {persona.apellidos}
            </h1>
            {menor && <Insignia tono="marca">Menor de edad</Insignia>}
            {!persona.activo && <Insignia tono="neutra">Inactivo</Insignia>}
          </div>
        </div>

        <div className={estilos.acciones}>
          <Boton variante="secundaria" onClick={() => setEditando(true)}>
            Editar datos
          </Boton>
          {persona.activo ? (
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
          )}
        </div>
      </header>

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
        </dl>
      </section>

      <SeccionDiscapacidades
        personaId={persona.id}
        discapacidades={persona.discapacidades}
      />

      <SeccionEncargados
        personaId={persona.id}
        encargados={persona.encargados}
        menor={menor}
      />

      <SeccionContactos personaId={persona.id} contactos={persona.contactos} />

      <SeccionDocumentos personaId={persona.id} />

      {editando && (
        <ModalEditar
          persona={persona}
          abierto={editando}
          onCerrar={() => setEditando(false)}
        />
      )}

    </>
  );
}

export default PaginaFicha;
