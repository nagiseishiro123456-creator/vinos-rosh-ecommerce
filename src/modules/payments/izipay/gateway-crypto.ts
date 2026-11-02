import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

export const gatewayCredentialsSchema = z.object({
  merchantId: z.string().regex(/^\d{8}$/), mode: z.enum(["SANDBOX", "PRODUCTION"]),
  apiPassword: z.string().trim().min(8).max(4096), publicKey: z.string().trim().min(8).max(8192),
  hmacKey: z.string().trim().min(8).max(4096),
}).strict().superRefine((value, ctx) => {
  const test = value.mode === "SANDBOX";
  if (!(test ? ["testpublickey_"] : ["publickey_", "prodpublickey_"]).some(prefix => value.publicKey.startsWith(`${value.merchantId}:${prefix}`))
    || !value.apiPassword.startsWith(test ? "testpassword_" : "prodpassword_")) {
    ctx.addIssue({ code: "custom", message: "KEY_MODE_MISMATCH" });
  }
});
export type GatewayCredentials = z.infer<typeof gatewayCredentialsSchema>;
export class GatewayConfigurationError extends Error {
  constructor() { super("GATEWAY_CONFIGURATION_UNAVAILABLE"); }
}
function key(value: string | undefined) {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new GatewayConfigurationError();
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new GatewayConfigurationError();
  return decoded;
}
export function sealGatewayCredentials(credentials: GatewayCredentials, master: string | undefined) {
  const payload = gatewayCredentialsSchema.safeParse(credentials);
  if (!payload.success) throw new GatewayConfigurationError();
  const iv = randomBytes(12), secret = key(master), cipher = createCipheriv("aes-256-gcm", secret, iv);
  cipher.setAAD(Buffer.from("rosh:izipay-credentials:v1"));
  const text = JSON.stringify(payload.data), data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return { secretBox: ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join("."),
    fingerprint: createHmac("sha256", secret).update(text).digest("hex") };
}
export function openGatewayCredentials(box: string, master: string | undefined): GatewayCredentials {
  try {
    if (box.length > 32768) throw new Error();
    const [version, iv, tag, data, extra] = box.split(".");
    if (version !== "v1" || !iv || !tag || !data || extra) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key(master), Buffer.from(iv, "base64"));
    decipher.setAAD(Buffer.from("rosh:izipay-credentials:v1")); decipher.setAuthTag(Buffer.from(tag, "base64"));
    return gatewayCredentialsSchema.parse(JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8")));
  } catch { throw new GatewayConfigurationError(); }
}
