import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { aFechaDeInput } from "../../lib/fechas";
import { errorDeCampo, mensajeDeError } from "../../lib/errores";
import { CLAVE_PERSONAS, editarPersona } from "../../api/personas";
import type { PersonaDetalle } from "../../api/personas";
import type { Comunidad, ElementoCatalogo } from "../../types/api";
import estilos from "./Ficha.module.css";

/**
 * Edición de los datos generales.
 *
 * Solo cubre lo que acepta PATCH /personas/:id. Discapacidades, encargados,
 * contactos y documentos se editan cada uno en su sección, contra su propio
 * sub-recurso: meterlos aquí obligaría a orquestar cinco llamadas y dejaría la
 * ficha a medias si una fallara.
 */
function ModalEditar({
  persona,
  abierto,
  onCerrar,
}: {
  persona: PersonaDetalle;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();
  const comunidades = useCatalogo<Comunidad>("comunidades");
  const generos = useCatalogo<ElementoCatalogo>("tipos-genero");

  const [datos, setDatos] = useState({
    cui_dpi: persona.cui_dpi ?? "",
    nombres: persona.nombres,
    apellidos: persona.apellidos,
    fecha_nacimiento: aFechaDeInput(persona.fecha_nacimiento),
    genero_id: persona.genero_id ? String(persona.genero_id) : "",
    comunidad_id: persona.comunidad_id ? String(persona.comunidad_id) : "",
    telefono: persona.telefono ?? "",
  });
  const [errorCui, setErrorCui] = useState<string | undefined>();

  const cambiar = (campo: keyof typeof datos) => (
    evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setDatos((previos) => ({ ...previos, [campo]: evento.target.value }));

  const mutacion = useMutation({
    mutationFn: () =>
      editarPersona(persona.id, {
        cui_dpi: datos.cui_dpi.trim() || null,
        nombres: datos.nombres.trim(),
        apellidos: datos.apellidos.trim(),
        fecha_nacimiento: datos.fecha_nacimiento,
        genero_id: datos.genero_id ? Number(datos.genero_id) : null,
        comunidad_id: datos.comunidad_id ? Number(datos.comunidad_id) : null,
        telefono: datos.telefono.trim() || null,
      }),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_PERSONAS] });
      avisar("Datos actualizados.", "exito");
      onCerrar();
    },
    onError: (error) => {
      setErrorCui(errorDeCampo(error, "cui_dpi"));
      avisar(mensajeDeError(error), "error");
    },
  });

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Editar datos generales"
      descripcion="Las discapacidades, encargados, contactos y documentos se editan en su propia sección."
      // Mientras guarda no se puede cerrar: hacerlo dejaría al usuario sin
      // saber si el cambio llegó a aplicarse.
      bloqueado={mutacion.isPending}
      pie={
        <GrupoBotones>
          <Boton
            variante="terciaria"
            onClick={onCerrar}
            disabled={mutacion.isPending}
          >
            Cancelar
          </Boton>
          <Boton
            variante="primaria"
            cargando={mutacion.isPending}
            textoCargando="Guardando…"
            onClick={() => mutacion.mutate()}
          >
            Guardar cambios
          </Boton>
        </GrupoBotones>
      }
    >
      <div className={estilos.datos}>
        <CampoTexto
          etiqueta="CUI / DPI"
          identificador
          maxLength={13}
          value={datos.cui_dpi}
          onChange={cambiar("cui_dpi")}
          error={errorCui}
        />
        <CampoTexto
          etiqueta="Teléfono"
          type="tel"
          value={datos.telefono}
          onChange={cambiar("telefono")}
        />
        <CampoTexto
          etiqueta="Nombres"
          obligatorio
          value={datos.nombres}
          onChange={cambiar("nombres")}
        />
        <CampoTexto
          etiqueta="Apellidos"
          obligatorio
          value={datos.apellidos}
          onChange={cambiar("apellidos")}
        />
        <CampoTexto
          etiqueta="Fecha de nacimiento"
          type="date"
          obligatorio
          value={datos.fecha_nacimiento}
          onChange={cambiar("fecha_nacimiento")}
        />
        <CampoSelect
          etiqueta="Género"
          value={datos.genero_id}
          onChange={cambiar("genero_id")}
        >
          {generos.opciones.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect
          etiqueta="Comunidad"
          value={datos.comunidad_id}
          onChange={cambiar("comunidad_id")}
        >
          {comunidades.opciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </CampoSelect>
      </div>
    </Modal>
  );
}

export default ModalEditar;
