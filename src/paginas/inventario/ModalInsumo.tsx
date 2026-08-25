import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { errorDeCampo, mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  crearInsumo,
  editarInsumo,
  type DatosInsumo,
  type Insumo,
} from "../../api/inventario";
import type { ElementoCatalogo } from "../../types/api";
import { BANDERAS } from "./banderas";
import estilos from "./Inventario.module.css";

/**
 * Alta y edición de un insumo.
 *
 * Los dos casos comparten formulario porque comparten campos exactos; lo único
 * que cambia es qué se envía. En la edición se manda solo lo que el usuario
 * tocó, y no el objeto entero: el backend valida que la categoría y la unidad
 * estén activas *solo cuando vienen en el cuerpo*, así que reenviar sin
 * cambios la categoría de un insumo cuya categoría se dio de baja después
 * haría fallar una edición que no tenía nada que ver con ella.
 */
function ModalInsumo({
  insumo,
  abierto,
  onCerrar,
}: {
  /** Sin insumo, el modal da de alta. */
  insumo?: Insumo;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  // Con inactivos: en la edición hay que poder mostrar la categoría o unidad
  // ya guardada aunque se haya dado de baja, o el select saldría en blanco y
  // parecería que nunca se eligió ninguna.
  const categorias = useCatalogo<ElementoCatalogo>("categorias-insumo", {
    incluirInactivos: true,
  });
  const unidades = useCatalogo<ElementoCatalogo>("unidades-medida", {
    incluirInactivos: true,
  });

  const [datos, setDatos] = useState({
    nombre: insumo?.nombre ?? "",
    descripcion: insumo?.descripcion ?? "",
    categoria_id: insumo ? String(insumo.categoria_id) : "",
    unidad_medida_base_id: insumo ? String(insumo.unidad_medida_base_id) : "",
    requiere_fecha_caducidad: insumo?.requiere_fecha_caducidad ?? false,
    requiere_codigo_fabricante: insumo?.requiere_codigo_fabricante ?? false,
    bloquea_solicitud_sin_stock: insumo?.bloquea_solicitud_sin_stock ?? false,
  });
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});

  const texto =
    (
      campo:
        | "nombre"
        | "descripcion"
        | "categoria_id"
        | "unidad_medida_base_id",
    ) =>
    (
      evento: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setDatos((previos) => ({ ...previos, [campo]: evento.target.value }));

  const alternar = (clave: (typeof BANDERAS)[number]["clave"]) =>
    setDatos((previos) => ({ ...previos, [clave]: !previos[clave] }));

  /** Cuerpo del PATCH: solo los campos que cambiaron. */
  const soloCambios = (): Partial<DatosInsumo> => {
    if (!insumo) return {};
    const cambios: Partial<DatosInsumo> = {};
    if (datos.nombre.trim() !== insumo.nombre) {
      cambios.nombre = datos.nombre.trim();
    }
    const descripcion = datos.descripcion.trim() || null;
    if (descripcion !== insumo.descripcion) cambios.descripcion = descripcion;
    if (Number(datos.categoria_id) !== insumo.categoria_id) {
      cambios.categoria_id = Number(datos.categoria_id);
    }
    if (Number(datos.unidad_medida_base_id) !== insumo.unidad_medida_base_id) {
      cambios.unidad_medida_base_id = Number(datos.unidad_medida_base_id);
    }
    for (const bandera of BANDERAS) {
      if (datos[bandera.clave] !== insumo[bandera.clave]) {
        cambios[bandera.clave] = datos[bandera.clave];
      }
    }
    return cambios;
  };

  const mutacion = useMutation({
    mutationFn: async () => {
      if (insumo) {
        const cambios = soloCambios();
        // Guardar sin haber tocado nada no debería costar una petición ni
        // ensuciar la bitácora de auditoría con un UPDATE vacío.
        if (Object.keys(cambios).length === 0) return insumo;
        return editarInsumo(insumo.id, cambios);
      }
      return crearInsumo({
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim() || null,
        categoria_id: Number(datos.categoria_id),
        unidad_medida_base_id: Number(datos.unidad_medida_base_id),
        requiere_fecha_caducidad: datos.requiere_fecha_caducidad,
        requiere_codigo_fabricante: datos.requiere_codigo_fabricante,
        bloquea_solicitud_sin_stock: datos.bloquea_solicitud_sin_stock,
      });
    },
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_INSUMOS] });
      avisar(insumo ? "Insumo actualizado." : "Insumo agregado.", "exito");
      onCerrar();
    },
    onError: (error) => {
      setErrores({
        nombre: errorDeCampo(error, "nombre"),
        categoria_id: errorDeCampo(error, "categoria_id"),
        unidad_medida_base_id: errorDeCampo(error, "unidad_medida_base_id"),
      });
      avisar(mensajeDeError(error), "error");
    },
  });

  const completo =
    datos.nombre.trim() !== "" &&
    datos.categoria_id !== "" &&
    datos.unidad_medida_base_id !== "";

  const opcion = (elemento: ElementoCatalogo) => (
    <option key={elemento.id} value={elemento.id}>
      {elemento.nombre}
      {elemento.activo ? "" : " (inactivo)"}
    </option>
  );

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={insumo ? "Editar insumo" : "Nuevo insumo"}
      descripcion="Las presentaciones en las que se recibe el insumo se gestionan en su ficha, una vez creado."
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
            disabled={!completo}
            cargando={mutacion.isPending}
            textoCargando="Guardando…"
            onClick={() => mutacion.mutate()}
          >
            {insumo ? "Guardar cambios" : "Crear insumo"}
          </Boton>
        </GrupoBotones>
      }
    >
      <CampoTexto
        etiqueta="Nombre del insumo"
        obligatorio
        maxLength={150}
        value={datos.nombre}
        onChange={texto("nombre")}
        error={errores.nombre}
        ayuda="El nombre puede repetirse en categorías distintas, pero no dentro de la misma."
      />

      <CampoSelect
        etiqueta="Categoría"
        obligatorio
        value={datos.categoria_id}
        onChange={texto("categoria_id")}
        error={errores.categoria_id}
      >
        {categorias.opciones.map(opcion)}
      </CampoSelect>

      <CampoSelect
        etiqueta="Unidad de medida base"
        obligatorio
        value={datos.unidad_medida_base_id}
        onChange={texto("unidad_medida_base_id")}
        error={errores.unidad_medida_base_id}
        ayuda="La unidad en la que se cuentan las existencias: unidad, tableta, libra. No es la presentación en la que llega la donación."
      >
        {unidades.opciones.map(opcion)}
      </CampoSelect>

      <CampoAreaTexto
        etiqueta="Descripción"
        rows={3}
        maxLength={2000}
        value={datos.descripcion}
        onChange={texto("descripcion")}
      />

      <fieldset className={estilos.banderas}>
        <legend className={estilos.banderaNombre}>
          Requisitos de este insumo
        </legend>
        <p className={estilos.banderaAyuda}>
          Son del insumo y no de su categoría: dentro de una misma categoría
          conviven productos que caducan y productos que no.
        </p>
        {BANDERAS.map((bandera) => (
          <label key={bandera.clave} className={estilos.bandera}>
            <input
              type="checkbox"
              checked={datos[bandera.clave]}
              onChange={() => alternar(bandera.clave)}
            />
            <span>
              <span className={estilos.banderaNombre}>{bandera.nombre}</span>
              <br />
              <span className={estilos.banderaAyuda}>{bandera.ayuda}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}

export default ModalInsumo;
