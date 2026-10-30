import {
  beginMicuentawebSandboxAttempt, canRequestMicuentawebToken,
  recordMicuentawebAttemptUncertain, recordMicuentawebTokenReady,
} from "./attempt-service";
import { requestMicuentawebSandboxFormToken, type SandboxEnvironment } from "./micuentaweb-core";

export class PaymentInitiationError extends Error {
  constructor() { super("PAYMENT_RECOVERY_REQUIRED"); this.name = "PaymentInitiationError"; }
}

const ports = {
  begin: beginMicuentawebSandboxAttempt, current: canRequestMicuentawebToken,
  request: requestMicuentawebSandboxFormToken, ready: recordMicuentawebTokenReady,
  uncertain: recordMicuentawebAttemptUncertain,
};
export type InitiationPorts = typeof ports;
export type InitiationResult =
  | { kind: "token_ready"; attemptId: string; formToken: string; publicKey: string }
  | { kind: "pending" | "recovery_required"; attemptId: string };

/** One request by the creator, outside any DB transaction. No network retry or token replay. */
export async function initiateMicuentawebSandboxPayment(
  userId: string, orderId: string, environment: SandboxEnvironment,
  overrides: Partial<InitiationPorts> = {},
): Promise<InitiationResult> {
  const dependencies = { ...ports, ...overrides };
  const configuration = { ...environment };
  const started = await dependencies.begin(userId, orderId, configuration);
  const attemptId = started.attempt.id;
  if (!started.created) return { attemptId,
    kind: started.attempt.state === "INITIATING" ? "pending" : "recovery_required" };
  try {
    if (!await dependencies.current(userId, attemptId)) throw new PaymentInitiationError();
    const token = await dependencies.request(started.snapshot, configuration);
    // Never expose the token if persistence or current reservation validity is unconfirmed.
    if (!await dependencies.ready(attemptId, token.formToken)) throw new PaymentInitiationError();
    return { kind: "token_ready", attemptId, ...token };
  } catch {
    // If DB recovery also fails, INITIATING still blocks another outbound request.
    // Do not leak the provider's body, credential, token or arbitrary exception message.
    try { await dependencies.uncertain(attemptId); } catch { /* Operator recovery is required. */ }
    throw new PaymentInitiationError();
  }
}
