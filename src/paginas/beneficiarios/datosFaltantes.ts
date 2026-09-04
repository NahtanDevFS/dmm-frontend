import type { Persona } from "../../types/api";

/**
 * Qué datos de la sección I del estudio socioeconómico le faltan a una ficha.
 *
 * Vive aparte porque se usa en dos lugares que no se conocen entre sí: la
 * ficha del beneficiario, donde avisa mientras la persona todavía está
 * presente, y el alta de una solicitud de equipo, donde avisa antes de que
 * alguien empiece a llenar formularios que van a pedir estos mismos datos.
 *
 * Tenerlo duplicado habría significado que un campo nuevo se agregara en un
 * lado y no en el otro.
 */
export function datosFaltantesDelEstudio(persona: Persona): string[] {
  const revisados: [unknown, string][] = [
    [persona.estado_civil_id, "estado civil"],
    [persona.municipio_nacimiento_id, "lugar de nacimiento"],
    [persona.direccion, "dirección"],
    [persona.grado_academico_id, "grado académico"],
    [persona.ocupacion_id, "ocupación"],
    [persona.telefono, "teléfono"],
  ];

  return revisados
    .filter(([valor]) => valor === null || valor === undefined)
    .map(([, etiqueta]) => etiqueta);
}
