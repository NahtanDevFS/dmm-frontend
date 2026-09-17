import { describe, expect, it } from "vitest";
import type { Persona } from "../../../types/api";
import { datosFaltantesDelEstudio } from "../datosFaltantes";

/** Ficha completa: base para modificar solo el campo que cada test necesita. */
function personaCompleta(): Persona {
  return {
    id: 1,
    cui_dpi: "1234567890101",
    nombres: "María",
    apellidos: "López",
    fecha_nacimiento: "1990-01-01",
    genero_id: 1,
    comunidad_id: 1,
    telefono: "55123344",
    direccion: "Zona 1",
    estado_civil_id: 1,
    grado_academico_id: 1,
    ocupacion_id: 1,
    municipio_nacimiento_id: 1,
    activo: true,
  };
}

describe("datosFaltantesDelEstudio", () => {
  it("no reporta nada faltante en una ficha completa", () => {
    expect(datosFaltantesDelEstudio(personaCompleta())).toEqual([]);
  });

  it("reporta el estado civil si es null", () => {
    const persona = { ...personaCompleta(), estado_civil_id: null };
    expect(datosFaltantesDelEstudio(persona)).toContain("estado civil");
  });

  it("reporta el lugar de nacimiento si es null", () => {
    const persona = { ...personaCompleta(), municipio_nacimiento_id: null };
    expect(datosFaltantesDelEstudio(persona)).toContain("lugar de nacimiento");
  });

  it("reporta la dirección si es null", () => {
    const persona = { ...personaCompleta(), direccion: null };
    expect(datosFaltantesDelEstudio(persona)).toContain("dirección");
  });

  it("reporta el grado académico si es null", () => {
    const persona = { ...personaCompleta(), grado_academico_id: null };
    expect(datosFaltantesDelEstudio(persona)).toContain("grado académico");
  });

  it("reporta la ocupación si es null", () => {
    const persona = { ...personaCompleta(), ocupacion_id: null };
    expect(datosFaltantesDelEstudio(persona)).toContain("ocupación");
  });

  it("reporta el teléfono si es null", () => {
    const persona = { ...personaCompleta(), telefono: null };
    expect(datosFaltantesDelEstudio(persona)).toContain("teléfono");
  });

  it("reporta varios campos a la vez, en el orden en que se revisan", () => {
    const persona = {
      ...personaCompleta(),
      estado_civil_id: null,
      telefono: null,
    };
    expect(datosFaltantesDelEstudio(persona)).toEqual([
      "estado civil",
      "teléfono",
    ]);
  });

  it("no confunde 'no aplica' con 'falta': los campos que sí admiten null en el resto de la ficha no entran en esta lista", () => {
    // genero_id y comunidad_id son null-ables en el tipo Persona pero no
    // forman parte de la sección I del estudio socioeconómico, así que un
    // valor null en ellos no debe aparecer en el resultado.
    const persona = {
      ...personaCompleta(),
      genero_id: null,
      comunidad_id: null,
    };
    expect(datosFaltantesDelEstudio(persona)).toEqual([]);
  });
});
