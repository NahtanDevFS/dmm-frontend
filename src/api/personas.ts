import axiosClient from "./axiosClient";
import type { Persona } from "../types/api";

/* ═══════════════════════════ Tipos del módulo ═══════════════════════════ */

export interface DiscapacidadDePersona {
  discapacidad_id: number;
  nombre: string;
}

export interface EncargadoDePersona {
  encargado_id: number;
  tipo_parentesco_id: number;
  parentesco_nombre: string;
  nombres: string;
  apellidos: string;
}

export interface ContactoDePersona {
  id: number;
  persona_id: number;
  nombre: string;
  telefono: string | null;
  observaciones: string | null;
  activo: boolean;
}

export interface DocumentoDePersona {
  id: number;
  persona_id: number;
  tipo_documento_id: number;
  numero_documento: string | null;
  ruta_archivo: string | null;
  observaciones: string | null;
  activo: boolean;
}

/** Lo que devuelve GET /personas/:id: la persona con sus sub-recursos. */
export interface PersonaDetalle extends Persona {
  discapacidades: DiscapacidadDePersona[];
  encargados: EncargadoDePersona[];
  contactos: ContactoDePersona[];
}

export interface DatosBasePersona {
  cui_dpi?: string | null;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero_id?: number | null;
  comunidad_id?: number | null;
  telefono?: string | null;
}

export type EncargadoNuevo =
  | { tipo: "existente"; personaId: number; tipoParentescoId: number }
  | { tipo: "nuevo"; datos: DatosBasePersona; tipoParentescoId: number };

export interface ContactoNuevo {
  nombre: string;
  telefono?: string | null;
  observaciones?: string | null;
}

/**
 * Alta completa. El backend crea persona, discapacidades, encargados y
 * contactos en una sola transacción, así que se envía todo junto: si algo
 * falla no queda una persona a medias con sus encargados sueltos.
 */
export interface CrearPersona extends DatosBasePersona {
  discapacidadIds?: number[];
  encargados?: EncargadoNuevo[];
  contactos?: ContactoNuevo[];
}

/* ═══════════════════════════ Cliente ═══════════════════════════ */

export const CLAVE_PERSONAS = "personas";

export async function obtenerPersona(id: number): Promise<PersonaDetalle> {
  const { data } = await axiosClient.get<PersonaDetalle>("personas/" + id);
  return data;
}

export async function crearPersona(datos: CrearPersona): Promise<Persona> {
  const { data } = await axiosClient.post<Persona>("personas", datos);
  return data;
}

export async function editarPersona(
  id: number,
  datos: Partial<DatosBasePersona>,
): Promise<Persona> {
  const { data } = await axiosClient.patch<Persona>("personas/" + id, datos);
  return data;
}

export async function desactivarPersona(id: number): Promise<void> {
  await axiosClient.patch("personas/" + id + "/desactivar");
}

export async function reactivarPersona(id: number): Promise<void> {
  await axiosClient.patch("personas/" + id + "/reactivar");
}

/* ── Discapacidades ── */

export async function agregarDiscapacidad(
  personaId: number,
  discapacidadId: number,
): Promise<void> {
  await axiosClient.post("personas/" + personaId + "/discapacidades", {
    discapacidadId,
  });
}

export async function quitarDiscapacidad(
  personaId: number,
  discapacidadId: number,
): Promise<void> {
  await axiosClient.delete(
    "personas/" + personaId + "/discapacidades/" + discapacidadId,
  );
}

/* ── Encargados ── */

export async function vincularEncargado(
  personaId: number,
  encargado: EncargadoNuevo,
): Promise<void> {
  await axiosClient.post("personas/" + personaId + "/encargados", encargado);
}

export async function desvincularEncargado(
  personaId: number,
  encargadoId: number,
): Promise<void> {
  await axiosClient.delete(
    "personas/" + personaId + "/encargados/" + encargadoId,
  );
}

/* ── Contactos ── */

export async function agregarContacto(
  personaId: number,
  contacto: ContactoNuevo,
): Promise<void> {
  await axiosClient.post("personas/" + personaId + "/contactos", contacto);
}

export async function editarContacto(
  personaId: number,
  contactoId: number,
  contacto: Partial<ContactoNuevo>,
): Promise<void> {
  await axiosClient.patch(
    "personas/" + personaId + "/contactos/" + contactoId,
    contacto,
  );
}

export async function eliminarContacto(
  personaId: number,
  contactoId: number,
): Promise<void> {
  await axiosClient.delete(
    "personas/" + personaId + "/contactos/" + contactoId,
  );
}

/* ── Documentos de identificación ── */

export async function listarDocumentos(
  personaId: number,
): Promise<DocumentoDePersona[]> {
  const { data } = await axiosClient.get<DocumentoDePersona[]>(
    "personas/" + personaId + "/documentos",
  );
  return data;
}

/**
 * Sube un documento. Va como multipart y el archivo viaja en el campo
 * `archivo`, que es el nombre que espera el middleware del backend.
 */
export async function subirDocumento(
  personaId: number,
  datos: {
    archivo: File;
    tipoDocumentoId: number;
    numeroDocumento?: string;
    observaciones?: string;
  },
): Promise<DocumentoDePersona> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", datos.archivo);
  cuerpo.append("tipoDocumentoId", String(datos.tipoDocumentoId));
  if (datos.numeroDocumento) {
    cuerpo.append("numeroDocumento", datos.numeroDocumento);
  }
  if (datos.observaciones) cuerpo.append("observaciones", datos.observaciones);

  const { data } = await axiosClient.post<DocumentoDePersona>(
    "personas/" + personaId + "/documentos",
    cuerpo,
  );
  return data;
}

export async function eliminarDocumento(
  personaId: number,
  documentoId: number,
): Promise<void> {
  await axiosClient.delete(
    "personas/" + personaId + "/documentos/" + documentoId,
  );
}
