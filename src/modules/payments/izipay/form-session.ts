import { z } from "zod";
import { paymentStatusSchema, type PaymentStatusSnapshot } from "./status-contract";

const initiationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("token_ready"), attemptId: z.string().cuid(), formToken: z.string().min(1).max(65536), publicKey: z.string().min(1).max(8192) }).strict(),
  z.object({ kind: z.enum(["pending", "recovery_required"]), attemptId: z.string().cuid(), message: z.string().optional() }).strict(),
]);
export type FormPhase = "idle" | "starting" | "form" | "waiting" | "recovery" | "session" | "expired" | "confirmed" | "test_confirmed" | "closed";
export type FormView = { phase: FormPhase; busy: boolean; snapshot: PaymentStatusSnapshot };
export class FormSessionChanged extends Error {}
export type FormPorts = {
  status: (signal: AbortSignal) => Promise<unknown>;
  initiate: (signal: AbortSignal) => Promise<unknown>;
  mount: (token: string, publicKey: string, submitted: () => false, signal: AbortSignal) => Promise<void>;
  clear: () => void;
};

/** No payment writes, token storage, automatic retries or trust in the SDK's payment result. */
export class PaymentFormSession {
  private lifetime = new AbortController();
  private used = false;
  private working = false;
  private submitted = false;
  private expiry?: ReturnType<typeof setTimeout>;
  private view: FormView;
  constructor(private initial: PaymentStatusSnapshot, private ports: FormPorts, private notify: (view: FormView) => void,
    private timeoutMs = 15000, private now = () => Date.now()) {
    this.view = { phase: this.phase(initial, true), busy: false, snapshot: initial };
  }
  current() { return this.view; }
  private phase(snapshot: PaymentStatusSnapshot, initial = false): FormPhase {
    if (snapshot.state === "closed") return "closed";
    if (snapshot.state === "expired") return "expired";
    if (snapshot.testResult === "APPROVED") return "test_confirmed";
    if (snapshot.state === "confirmed") return "confirmed";
    if (snapshot.state === "reserved") return !this.live(snapshot) ? "expired" : initial && !this.used ? "idle" : "recovery";
    return "recovery";
  }
  private publish(phase: FormPhase, snapshot = this.view.snapshot) {
    if (this.lifetime.signal.aborted) return;
    this.view = { phase, busy: this.working, snapshot }; this.notify(this.view);
  }
  private check(raw: unknown) {
    const snapshot = paymentStatusSchema.parse(raw);
    if (snapshot.orderId !== this.initial.orderId || snapshot.orderNumber !== this.initial.orderNumber
      || snapshot.total !== this.initial.total || snapshot.currency !== this.initial.currency
      || snapshot.reservationExpiresAt !== this.initial.reservationExpiresAt) throw new Error("INCONSISTENT_ORDER");
    return snapshot;
  }
  private live(snapshot: PaymentStatusSnapshot) {
    return !!snapshot.reservationExpiresAt && Date.parse(snapshot.reservationExpiresAt) > this.now();
  }
  private async bounded<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    this.lifetime.signal.addEventListener("abort", abort, { once: true });
    if (this.lifetime.signal.aborted) abort();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interrupted = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => reject(new Error("INTERRUPTED")), { once: true });
      if (controller.signal.aborted) reject(new Error("INTERRUPTED"));
      timer = setTimeout(abort, this.timeoutMs);
    });
    try { return await Promise.race([interrupted, run(controller.signal)]); }
    finally { clearTimeout(timer); this.lifetime.signal.removeEventListener("abort", abort); }
  }
  async start() {
    if (this.used || this.working || this.lifetime.signal.aborted || this.view.phase !== "idle") return;
    this.used = true; this.working = true; this.publish("starting");
    try {
      await this.bounded(async signal => {
        const snapshot = this.check(await this.ports.status(signal));
        if (signal.aborted) return;
        if (snapshot.state !== "reserved") { this.publish(this.phase(snapshot), snapshot); return; }
        if (!this.live(snapshot)) { this.publish("expired", snapshot); return; }
        const result = initiationSchema.parse(await this.ports.initiate(signal));
        if (signal.aborted) return;
        if (result.kind !== "token_ready") { this.publish("recovery", snapshot); return; }
        if (!this.live(snapshot)) { this.publish("expired", snapshot); return; }
        const prepared = this.check(await this.ports.status(signal));
        if (signal.aborted) return;
        if (prepared.state !== "prepared" || prepared.testResult || !this.live(prepared)) {
          this.publish(this.phase(prepared), prepared); return;
        }
        this.expiry = setTimeout(() => { this.ports.clear(); this.publish("expired"); }, Date.parse(snapshot.reservationExpiresAt!) - this.now());
        await this.ports.mount(result.formToken, result.publicKey, () => {
          // Ignore all SDK answer/hash/status fields. Only our authenticated status endpoint is authoritative.
          if (!this.lifetime.signal.aborted && !this.submitted) {
            this.submitted = true; this.ports.clear(); this.publish("waiting");
          }
          return false;
        }, signal);
        if (signal.aborted) return;
        if (!this.live(snapshot)) { this.ports.clear(); this.publish("expired", snapshot); return; }
        this.publish(this.submitted ? "waiting" : "form", snapshot);
      });
    } catch (error) {
      clearTimeout(this.expiry); this.ports.clear();
      this.publish(error instanceof FormSessionChanged ? "session" : !this.live(this.view.snapshot) ? "expired" : "recovery");
    } finally { this.working = false; this.publish(this.view.phase); }
  }
  async refresh() {
    if (this.working || this.lifetime.signal.aborted || this.view.phase === "session") return;
    this.working = true; this.publish(this.view.phase);
    try {
      const snapshot = this.check(await this.bounded(signal => this.ports.status(signal)));
      if (this.lifetime.signal.aborted) return;
      // A refresh is read-only and must never grant permission to start again.
      const phase = this.view.phase === "form" && snapshot.state === "prepared" && !snapshot.testResult && this.live(snapshot) ? "form" : this.phase(snapshot, !this.used);
      if (phase !== "idle" && phase !== "form") { this.used = true; this.ports.clear(); clearTimeout(this.expiry); }
      this.publish(phase, snapshot);
    } catch (error) { this.used = true; clearTimeout(this.expiry); this.ports.clear(); this.publish(error instanceof FormSessionChanged ? "session" : "recovery"); }
    finally { this.working = false; this.publish(this.view.phase); }
  }
  dispose() { this.lifetime.abort(); clearTimeout(this.expiry); this.ports.clear(); }
}
