import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { aFechaDeInput } from "../../lib/fechas";
import { errorDeCampo, mensajeDeError } from "../../lib/errores";
import { CLAVE_PERSONAS, editarPersona } from "../../api/personas";
import type { PersonaDetalle } from "../../api/personas";
import type { Comunidad, ElementoCatalogo } from "../../types/api";
import { telefonoValido } from "../../lib/telefono";
import SelectorMunicipio from "./SelectorMunicipio";
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
  const estadosCiviles = useCatalogo<ElementoCatalogo>("estados-civiles");
  const gradosAcademicos = useCatalogo<ElementoCatalogo>("grados-academicos");
  const ocupaciones = useCatalogo<ElementoCatalogo>("ocupaciones");

  const valoresIniciales = {
    cui_dpi: persona.cui_dpi ?? "",
    nombres: persona.nombres,
    apellidos: persona.apellidos,
    fecha_nacimiento: aFechaDeInput(persona.fecha_nacimiento),
    genero_id: persona.genero_id ? String(persona.genero_id) : "",
    comunidad_id: persona.comunidad_id ? String(persona.comunidad_id) : "",
    telefono: persona.telefono ?? "",
    estado_civil_id: persona.estado_civil_id
      ? String(persona.estado_civil_id)
      : "",
    grado_academico_id: persona.grado_academico_id
      ? String(persona.grado_academico_id)
      : "",
    ocupacion_id: persona.ocupacion_id ? String(persona.ocupacion_id) : "",
    municipio_nacimiento_id: persona.municipio_nacimiento_id
      ? String(persona.municipio_nacimiento_id)
      : "",
    direccion: persona.direccion ?? "",
  };
  const [datos, setDatos] = useState(valoresIniciales);
  const [errorCui, setErrorCui] = useState<string | undefined>();

  const cerrar = useCierreSeguro({
    hayCambios: JSON.stringify(datos) !== JSON.stringify(valoresIniciales),
    onCerrar,
  });

  const cambiar =
    (campo: keyof typeof datos) =>
    (evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previos) => ({ ...previos, [campo]: evento.target.value }));

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
        estado_civil_id: datos.estado_civil_id
          ? Number(datos.estado_civil_id)
          : null,
        grado_academico_id: datos.grado_academico_id
          ? Number(datos.grado_academico_id)
          : null,
        ocupacion_id: datos.ocupacion_id ? Number(datos.ocupacion_id) : null,
        municipio_nacimiento_id: datos.municipio_nacimiento_id
          ? Number(datos.municipio_nacimiento_id)
          : null,
        direccion: datos.direccion.trim() || null,
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
      onCerrar={cerrar}
      titulo="Editar datos generales"
      descripcion="Las discapacidades, encargados, contactos y documentos se editan en su propia sección."
      // Mientras guarda no se puede cerrar: hacerlo dejaría al usuario sin
      // saber si el cambio llegó a aplicarse.
      bloqueado={mutacion.isPending}
      pie={
        <GrupoBotones>
          <Boton
            variante="terciaria"
            onClick={cerrar}
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
          placeholder="5512 3344"
          ayuda="8 dígitos. Puede dejarse en blanco."
          value={datos.telefono}
          onChange={cambiar("telefono")}
          error={
            datos.telefono.trim() !== "" && !telefonoValido(datos.telefono)
              ? "El teléfono debe tener 8 dígitos."
              : undefined
          }
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

        <CampoSelect
          etiqueta="Estado civil"
          value={datos.estado_civil_id}
          onChange={cambiar("estado_civil_id")}
        >
          {estadosCiviles.opciones.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect
          etiqueta="Grado académico"
          value={datos.grado_academico_id}
          onChange={cambiar("grado_academico_id")}
          ayuda="«Ninguno» es distinto de dejarlo vacío."
        >
          {gradosAcademicos.opciones.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect
          etiqueta="Ocupación"
          value={datos.ocupacion_id}
          onChange={cambiar("ocupacion_id")}
        >
          {ocupaciones.opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </CampoSelect>
        <CampoTexto
          etiqueta="Dirección de vivienda"
          maxLength={255}
          value={datos.direccion}
          onChange={cambiar("direccion")}
        />
        <SelectorMunicipio
          value={datos.municipio_nacimiento_id}
          onChange={(id) =>
            setDatos((previos) => ({ ...previos, municipio_nacimiento_id: id }))
          }
        />
      </div>
    </Modal>
  );
}

export default ModalEditar;
