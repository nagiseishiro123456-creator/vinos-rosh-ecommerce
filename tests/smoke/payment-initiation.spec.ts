import { expect, test } from "@playwright/test";

test("S3-02: sandbox initiation stays disabled on the built application and never accepts GET", async ({ request }) => {
  const response = await request.post("/api/payment/initiate", {
    headers: { Origin: "http://127.0.0.1:3000", "Content-Type": "application/json" },
    data: { orderId: "cm223456789012345678901234", expectedUserId: "cm123456789012345678901234" },
  });
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(await response.json()).not.toHaveProperty("formToken");
  expect((await request.get("/api/payment/initiate")).status()).toBe(405);
});
