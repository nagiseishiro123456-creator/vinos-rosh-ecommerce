import assert from "node:assert/strict";
import test from "node:test";
import { projectSettlement, settlementInputSchema } from "../src/modules/payments/settlement-contract";

const input = { expectedRevision: 0, commissionAmount: "", depositedAmount: "", depositReference: "", depositDate: "", sourceReference: "Extracto QA", reason: "Reporte revisado" };
test("unknown commission stays unknown even if the gross amount has been deposited", () => {
  assert.deepEqual(projectSettlement("98.20", null, "98.20"), { state: "PENDING_COSTS", net: null, difference: null });
  assert.deepEqual(projectSettlement("98.20", "0.00", "98.20"), { state: "MATCHED", net: "98.20", difference: "0.00" });
  assert.equal(projectSettlement("98.20", "2.50", null).state, "PENDING_DEPOSIT");
});
test("reconciliation calculates exact decimal net and signed discrepancies without rounding floats", () => {
  assert.deepEqual(projectSettlement("98.20", "2.50", "94.70"), { state: "DIFFERENCE", net: "95.70", difference: "-1.00" });
  assert.deepEqual(projectSettlement("0.30", "0.10", "0.20"), { state: "MATCHED", net: "0.20", difference: "0.00" });
  assert.equal(projectSettlement("99999999.99", "0.00", "99999999.99").difference, "0.00");
  assert.equal(projectSettlement("98.20", "2.50", "96.70").difference, "1.00");
});
test("a changed payment or excessive fee projects review instead of a successful reconciliation", () => {
  assert.equal(projectSettlement("98.20", "2.50", "95.70", false).state, "REVIEW");
  assert.equal(projectSettlement("98.20", "98.21", "0.00").state, "REVIEW");
});
test("statement input preserves null and explicit zero and rejects invalid dates and incomplete evidence", () => {
  assert.equal(settlementInputSchema.parse(input).commissionAmount, null);
  assert.equal(settlementInputSchema.parse({ ...input, commissionAmount: "0.00" }).commissionAmount, "0.00");
  for (const change of [{ commissionAmount: "-1.00" }, { depositedAmount: "1e2" }, { commissionAmount: "2,50" }, { sourceReference: "" }, { expectedRevision: -1 }, { depositedAmount: "95.70" }, { depositReference: "QA-123" }, { depositDate: "2026-10-01" }, { depositedAmount: "95.70", depositReference: "QA-123", depositDate: "2026-02-30" }]) {
    assert.equal(settlementInputSchema.safeParse({ ...input, ...change }).success, false);
  }
  assert.ok(settlementInputSchema.safeParse({ ...input, depositedAmount: "0.00", depositReference: "QA-123", depositDate: "2024-02-29" }).success);
  assert.equal(settlementInputSchema.safeParse({ ...input, grossAmount: "1.00" }).success, false);
});
