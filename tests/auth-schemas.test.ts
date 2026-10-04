import assert from "node:assert/strict";
import test from "node:test";

import { loginSchema, registerSchema } from "../src/modules/auth/schemas";

test("registerSchema accepts a valid Peruvian customer", () => {
  const result = registerSchema.safeParse({
    firstName: "Victor",
    lastName: "Rosh",
    email: "CLIENTE@EXAMPLE.COM ",
    phone: "987654321",
    password: "Segura123",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, "cliente@example.com");
  }
});

test("registerSchema rejects weak passwords", () => {
  const result = registerSchema.safeParse({
    firstName: "Victor",
    lastName: "Rosh",
    email: "cliente@example.com",
    phone: "987654321",
    password: "12345678",
  });

  assert.equal(result.success, false);
});

test("registerSchema rejects invalid Peruvian mobile numbers", () => {
  const result = registerSchema.safeParse({
    firstName: "Victor",
    lastName: "Rosh",
    email: "cliente@example.com",
    phone: "123456789",
    password: "Segura123",
  });

  assert.equal(result.success, false);
});

test("loginSchema normalizes email and requires a password", () => {
  const valid = loginSchema.safeParse({
    email: " CLIENTE@EXAMPLE.COM ",
    password: "Segura123",
  });
  const invalid = loginSchema.safeParse({
    email: "cliente@example.com",
    password: "",
  });

  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.email, "cliente@example.com");
  }
  assert.equal(invalid.success, false);
});
