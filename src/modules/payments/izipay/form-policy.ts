import { readMicuentawebSandboxConfig, type SandboxEnvironment } from "./micuentaweb-core";

/** TEST forms stay in development; a live form needs the independent, server-owned activation. */
export function isMicuentawebFormLabEnabled(environment: SandboxEnvironment): boolean {
  if (environment.NODE_ENV !== "development" || environment.IZIPAY_MCW_FORM_ENABLED !== "true"
    || environment.IZIPAY_MCW_INITIATE_ENABLED !== "true") return false;
  try {
    const config = readMicuentawebSandboxConfig(environment);
    return config.restTestPassword.startsWith("testpassword_")
      && config.publicTestKey.startsWith(`${config.merchantId}:testpublickey_`);
  } catch { return false; }
}
export function isMicuentawebFormEnabled(environment: SandboxEnvironment): boolean {
  if (isMicuentawebFormLabEnabled(environment)) return true;
  if (environment.IZIPAY_MCW_FORM_ENABLED !== "true" || environment.IZIPAY_MCW_INITIATE_ENABLED !== "true"
    || environment.IZIPAY_MODE !== "PRODUCTION" || environment.IZIPAY_PRODUCTION_ENABLED !== "true") return false;
  try { readMicuentawebSandboxConfig(environment); return true; } catch { return false; }
}
