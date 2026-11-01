import type { Route } from "next";
import { z } from "zod";
import { readSeoConfig } from "../../../lib/seo";
import { inspectPaymentEmailSetup } from "../../notifications/email-config";
import { readMicuentawebSandboxConfig } from "../../payments/izipay/micuentaweb-core";

export type LaunchCommerce = { yapeReady: boolean; transferReady: boolean; whatsappPhone: string | null; contactEmail: string | null };
export type LaunchSnapshot = {
  activeProducts: number | null; inStockProducts: number | null;
  activeZones: number | null; zonesWithoutInstructions: number | null;
  commerce: LaunchCommerce | null;
};
type Loaders = { [K in keyof LaunchSnapshot]: () => Promise<NonNullable<LaunchSnapshot[K]>> };
type Environment = Readonly<Record<string, string | undefined>>;
export type LaunchStatus = "ready" | "pending" | "review" | "unavailable";
export type LaunchCheck = {
  id: string; title: string; status: LaunchStatus; description: string;
  nextStep: string; href: Route; linkLabel: string; required?: boolean;
};
export const launchStatusCopy: Record<LaunchStatus, string> = {
  ready: "Configurado", pending: "Pendiente", review: "Requiere validación", unavailable: "No se pudo comprobar",
};
function observed<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}
/** A failed observation stays unknown; it cannot silently become zero or ready. */
export async function collectLaunchSnapshot(loaders: Loaders): Promise<LaunchSnapshot> {
  const [products, stock, zones, instructions, commerce] = await Promise.allSettled([
    Promise.resolve().then(loaders.activeProducts), Promise.resolve().then(loaders.inStockProducts),
    Promise.resolve().then(loaders.activeZones), Promise.resolve().then(loaders.zonesWithoutInstructions),
    Promise.resolve().then(loaders.commerce),
  ]);
  return { activeProducts: observed(products), inStockProducts: observed(stock), activeZones: observed(zones),
    zonesWithoutInstructions: observed(instructions), commerce: observed(commerce) };
}
function availability(value: number | null): LaunchStatus {
  return value === null ? "unavailable" : value > 0 ? "ready" : "pending";
}
function configuration(commerce: LaunchCommerce | null, valid: boolean): LaunchStatus {
  return commerce === null ? "unavailable" : valid ? "ready" : "pending";
}
/** Pure local observations. Does not contact providers, enable services or certify launch. */
export function buildLaunchReport(snapshot: LaunchSnapshot, environment: Environment) {
  const { activeProducts, inStockProducts, activeZones, zonesWithoutInstructions, commerce } = snapshot;
  const publicMode = readSeoConfig(environment).indexable;
  const email = inspectPaymentEmailSetup(environment);
  const phoneValid = /^\+?\d{9,15}$/.test(commerce?.whatsappPhone ?? "");
  const contactValid = z.string().email().safeParse(commerce?.contactEmail).success;
  let sandboxConfigured = false;
  try { readMicuentawebSandboxConfig(environment); sandboxConfigured = true; } catch { /* Only fixed, redacted copy is returned. */ }
  const checks: LaunchCheck[] = [
    { id: "catalog", title: "Catálogo visible", status: availability(activeProducts), required: true,
      description: activeProducts === null ? "No se pudo consultar el catálogo." : `${activeProducts} producto(s) activo(s).`,
      nextStep: "Revisa los productos publicados, sus precios y fotografías.", href: "/admin/productos", linkLabel: "Revisar productos" },
    { id: "stock", title: "Stock disponible", status: availability(inStockProducts), required: true,
      description: inStockProducts === null ? "No se pudo consultar el inventario." : `${inStockProducts} producto(s) activo(s) con stock.`,
      nextStep: "Comprueba que las cantidades correspondan al inventario que ROSH puede vender.", href: "/admin/inventario", linkLabel: "Revisar inventario" },
    { id: "shipping", title: "Cobertura de envío", status: availability(activeZones), required: true,
      description: activeZones === null ? "No se pudo consultar la cobertura." : `${activeZones} zona(s) activa(s) con tarifa.`,
      nextStep: "Revisa los distritos y tarifas; confirma las condiciones de entrega con ROSH.", href: "/admin/envios", linkLabel: "Revisar cobertura y tarifas" },
    { id: "payment", title: "Pago manual configurado", status: configuration(commerce, Boolean(commerce?.yapeReady || commerce?.transferReady)), required: true,
      description: commerce === null ? "No se pudo consultar la configuración de pagos." : commerce.yapeReady || commerce.transferReady
        ? "El checkout tiene al menos un medio manual configurado. Su recepción y revisión deben probarse con ROSH."
        : "El checkout no tiene un medio manual habilitado con sus datos completos.",
      nextStep: "Revisa Yape o transferencia y sus datos. Configurar el medio no comprueba un ingreso bancario.", href: "/admin/configuracion", linkLabel: "Revisar medios manuales" },
    { id: "support", title: "Canal de atención", status: configuration(commerce, phoneValid), required: true,
      description: commerce === null ? "No se pudo consultar el canal de atención." : phoneValid
        ? "WhatsApp tiene un número con formato válido. Comprueba que lo atienda el negocio."
        : "Falta un número de WhatsApp válido para la atención al comprador.",
      nextStep: "Guarda el número de atención y comprueba su enlace público.", href: "/admin/configuracion", linkLabel: "Revisar atención" },
    { id: "contact", title: "Correo comercial", status: configuration(commerce, contactValid),
      description: commerce === null ? "No se pudo consultar el correo comercial." : contactValid
        ? "Hay un correo comercial con formato válido. Esto no configura el envío de mensajes."
        : "Falta un correo comercial válido para consultas.",
      nextStep: "Registra el correo que atenderá ROSH; revisa el correo transaccional por separado.", href: "/admin/configuracion", linkLabel: "Revisar correo comercial" },
    { id: "public-mode", title: "Configuración de publicación", status: publicMode ? "ready" : "pending", required: true,
      description: publicMode ? "El entorno autoriza indexación con un origen HTTPS público válido. No se ha comprobado su disponibilidad externa."
        : "La configuración mantiene el sitio sin indexación pública: desarrollo, vista previa o dominio sin preparar.",
      nextStep: "El responsable técnico debe revisar el dominio definitivo y el modo de publicación antes del lanzamiento.", href: "/admin/lanzamiento#revision-publicacion", linkLabel: "Ver preparación de publicación" },
  ];
  const integrations: LaunchCheck[] = [
    { id: "izipay", title: "Izipay", status: environment.PAYMENTS_IZIPAY_ENABLED === "true" ? "review" : "pending",
      description: sandboxConfigured ? "Configuración local de sandbox presente. No acredita cobros, IPN ni integración productiva."
        : environment.PAYMENTS_IZIPAY_ENABLED === "true" ? "La opción está habilitada, pero falta completar o validar su preparación de sandbox."
        : "Izipay permanece desactivado. El acceso del comercio y las pruebas externas siguen pendientes.",
      nextStep: "El responsable técnico debe confirmar el producto contratado y completar sandbox, retorno e IPN antes de conectarlo al checkout.",
      href: "/admin/lanzamiento#revision-proveedores", linkLabel: "Ver siguientes pasos de Izipay" },
    { id: "email", title: "Correo transaccional", status: email.enabled ? "review" : "pending",
      description: email.locallyReady ? "Configuración local de confirmaciones completa. Dominio y entrega externa siguen sin comprobarse."
        : email.enabled ? "La opción de confirmaciones está habilitada con preparación local incompleta."
        : "Las confirmaciones por correo permanecen desactivadas. La cola y sus vistas previas siguen disponibles.",
      nextStep: "Revisa remitente y credencial en el servidor; valida recuperación de contraseña y recepción de confirmaciones con destinatarios autorizados.",
      href: "/admin/notificaciones/configuracion", linkLabel: "Revisar preparación del correo" },
  ];
  const reviews: LaunchCheck[] = [
    { id: "delivery-conditions", title: "Condiciones reales de entrega", status: "review",
      description: zonesWithoutInstructions === null ? "No se pudieron consultar las indicaciones guardadas. La validación de ROSH sigue pendiente."
        : `${zonesWithoutInstructions} zona(s) activa(s) sin indicaciones públicas. Guardar texto no acredita aceptación del negocio.`,
      nextStep: "ROSH debe revisar cobertura, tarifas, horarios y plazos; luego puede editar las indicaciones de cada zona.", href: "/admin/envios", linkLabel: "Editar indicaciones de entrega" },
    { id: "acceptance", title: "Compra de prueba con el cliente", status: "review",
      description: "Las pruebas automáticas no registran la aceptación del cliente.",
      nextStep: "Recorre la compra y la gestión del pedido con datos de prueba y registra el resultado con ROSH.", href: "/admin/lanzamiento#prueba-cliente", linkLabel: "Abrir recorrido de prueba" },
    { id: "recovery", title: "Respaldo y recuperación", status: "review",
      description: "Tener una exportación JSON no acredita una restauración completa de PostgreSQL.",
      nextStep: "Acuerda responsables y frecuencia de copias; el responsable técnico debe probar una restauración aislada antes de usar datos reales.", href: "/admin/respaldo", linkLabel: "Revisar respaldos" },
    { id: "billing", title: "Emisión de comprobantes", status: "review",
      description: "ROSH debe confirmar su proceso de emisión y quién lo operará.",
      nextStep: "Registra el responsable y valida el recorrido de emisión con el negocio.", href: "/admin/lanzamiento#revision-negocio", linkLabel: "Ver revisión con ROSH" },
    { id: "legal", title: "Datos y documentos del negocio", status: "review",
      description: "Los datos comerciales y documentos públicos requieren la revisión del responsable del negocio.",
      nextStep: "ROSH debe revisar denominación del producto, datos de contacto, términos, privacidad y su mecanismo de reclamaciones.", href: "/admin/lanzamiento#revision-negocio", linkLabel: "Ver revisión con ROSH" },
  ];
  const readyCount = checks.filter((check) => check.status === "ready").length;
  return { checks, integrations, reviews, readyCount, total: checks.length,
    requiredPending: checks.filter((check) => check.required && check.status !== "ready").length,
    unavailableCount: checks.filter((check) => check.status === "unavailable").length,
    progress: Math.round(100 * readyCount / checks.length) };
}
