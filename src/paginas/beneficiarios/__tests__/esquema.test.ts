import { describe, expect, it } from "vitest";
import {
  datosBasePersona,
  esquemaBeneficiario,
  esquemaContacto,
} from "../esquema";

const BASE_VALIDA = {
  nombres: "Ana",
  apellidos: "Pérez",
  fecha_nacimiento: "2000-01-01",
  discapacidadIds: [] as number[],
  contactos: [] as { nombre: string; telefono?: string }[],
};

describe("datosBasePersona — fecha de nacimiento", () => {
  it("acepta una fecha de nacimiento razonable", () => {
    const r = datosBasePersona.safeParse({ ...BASE_VALIDA });
    expect(r.success).toBe(true);
  });

  it("rechaza fecha de nacimiento vacía", () => {
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      fecha_nacimiento: "",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza una fecha inválida", () => {
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      fecha_nacimiento: "no-es-una-fecha",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza una fecha futura", () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      fecha_nacimiento: manana.toISOString().slice(0, 10),
    });
    expect(r.success).toBe(false);
  });

  it("acepta el día de hoy como fecha de nacimiento", () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      fecha_nacimiento: hoy,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza una fecha de más de 120 años atrás", () => {
    const limite = new Date();
    limite.setFullYear(limite.getFullYear() - 121);
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      fecha_nacimiento: limite.toISOString().slice(0, 10),
    });
    expect(r.success).toBe(false);
  });

  it("acepta una fecha de justo dentro del límite de 120 años", () => {
    const limite = new Date();
    limite.setFullYear(limite.getFullYear() - 100);
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      fecha_nacimiento: limite.toISOString().slice(0, 10),
    });
    expect(r.success).toBe(true);
  });
});

describe("datosBasePersona — CUI/DPI", () => {
  it("acepta un CUI de 13 dígitos", () => {
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      cui_dpi: "1234567890101",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un CUI con menos de 13 dígitos", () => {
    const r = datosBasePersona.safeParse({ ...BASE_VALIDA, cui_dpi: "12345" });
    expect(r.success).toBe(false);
  });

  it("trata el CUI vacío como ausente, no como error", () => {
    const r = datosBasePersona.safeParse({ ...BASE_VALIDA, cui_dpi: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.cui_dpi).toBeUndefined();
  });
});

describe("datosBasePersona — nombres y apellidos", () => {
  it("rechaza nombres vacíos", () => {
    const r = datosBasePersona.safeParse({ ...BASE_VALIDA, nombres: "" });
    expect(r.success).toBe(false);
  });

  it("rechaza apellidos vacíos", () => {
    const r = datosBasePersona.safeParse({ ...BASE_VALIDA, apellidos: "" });
    expect(r.success).toBe(false);
  });

  it("recorta espacios en nombres y apellidos", () => {
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      nombres: "  Ana  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nombres).toBe("Ana");
  });
});

describe("datosBasePersona — teléfono opcional", () => {
  it("acepta ausencia de teléfono", () => {
    const r = datosBasePersona.safeParse({ ...BASE_VALIDA });
    expect(r.success).toBe(true);
  });

  it("normaliza un teléfono con formato humano", () => {
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      telefono: "+502 5512-3344",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.telefono).toBe("55123344");
  });

  it("rechaza un teléfono con menos de 8 dígitos", () => {
    const r = datosBasePersona.safeParse({
      ...BASE_VALIDA,
      telefono: "5512",
    });
    expect(r.success).toBe(false);
  });
});

