import { describe, expect, it } from "vitest";
import { esquemaAcceso } from "../esquema";

describe("esquemaAcceso", () => {
  it("acepta usuario y contraseña presentes", () => {
    const resultado = esquemaAcceso.safeParse({
      username: "maria",
      password: "cualquier-cosa",
    });
    expect(resultado.success).toBe(true);
  });

  it("recorta espacios del usuario", () => {
    const resultado = esquemaAcceso.safeParse({
      username: "  maria  ",
      password: "x",
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.username).toBe("maria");
    }
  });

  it("rechaza usuario vacío", () => {
    const resultado = esquemaAcceso.safeParse({ username: "", password: "x" });
    expect(resultado.success).toBe(false);
  });

  it("rechaza usuario que es solo espacios", () => {
    const resultado = esquemaAcceso.safeParse({
      username: "   ",
      password: "x",
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza contraseña vacía", () => {
    const resultado = esquemaAcceso.safeParse({
      username: "maria",
      password: "",
    });
    expect(resultado.success).toBe(false);
  });

  it("no exige longitud mínima ni complejidad en la contraseña", () => {
    // A propósito: rechazar aquí una contraseña antigua que no cumple las
    // reglas de complejidad actuales dejaría a esa cuenta sin poder entrar.
    const resultado = esquemaAcceso.safeParse({
      username: "maria",
      password: "1",
    });
    expect(resultado.success).toBe(true);
  });
});
