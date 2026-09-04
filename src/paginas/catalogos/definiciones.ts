import type { RutaCatalogo } from "../../hooks/useCatalogo";

export interface CampoExtra {
  clave: string;
  etiqueta: string;
  tipo?: "text" | "tel" | "email";
  ayuda?: string;
}

export interface DefinicionCatalogo {
  ruta: RutaCatalogo;
  titulo: string;
  singular: string;
  /** Artículo del singular. Sin esto salía «Nombre de la programa». */
  articulo: "el" | "la";
  nota?: string;
  /** Campos que solo tiene este catálogo. */
  extra?: CampoExtra[];
}

/**
 * Los catálogos con CRUD genérico.
 *
 * Comparten contrato exacto, así que se describen como datos y los atiende una
 * sola pantalla. Escribir seis pantallas idénticas habría multiplicado por seis
 * cualquier corrección posterior.
 *
 * Solo dos se salen del molde y por un campo cada uno: programas tiene
 * descripción e instituciones donantes tiene teléfono y correo.
 */
export const CATALOGOS: DefinicionCatalogo[] = [
  {
    ruta: "discapacidades",
    titulo: "Discapacidades",
    singular: "discapacidad",
    articulo: "la",
    nota: "Alimenta la ficha del beneficiario. Es información de salud: los nombres deben ser los de la evaluación, no diagnósticos improvisados.",
  },
  {
    ruta: "grados-academicos",
    titulo: "Grados académicos",
    singular: "grado académico",
    articulo: "el",
    nota: "Nivel educativo alcanzado, para la ficha del beneficiario. «Ninguno» es un valor con significado propio: dejar el campo vacío significa que nadie preguntó, no que la persona no estudió.",
  },
  {
    ruta: "ocupaciones",
    titulo: "Ocupaciones",
    singular: "ocupación",
    articulo: "la",
    nota: "A qué se dedican las personas. Si «Otra» empieza a acumular gente, es señal de que falta agregar aquí la ocupación real.",
  },
  {
    ruta: "programas",
    titulo: "Programas",
    singular: "programa",
    articulo: "el",
    nota: "Los programas de apoyo a los que se asocian las solicitudes.",
    extra: [{ clave: "descripcion", etiqueta: "Descripción" }],
  },
  {
    ruta: "categorias-insumo",
    titulo: "Categorías de insumo",
    singular: "categoría",
    articulo: "la",
    nota: "La unicidad del insumo es por nombre y categoría: el mismo nombre puede repetirse en categorías distintas.",
  },
  {
    ruta: "marcas-insumo",
    titulo: "Marcas de insumo",
    singular: "marca",
    articulo: "la",
  },
  {
    ruta: "unidades-medida",
    titulo: "Unidades de medida",
    singular: "unidad",
    articulo: "la",
  },
  {
    ruta: "instituciones-donantes",
    titulo: "Instituciones donantes",
    singular: "institución",
    articulo: "la",
    nota: "Quiénes donan los insumos que entran por recepción.",
    extra: [
      {
        clave: "telefono",
        etiqueta: "Teléfono",
        tipo: "tel",
        ayuda: "8 dígitos, por ejemplo 5512 3344.",
      },
      { clave: "correo", etiqueta: "Correo", tipo: "email" },
    ],
  },
];
