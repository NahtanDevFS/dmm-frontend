import { describe, expect, it } from "vitest";
import {
  aFechaDeInput,
  calcularEdad,
  esMenorDeEdad,
  fechaDeHoy,
  formatearCui,
  formatearFecha,
} from "../fechas";

describe("calcularEdad", () => {
  // Todas las pruebas fijan `referencia` para no depender del reloj real.
  const HOY = new Date(2026, 3, 15); // 15 de abril de 2026

  it("calcula años completos cuando ya pasó el cumpleaños este año", () => {
    // Nació el 10 de enero: para el 15 de abril ya cumplió años este año.
    expect(calcularEdad("2000-01-10", HOY)).toBe(26);
  });

  it("no suma el año todavía si el cumpleaños no ha llegado", () => {
    // Nació el 20 de diciembre: en abril del mismo año aún no cumple.
    expect(calcularEdad("2000-12-20", HOY)).toBe(25);
  });

  it("no suma el año en el mes del cumpleaños si el día no ha llegado", () => {
    // Cumpleaños el 20 de abril, hoy es 15: todavía no llega.
    expect(calcularEdad("2000-04-20", HOY)).toBe(25);
  });

  it("ya suma el año el mismo día del cumpleaños", () => {
    expect(calcularEdad("2000-04-15", HOY)).toBe(26);
  });

  it("da NaN con una fecha inválida", () => {
    expect(Number.isNaN(calcularEdad("no-es-una-fecha", HOY))).toBe(true);
  });

  it("no se desplaza un día por la zona horaria en fechas ISO con hora UTC", () => {
    // El caso real que motivó aFechaLocal: una fecha de nacimiento que
    // llega como "2000-04-15T00:00:00.000Z" no debe leerse como el 14 en
    // Guatemala (UTC-6). Si se desplazara, esta persona seguiría dando 25
    // en vez de 26 el día de su cumpleaños.
    expect(calcularEdad("2000-04-15T00:00:00.000Z", HOY)).toBe(26);
  });
});

describe("esMenorDeEdad", () => {
  it("es falso para alguien claramente mayor de edad", () => {
    // Cien años atrás siempre es mayor de edad, sin depender de "hoy".
    const haceCienAnios = new Date();
    haceCienAnios.setFullYear(haceCienAnios.getFullYear() - 100);
    expect(esMenorDeEdad(haceCienAnios.toISOString().slice(0, 10))).toBe(false);
  });

  it("es verdadero para alguien claramente menor de edad", () => {
    // Diez años atrás siempre es menor de edad.
    const haceDiezAnios = new Date();
    haceDiezAnios.setFullYear(haceDiezAnios.getFullYear() - 10);
    expect(esMenorDeEdad(haceDiezAnios.toISOString().slice(0, 10))).toBe(true);
  });

  it("es falso con una fecha inválida (NaN no es menor que 18)", () => {
    expect(esMenorDeEdad("no-es-una-fecha")).toBe(false);
  });
});

describe("formatearFecha", () => {
  it("da el formato guatemalteco dd/mm/aaaa", () => {
    expect(formatearFecha("2026-04-03")).toBe("03/04/2026");
  });

  it("no se desplaza un día con fechas ISO con hora UTC", () => {
    expect(formatearFecha("2026-04-03T00:00:00.000Z")).toBe("03/04/2026");
  });

  it("da un guion con null", () => {
    expect(formatearFecha(null)).toBe("—");
  });

  it("da un guion con undefined", () => {
    expect(formatearFecha(undefined)).toBe("—");
  });

  it("da un guion con cadena vacía", () => {
    expect(formatearFecha("")).toBe("—");
  });

  it("da un guion con una fecha inválida", () => {
    expect(formatearFecha("no-es-una-fecha")).toBe("—");
  });
});

describe("aFechaDeInput", () => {
  it("recorta una fecha ISO completa a aaaa-mm-dd", () => {
    expect(aFechaDeInput("2026-04-03T00:00:00.000Z")).toBe("2026-04-03");
  });

  it("deja igual una fecha que ya viene corta", () => {
    expect(aFechaDeInput("2026-04-03")).toBe("2026-04-03");
  });

  it("da cadena vacía con null o undefined", () => {
    expect(aFechaDeInput(null)).toBe("");
    expect(aFechaDeInput(undefined)).toBe("");
  });
});

describe("fechaDeHoy", () => {
  it("compone aaaa-mm-dd en hora local, sin pasar por UTC", () => {
    // El caso que motivó esta función: a las 23:00 en Guatemala, un
    // toISOString().slice(0,10) ya habría cruzado a UTC y dado el día
    // siguiente. Se fija una referencia a esa hora para probarlo.
    const finDeDia = new Date(2026, 3, 3, 23, 30);
    expect(fechaDeHoy(finDeDia)).toBe("2026-04-03");
  });

  it("agrega ceros a la izquierda en mes y día", () => {
    const inicioDeAnio = new Date(2026, 0, 5); // 5 de enero
    expect(fechaDeHoy(inicioDeAnio)).toBe("2026-01-05");
  });
});

describe("formatearCui", () => {
  it("agrupa un CUI de 13 dígitos como 4-5-4", () => {
    expect(formatearCui("1234567890101")).toBe("1234 56789 0101");
  });

  it("quita espacios ya presentes antes de reagrupar", () => {
    expect(formatearCui("1234 56789 0101")).toBe("1234 56789 0101");
  });

  it("deja el valor igual si no tiene 13 dígitos", () => {
    expect(formatearCui("12345")).toBe("12345");
  });

  it("da un guion con null o vacío", () => {
    expect(formatearCui(null)).toBe("—");
    expect(formatearCui("")).toBe("—");
  });
});
