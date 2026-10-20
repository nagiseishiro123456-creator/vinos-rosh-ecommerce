import assert from "node:assert/strict";
import test from "node:test";
import { authenticationDestination, safeInternalDestination } from "../src/modules/auth/destination";

test("authentication preserves normalized internal destinations and rejects origin/encoding escapes", () => {
  for (const value of ["https://evil.example/", "//evil.example", "/\\evil.example", "/%5cevil.example", "/%2f%2fevil.example", "/%252fevil.example",
    "/\nevil.example", "/a/..//evil.example", "/a/%2e%2e//evil.example", "javascript:alert(1)", "/api/auth/signout", "/registrarse", "/iniciar-sesion", " /checkout", null]) {
    assert.equal(safeInternalDestination(value), "/mi-cuenta", String(value));
  }
  assert.equal(safeInternalDestination("/productos/../checkout?addressId=abc#entrega"), "/checkout?addressId=abc#entrega");
  assert.equal(safeInternalDestination("/carrito"), "/carrito");
  assert.equal(safeInternalDestination(undefined, "/checkout"), "/checkout");
  assert.equal(safeInternalDestination("/carrito?continuar=%2Fcheckout%3FaddressId%3Dabc"), "/carrito?continuar=%2Fcheckout%3FaddressId%3Dabc");
});
test("guest authentication keeps the purchase destination for review after merging", () => {
  assert.equal(authenticationDestination("/checkout?addressId=abc", true), "/carrito?continuar=%2Fcheckout%3FaddressId%3Dabc");
  assert.equal(authenticationDestination("/carrito", true), "/carrito");
  assert.equal(authenticationDestination("/checkout", false), "/checkout");
  assert.equal(authenticationDestination("//evil.example", false), "/mi-cuenta");
});
