import axiosClient from "./axiosClient";

/**
 * Gestión de formularios dinámicos, sus campos y respuestas
 * Administra asignaciones por categoría y soporte para grupos repetibles
 */

/* Tipos del módulo */

export const TIPO_DATO = {
  TEXTO_CORTO: "TEXTO_CORTO",
  TEXTO_LARGO: "TEXTO_LARGO",
  NUMERO: "NUMERO",
  FECHA: "FECHA",
  /** Fecha para calcular edad dinámicamente al visualizar (se almacena como FECHA) */
  FECHA_NACIMIENTO: "FECHA_NACIMIENTO",
  SI_NO: "SI_NO",
  SELECCION_UNICA: "SELECCION_UNICA",
  SELECCION_MULTIPLE: "SELECCION_MULTIPLE",
} as const;

export type TipoDato = (typeof TIPO_DATO)[keyof typeof TIPO_DATO];

export interface TipoDatoCampo {
  id: number;
  nombre: TipoDato;
}

export interface Catalogo {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CatalogoValor {
  id: number;
  catalogo_id: number;
  etiqueta: string;
  orden: number;
  activo: boolean;
}

export interface Formulario {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface FormularioCampo {
  id: number;
  formulario_id: number;
  etiqueta: string;
  tipo_dato_id: number;
  tipo_dato_nombre: TipoDato;
  catalogo_id: number | null;
  obligatorio: boolean;
  orden: number;
  grupo_repetible: string | null;
  ayuda: string | null;
  activo: boolean;
}

export interface FormularioCampoOpcion {
  id: number;
  formulario_campo_id: number;
  etiqueta: string;
  orden: number;
  activo: boolean;
}

/** Un formulario con sus campos ya resueltos, tal como lo devuelve GET /formularios/:id. */
export interface FormularioConCampos extends Formulario {
  campos: FormularioCampo[];
}

/** Un formulario exigido por la categoría del insumo de una línea, con su avance. */
export interface FormularioDeLinea extends Formulario {
  detalle_solicitud_formulario_id: number | null;
  completado: boolean | null;
}

export interface DetalleSolicitudFormulario {
  id: number;
  detalle_solicitud_id: number;
  formulario_id: number;
  completado: boolean;
  activo: boolean;
}

export interface Respuesta {
  id: number;
  detalle_solicitud_formulario_id: number;
  formulario_campo_id: number;
  numero_fila: number;
  valor_texto: string | null;
  activo: boolean;
}

export interface RespuestasFormulario {
  detalle: DetalleSolicitudFormulario | null;
  respuestas: Respuesta[];
}

export interface DatosRespuesta {
  formulario_campo_id: number;
  numero_fila: number;
  valor_texto: string | null;
}

/* Cliente */

export const CLAVE_FORMULARIOS = "formularios";
export const CLAVE_CATALOGOS_FORMULARIO = "catalogos-formulario";

/* Catálogos reutilizables */

export async function listarCatalogosFormulario(): Promise<Catalogo[]> {
  const { data } = await axiosClient.get<Catalogo[]>("formularios/catalogos");
  return data;
}

export async function listarValoresCatalogo(
  catalogoId: number,
): Promise<CatalogoValor[]> {
  const { data } = await axiosClient.get<CatalogoValor[]>(
    "formularios/catalogos/" + catalogoId + "/valores",
  );
  return data;
}

export async function listarTiposDato(): Promise<TipoDatoCampo[]> {
  const { data } = await axiosClient.get<TipoDatoCampo[]>(
    "formularios/tipos-dato",
  );
  return data;
}

/* Formularios: lectura */

export async function listarFormularios(): Promise<Formulario[]> {
  const { data } = await axiosClient.get<Formulario[]>("formularios");
  return data;
}

export async function obtenerFormulario(
  id: number,
  /** Incluir inactivos (solo útil para edición en administración) */
  incluirInactivos = false,
): Promise<FormularioConCampos> {
  const { data } = await axiosClient.get<FormularioConCampos>(
    "formularios/" + id,
    { params: incluirInactivos ? { incluirInactivos: "true" } : undefined },
  );
  return data;
}

export async function listarOpcionesCampo(
  campoId: number,
): Promise<FormularioCampoOpcion[]> {
  const { data } = await axiosClient.get<FormularioCampoOpcion[]>(
    "formularios/campos/" + campoId + "/opciones",
  );
  return data;
}

/* Formularios: administración (DIRECCION) */

export async function crearFormulario(datos: {
  nombre: string;
  descripcion?: string | null;
}): Promise<Formulario> {
  const { data } = await axiosClient.post<Formulario>("formularios", datos);
  return data;
}

export async function editarFormulario(
  id: number,
  datos: { nombre?: string; descripcion?: string | null; activo?: boolean },
): Promise<Formulario> {
  const { data } = await axiosClient.patch<Formulario>(
    "formularios/" + id,
    datos,
  );
  return data;
}

export async function agregarCampoFormulario(
  formularioId: number,
  datos: {
    etiqueta: string;
    tipo_dato_id: number;
    catalogo_id?: number | null;
    opciones_propias?: string[];
    obligatorio: boolean;
    orden: number;
    grupo_repetible?: string | null;
    ayuda?: string | null;
  },
): Promise<FormularioCampo> {
  const { data } = await axiosClient.post<FormularioCampo>(
    "formularios/" + formularioId + "/campos",
    datos,
  );
  return data;
}

/**
 * Mueve un campo un lugar arriba/abajo
 * Evita conflictos de ordenamiento manual delegando en la base de datos
 */
export async function moverCampoFormulario(
  campoId: number,
  direccion: "arriba" | "abajo",
): Promise<void> {
  await axiosClient.post("formularios/campos/" + campoId + "/mover", {
    direccion,
  });
}

export async function editarCampoFormulario(
  campoId: number,
  datos: {
    etiqueta?: string;
    obligatorio?: boolean;
    orden?: number;
    ayuda?: string | null;
    activo?: boolean;
  },
): Promise<void> {
  await axiosClient.patch("formularios/campos/" + campoId, datos);
}

/**
 * Asignación administrable de categoría a formulario
 * modalidad_solicitud_id en null aplica a cualquier modalidad
 */
export interface AsignacionFormulario {
  id: number;
  categoria_insumo_id: number;
  categoria_nombre: string;
  formulario_id: number;
  formulario_nombre: string;
  orden: number;
  modalidad_solicitud_id: number | null;
  modalidad_nombre: string | null;
  activo: boolean;
}

export async function listarAsignacionesFormulario(
  categoriaId?: number,
): Promise<AsignacionFormulario[]> {
  const { data } = await axiosClient.get<AsignacionFormulario[]>(
    "formularios/categorias-formulario",
    { params: categoriaId ? { categoriaId } : undefined },
  );
  return data;
}

/**
 * Formularios exigidos por insumo y modalidad (previo a crear línea)
 * Permite recabar datos presenciales (ej. estudio socioeconómico) oportunamente
 */
export async function listarFormulariosDeInsumo(
  insumoId: number,
  modalidadId?: number,
): Promise<Formulario[]> {
  const { data } = await axiosClient.get<Formulario[]>(
    "formularios/insumos/" + insumoId + "/formularios",
    { params: modalidadId ? { modalidadId } : undefined },
  );
  return data;
}

export async function asignarFormularioACategoria(datos: {
  categoria_insumo_id: number;
  formulario_id: number;
  orden?: number;
  /** null o ausente = aplica a todas las modalidades. */
  modalidad_solicitud_id?: number | null;
}): Promise<AsignacionFormulario> {
  const { data } = await axiosClient.post<AsignacionFormulario>(
    "formularios/categorias-formulario",
    datos,
  );
  return data;
}

export async function quitarFormularioDeCategoria(
  categoriaId: number,
  formularioId: number,
): Promise<void> {
  await axiosClient.delete(
    "formularios/categorias-formulario/" + categoriaId + "/" + formularioId,
  );
}

/* Respuestas de una línea de solicitud */

/** Formularios exigidos por la línea (según la categoría de su insumo), con su avance. */
export async function listarFormulariosDeLinea(
  detalleSolicitudId: number,
): Promise<FormularioDeLinea[]> {
  const { data } = await axiosClient.get<FormularioDeLinea[]>(
    "formularios/lineas/" + detalleSolicitudId,
  );
  return data;
}

export async function obtenerRespuestas(
  detalleSolicitudId: number,
  formularioId: number,
): Promise<RespuestasFormulario> {
  const { data } = await axiosClient.get<RespuestasFormulario>(
    "formularios/lineas/" +
      detalleSolicitudId +
      "/" +
      formularioId +
      "/respuestas",
  );
  return data;
}

export async function guardarRespuestas(
  detalleSolicitudId: number,
  formularioId: number,
  datos: { completado: boolean; respuestas: DatosRespuesta[] },
): Promise<DetalleSolicitudFormulario> {
  const { data } = await axiosClient.put<DetalleSolicitudFormulario>(
    "formularios/lineas/" +
      detalleSolicitudId +
      "/" +
      formularioId +
      "/respuestas",
    datos,
  );
  return data;
}
