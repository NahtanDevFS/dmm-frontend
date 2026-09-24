/**
 * Texto legible de los valores de catálogo que el API devuelve como
 * identificadores (`PREFIERE_NO_DECIR`, `HIJO_A`, `PENDIENTE_ADQUISICION`).
 *
 * Esos nombres NO se cambian en la base: el backend, las funciones SQL y los
 * filtros los usan tal cual (el filtro de género de los reportes valida
 * `PREFIERE_NO_DECIR`, `marcarContratosVencidos` busca `ATRASO`, los triggers
 * comparan estados por nombre). Traducirlos es solo cosa de la pantalla, y
 * vive aquí para que dos pantallas no digan lo mismo con palabras distintas.
 *
 * Al mostrar un valor de catálogo, siempre `etiquetaDe(nombre)`. Al ENVIARLO
 * al API (filtros, formularios), siempre el nombre original.
 */

const ETIQUETAS: Record<string, string> = {
  // ── roles
  EMPLEADO_DMM: "Trabajo social",
  DIRECTORA: "Dirección",
  ALCALDE: "Alcaldía",
  ADMINISTRADOR: "Administración",

  // ── género
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  PREFIERE_NO_DECIR: "Prefiere no decir",

  // ── parentesco
  MADRE: "Madre",
  PADRE: "Padre",
  HIJO_A: "Hijo(a)",
  HERMANO_A: "Hermano(a)",
  ABUELO_A: "Abuelo(a)",
  TIO_A: "Tío(a)",
  CONYUGE: "Cónyuge",

  // ── estados de solicitud
  PENDIENTE_ADQUISICION: "Pendiente de adquisición",
  PENDIENTE_ENTREGA: "Pendiente de entrega",
  PENDIENTE_ENTREGA_PARCIAL: "Pendiente de entrega (parcial)",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",

  // ── estados de contrato de préstamo
  VIGENTE: "Vigente",
  DEVUELTO: "Devuelto",
  VENCIDO: "Vencido",
  EXTENDIDO: "Extendido (renovado)",
  NO_DEVUELTO: "No devuelto",

  // ── modalidad de solicitud
  DONACION: "Donación",
  PRESTAMO: "Préstamo",

  // ── evidencias de entrega
  FOTO_BENEFICIARIO_CON_INSUMO: "Foto del beneficiario con el insumo",
  FOTO_RECEPTOR: "Foto de quien recibe",
  FOTOCOPIA_DPI_RECEPTOR: "Fotocopia del DPI de quien recibe",
  RECETA_MEDICA: "Receta médica",
  FORMULARIO_FIRMADO: "Formulario firmado",

  // ── evidencias de contrato
  CONTRATO_FIRMADO: "Contrato firmado",
  DPI_FRONTAL: "DPI (frente)",
  DPI_REVERSO: "DPI (reverso)",
  FOTO_RECEPCION: "Foto de la recepción",

  // ── tipos de multa
  ATRASO: "Atraso en la devolución",
  EQUIPO_DANADO: "Equipo dañado",

  // ── tipos de campo de formulario
  TEXTO_CORTO: "Texto corto",
  TEXTO_LARGO: "Texto largo",
  NUMERO: "Número",
  FECHA: "Fecha",
  FECHA_NACIMIENTO: "Fecha de nacimiento (muestra la edad)",
  SI_NO: "Sí / No",
  SELECCION_UNICA: "Selección única",
  SELECCION_MULTIPLE: "Selección múltiple",

  // ── acciones de auditoría
  INSERT: "Creación",
  UPDATE: "Modificación",
  DELETE: "Eliminación",

  // ── comodín de varios catálogos (género, parentesco, evidencias)
  OTRO: "Otro",
};

/** Identificador de sistema: mayúsculas y dígitos unidos por guion bajo */
const IDENTIFICADOR = /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/;

/**
 * Texto para mostrar un valor de catálogo.
 *
 * 1. Si está en el mapa, su etiqueta.
 * 2. Si parece un identificador compuesto que nadie agregó al mapa
 *    (`ALGO_NUEVO`), se vuelve legible de forma automática ("Algo nuevo") en
 *    vez de mostrarse crudo. Sin tildes: para eso hay que agregarlo al mapa.
 * 3. Cualquier otra cosa se devuelve igual. Así un nombre que ya es legible
 *    ("DPI anverso", "Zacapa") o una sigla sola ("DPI") no se toca.
 */
export function etiquetaDe(nombre: string | null | undefined): string {
  if (!nombre) return "";
  const conocida = ETIQUETAS[nombre];
  if (conocida) return conocida;
  if (IDENTIFICADOR.test(nombre)) {
    // El sufijo _A es la convención de los catálogos para "o/a": SOBRINO_A
    const texto = nombre.replace(/_A$/, "(A)").replace(/_/g, " ").toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  return nombre;
}
