import { z } from "zod";

/**
 * Espejo de crearPersonaSchema en el backend, con una regla añadida que allí
 * no vive en Zod sino en un constraint diferido de la base.
 */

/**
 * Teléfono guatemalteco: ocho dígitos. Espejo de lib/telefono.ts en el
 * backend. Se aceptan espacios, guiones y el prefijo +502 al escribir —así se
 * dictan y así los copian de una libreta— y se normaliza a los ocho dígitos
 * solos, para que buscar un número no dependa de cómo lo escribieron.
 */
const normalizarTelefono = (v: string) =>
  v.replace(/[\s()-]/g, "").replace(/^\+?502/, "");

const telefonoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    const limpio = normalizarTelefono(v ?? "");
    return limpio === "" ? undefined : limpio;
  })
  .refine(
    (v) => v === undefined || /^\d{8}$/.test(v),
    "El teléfono debe tener 8 dígitos (por ejemplo, 5512 3344)",
  );

const telefonoRequerido = z
  .string()
  .trim()
  .transform(normalizarTelefono)
  .refine(
    (v) => /^\d{8}$/.test(v),
    "El teléfono debe tener 8 dígitos (por ejemplo, 5512 3344)",
  );

const opcionalVacio = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const datosBasePersona = z.object({
  cui_dpi: z
    .string()
    .trim()
    .max(13, "El CUI/DPI no puede exceder 13 dígitos")
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine(
      (v) => v === undefined || /^\d{13}$/.test(v),
      "El CUI/DPI debe tener 13 dígitos",
    ),
  nombres: z.string().trim().min(1, "Ingrese los nombres").max(100),
  apellidos: z.string().trim().min(1, "Ingrese los apellidos").max(100),
  fecha_nacimiento: z
    .string()
    .min(1, "Ingrese la fecha de nacimiento")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida")
    .refine((v) => new Date(v) <= new Date(), "La fecha no puede ser futura")
    .refine((v) => {
      const limite = new Date();
      limite.setFullYear(limite.getFullYear() - 120);
      return new Date(v) > limite;
    }, "La fecha no es válida (más de 120 años)"),
  genero_id: opcionalVacio(10),
  comunidad_id: opcionalVacio(10),
  telefono: telefonoOpcional,
});

/**
 * Todos los campos son opcionales aquí a propósito. Qué se exige depende del
 * beneficiario —si es menor y si tiene CUI/DPI— y de si alguien empezó a
 * escribir en el bloque, así que la regla vive completa en el superRefine de
 * abajo en vez de repartirse entre dos sitios que pueden contradecirse.
 */
export const esquemaEncargado = z.object({
  nombres: opcionalVacio(100),
  apellidos: opcionalVacio(100),
  fecha_nacimiento: opcionalVacio(20),
  cui_dpi: opcionalVacio(13),
  telefono: telefonoOpcional,
  tipoParentescoId: opcionalVacio(10),
});

/** Verdadero si nadie tocó el bloque de encargado. */
function encargadoVacio(
  encargado: Record<string, unknown> | undefined,
): boolean {
  if (!encargado) return true;
  return Object.values(encargado).every(
    (v) => v === undefined || v === null || String(v).trim() === "",
  );
}

export const esquemaContacto = z.object({
  nombre: z.string().trim().min(1, "Ingrese el nombre del contacto").max(150),
  /**
   * Obligatorio, a diferencia del teléfono de la persona. Un contacto de
   * referencia sin número no sirve para nada: existe justamente para poder
   * llamar a alguien cuando no se ubica a la persona.
   */
  telefono: telefonoRequerido,
  observaciones: opcionalVacio(2000),
});

export const esquemaBeneficiario = datosBasePersona
  .extend({
    discapacidadIds: z.array(z.number()).default([]),
    /**
     * Un bloque de encargado con todos los campos en blanco vale por «no hay
     * encargado».
     *
     * Hace falta porque register() crea las claves en cuanto los campos se
     * pintan, de modo que `encargado` nunca llega como undefined. Sin este
     * paso previo, un menor que sí tiene CUI/DPI —donde el encargado es
     * opcional— quedaría bloqueado por los campos vacíos de un encargado que
     * nadie quiso registrar.
     */
    encargado: z.preprocess((valor) => {
      if (!valor || typeof valor !== "object") return undefined;
      const campos = valor as Record<string, unknown>;
      const todoVacio = Object.values(campos).every(
        (v) => v === undefined || v === null || String(v).trim() === "",
      );
      return todoVacio ? undefined : valor;
    }, esquemaEncargado.optional()),
    contactos: z.array(esquemaContacto).default([]),
  })
  /**
   * Reglas del encargado.
   *
   * No tener encargado NUNCA bloquea, ni siquiera en un menor sin CUI/DPI: la
   * base dejó de exigirlo en la migración 22 y la interfaz solo lo recomienda.
   * Negarse a registrar a alguien por un dato que no trae encima no protege a
   * nadie; lo que ocurre en la práctica es que se inventa el dato o la
   * persona no queda registrada.
   *
   * Lo que sí se valida es la coherencia: si alguien empezó a escribir el
   * bloque, hay que completarlo, porque un encargado a medias no se puede
   * crear.
   */
  .superRefine((datos, ctx) => {
    if (encargadoVacio(datos.encargado)) return;

    // Alguien empezó a escribir: entonces sí se exige lo mínimo para crearlo.
    const obligatorios = [
      ["nombres", "Ingrese los nombres del encargado"],
      ["apellidos", "Ingrese los apellidos del encargado"],
      ["fecha_nacimiento", "Ingrese la fecha de nacimiento del encargado"],
      ["tipoParentescoId", "Indique el parentesco"],
    ] as const;

    for (const [campo, mensaje] of obligatorios) {
      if (!datos.encargado?.[campo]) {
        ctx.addIssue({
          code: "custom",
          path: ["encargado", campo],
          message: mensaje,
        });
      }
    }
  });

/**
 * Tipo de los campos del formulario, declarado a mano.
 *
 * No se deriva con z.input del esquema porque los transforms que limpian los
 * campos vacíos colapsan el objeto `encargado` a {} en la inferencia, y con él
 * react-hook-form pierde las rutas anidadas y deja de aceptar
 * register("encargado.nombres"). Escribirlo aquí cuesta unas líneas y devuelve
 * el tipado de todo el formulario.
 *
 * Todo es texto porque un formulario HTML solo maneja texto; la conversión a
 * número y la limpieza de vacíos las hace el esquema al validar.
 */
export interface DatosBeneficiario {
  cui_dpi?: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero_id?: string;
  comunidad_id?: string;
  telefono?: string;
  discapacidadIds: number[];
  encargado?: {
    nombres?: string;
    apellidos?: string;
    fecha_nacimiento?: string;
    cui_dpi?: string;
    telefono?: string;
    tipoParentescoId?: string;
  };
  contactos: { nombre: string; telefono?: string; observaciones?: string }[];
}

export type DatosBeneficiarioValidados = z.output<typeof esquemaBeneficiario>;
