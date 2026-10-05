import Link from "next/link";

import { requireAdmin } from "@/modules/admin/auth";
import { updateCommerceSettings } from "@/modules/settings/actions";
import { getCommerceSettings } from "@/modules/settings/queries";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

function configurationError(code: string | undefined) {
  if (code === "invalid-qr") return "El QR debe ser PNG, JPG o WebP y pesar como máximo 500 KB.";
  if (code === "yape-incomplete") return "Para activar Yape registra un número o un código QR.";
  if (code === "transfer-incomplete") return "Para activar transferencia registra el número de cuenta o CCI.";
  return "Revisa los datos ingresados antes de guardar.";
}

export default async function AdminConfigurationPage({ searchParams }: Props) {
  await requireAdmin("/admin/configuracion");
  const [settings, query] = await Promise.all([
    getCommerceSettings(),
    searchParams,
  ]);

  const qrIsHttps = settings.yape.qrImageUrl?.startsWith("https://") ?? false;
  const hasStoredQr = Boolean(settings.yape.qrImageUrl);

  return (
    <main className="shell adminPage adminSettingsPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">CONFIGURACIÓN</p>
          <h1>Datos comerciales</h1>
          <p className="adminIntro">
            El cliente puede cambiar Yape, transferencia y contacto sin modificar código ni contratar una pasarela.
          </p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin">← Panel</Link>
        </div>
      </div>

      {query.saved ? (
        <div className="adminSettingsSuccess">Configuración guardada correctamente.</div>
      ) : null}

      {query.error ? (
        <div className="checkoutError">{configurationError(query.error)}</div>
      ) : null}

      <div className="adminSettingsSource">
        <strong>Fuente actual: {settings.source === "database" ? "Panel administrativo" : "Variables de entorno"}</strong>
        <span>
          Al guardar este formulario, la configuración administrable tendrá prioridad sobre los valores del archivo `.env`.
        </span>
      </div>

      <form className="adminSettingsForm" action={updateCommerceSettings} encType="multipart/form-data">
        <section className="adminCard adminSettingsCard">
          <p className="eyebrow wine">CONTACTO</p>
          <h2>Atención al cliente</h2>
          <div className="checkoutFormGrid">
            <div className="formField">
              <label htmlFor="contactEmail">Correo público</label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                maxLength={180}
                defaultValue={settings.contactEmail ?? ""}
                placeholder="ventas@vinosrosh.pe"
              />
            </div>
            <div className="formField">
              <label htmlFor="whatsappPhone">WhatsApp</label>
              <input
                id="whatsappPhone"
                name="whatsappPhone"
                inputMode="tel"
                defaultValue={settings.whatsappPhone ?? ""}
                placeholder="51987654321"
              />
              <small>Incluye código de país. Ejemplo Perú: 51 + número.</small>
            </div>
          </div>
        </section>

        <section className="adminCard adminSettingsCard">
          <div className="adminSettingsTitleRow">
            <div>
              <p className="eyebrow wine">PAGO MANUAL</p>
              <h2>Yape</h2>
            </div>
            <label className="adminToggle">
              <input type="checkbox" name="yapeEnabled" defaultChecked={settings.yape.enabled} />
              <span>Habilitar</span>
            </label>
          </div>

          <div className="checkoutFormGrid">
            <div className="formField">
              <label htmlFor="yapePhone">Número Yape</label>
              <input
                id="yapePhone"
                name="yapePhone"
                inputMode="tel"
                defaultValue={settings.yape.phone ?? ""}
                placeholder="987654321"
              />
            </div>
            <div className="formField">
              <label htmlFor="yapeQrImageUrl">URL HTTPS del QR (opcional)</label>
              <input
                id="yapeQrImageUrl"
                name="yapeQrImageUrl"
                type="url"
                defaultValue={qrIsHttps ? settings.yape.qrImageUrl ?? "" : ""}
                placeholder="https://.../qr-yape.png"
              />
              <small>También puedes subir el QR directamente, sin Cloudinary ni otro servicio.</small>
            </div>
            <div className="formField full">
              <label htmlFor="yapeQrFile">Subir QR desde este equipo</label>
              <input
                id="yapeQrFile"
                name="yapeQrFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
              />
              <small>PNG, JPG o WebP · máximo 500 KB. Se guarda en PostgreSQL para mantener costo S/ 0.</small>
            </div>
          </div>

          {hasStoredQr ? (
            <label className="adminRemoveQr">
              <input type="checkbox" name="removeYapeQr" />
              <span>Eliminar el QR guardado al guardar cambios</span>
            </label>
          ) : null}

          <div className={`adminReadiness ${settings.yape.ready ? "ready" : "pending"}`}>
            {settings.yape.ready ? "Yape está listo para el checkout." : "Yape todavía no tiene datos suficientes para mostrarse al cliente."}
          </div>
        </section>

        <section className="adminCard adminSettingsCard">
          <div className="adminSettingsTitleRow">
            <div>
              <p className="eyebrow wine">PAGO MANUAL</p>
              <h2>Transferencia</h2>
            </div>
            <label className="adminToggle">
              <input type="checkbox" name="transferEnabled" defaultChecked={settings.transfer.enabled} />
              <span>Habilitar</span>
            </label>
          </div>

          <div className="checkoutFormGrid">
            <div className="formField">
              <label htmlFor="bankAccountLabel">Banco / tipo de cuenta</label>
              <input
                id="bankAccountLabel"
                name="bankAccountLabel"
                maxLength={120}
                defaultValue={settings.transfer.label ?? ""}
                placeholder="BCP · Cuenta soles"
              />
            </div>
            <div className="formField">
              <label htmlFor="bankAccountHolder">Titular</label>
              <input
                id="bankAccountHolder"
                name="bankAccountHolder"
                maxLength={160}
                defaultValue={settings.transfer.holder ?? ""}
              />
            </div>
            <div className="formField full">
              <label htmlFor="bankAccountNumber">Número de cuenta / CCI</label>
              <input
                id="bankAccountNumber"
                name="bankAccountNumber"
                maxLength={120}
                defaultValue={settings.transfer.accountNumber ?? ""}
              />
            </div>
          </div>

          <div className={`adminReadiness ${settings.transfer.ready ? "ready" : "pending"}`}>
            {settings.transfer.ready ? "Transferencia está lista para el checkout." : "Transferencia todavía no tiene una cuenta configurada."}
          </div>
        </section>

        <div className="adminSettingsActions">
          <button className="button buttonPrimary" type="submit">Guardar configuración</button>
          <span>Guardar no activa servicios de pago ni genera ningún costo.</span>
        </div>
      </form>
    </main>
  );
}
