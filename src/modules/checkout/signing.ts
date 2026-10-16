export function checkoutSigningSecret(secret = process.env.NEXTAUTH_SECRET) {
  if (!secret || secret.length < 32) throw new Error("CHECKOUT_SIGNING_SECRET_REQUIRED");
  return secret;
}