describe("esquemaContacto", () => {
  it("exige teléfono en el contacto, a diferencia de la persona", () => {
    const r = esquemaContacto.safeParse({ nombre: "Juan", telefono: "" });
    expect(r.success).toBe(false);
  });

  it("acepta un contacto completo", () => {
    const r = esquemaContacto.safeParse({
      nombre: "Juan",
      telefono: "55123344",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un contacto sin nombre", () => {
    const r = esquemaContacto.safeParse({ nombre: "", telefono: "55123344" });
    expect(r.success).toBe(false);
  });
});

describe("esquemaBeneficiario — encargado", () => {
  it("acepta un beneficiario sin encargado", () => {
    const r = esquemaBeneficiario.safeParse({ ...BASE_VALIDA });
    expect(r.success).toBe(true);
  });

  it("acepta un beneficiario con el bloque de encargado completamente vacío (todos undefined)", () => {
    const r = esquemaBeneficiario.safeParse({
      ...BASE_VALIDA,
      encargado: {
        nombres: undefined,
        apellidos: undefined,
        fecha_nacimiento: undefined,
        cui_dpi: undefined,
        telefono: undefined,
        tipoParentescoId: undefined,
      },
    });
    // Caso real que motivó encargadoVacio(): react-hook-form crea las claves
    // en cuanto los campos se pintan, así que `encargado` nunca llega como
    // undefined puro. Un objeto con todas las claves vacías debe tratarse
    // igual que no tener encargado.
    expect(r.success).toBe(true);
  });

  it("acepta un beneficiario con el bloque de encargado con strings vacíos", () => {
    const r = esquemaBeneficiario.safeParse({
      ...BASE_VALIDA,
      encargado: {
        nombres: "",
        apellidos: "",
        fecha_nacimiento: "",
        cui_dpi: "",
        telefono: "",
        tipoParentescoId: "",
      },
    });
    expect(r.success).toBe(true);
  });

  it("exige nombres, apellidos, fecha de nacimiento y parentesco si se empieza a llenar el encargado", () => {
    const r = esquemaBeneficiario.safeParse({
      ...BASE_VALIDA,
      encargado: { nombres: "Carlos" }, // solo un campo tocado
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const rutas = r.error.issues.map((i) => i.path.join("."));
      expect(rutas).toContain("encargado.apellidos");
      expect(rutas).toContain("encargado.fecha_nacimiento");
      expect(rutas).toContain("encargado.tipoParentescoId");
      // El campo que sí se llenó no debe reportarse como faltante.
      expect(rutas).not.toContain("encargado.nombres");
    }
  });

  it("acepta un encargado con todos los campos obligatorios completos", () => {
    const r = esquemaBeneficiario.safeParse({
      ...BASE_VALIDA,
      encargado: {
        nombres: "Carlos",
        apellidos: "Ramírez",
        fecha_nacimiento: "1980-01-01",
        tipoParentescoId: "1",
      },
    });
    expect(r.success).toBe(true);
  });

  it("no exige encargado ni siquiera para un menor sin CUI/DPI", () => {
    // La migración 22 quitó esa exigencia de la base; el frontend no debe
    // reintroducirla. Se verifica con una fecha de nacimiento reciente
    // (claramente menor de edad) y sin cui_dpi.
    const haceCincoAnios = new Date();
    haceCincoAnios.setFullYear(haceCincoAnios.getFullYear() - 5);
    const r = esquemaBeneficiario.safeParse({
      ...BASE_VALIDA,
      fecha_nacimiento: haceCincoAnios.toISOString().slice(0, 10),
      cui_dpi: undefined,
    });
    expect(r.success).toBe(true);
  });
});

describe("esquemaBeneficiario — discapacidades y contactos", () => {
  it("da arreglo vacío por defecto si discapacidadIds no viene", () => {
    const sinDiscapacidades = {
      nombres: BASE_VALIDA.nombres,
      apellidos: BASE_VALIDA.apellidos,
      fecha_nacimiento: BASE_VALIDA.fecha_nacimiento,
      contactos: BASE_VALIDA.contactos,
    };
    const r = esquemaBeneficiario.safeParse(sinDiscapacidades);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.discapacidadIds).toEqual([]);
  });

  it("acepta varios contactos válidos", () => {
    const r = esquemaBeneficiario.safeParse({
      ...BASE_VALIDA,
      contactos: [
        { nombre: "Juan", telefono: "55123344" },
        { nombre: "Rosa", telefono: "55667788" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza el conjunto si un contacto es inválido", () => {
    const r = esquemaBeneficiario.safeParse({
      ...BASE_VALIDA,
      contactos: [{ nombre: "Juan", telefono: "123" }],
    });
    expect(r.success).toBe(false);
  });
});
