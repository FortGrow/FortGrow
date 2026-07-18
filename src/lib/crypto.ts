/**
 * Criptografia de credenciais em repouso (AES-256-GCM).
 * A chave deriva do AUTH_SECRET — o mesmo segredo já usado pelas sessões.
 * Valores criptografados têm o prefixo "enc:v1:" (iv:tag:payload em base64).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function key(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "fortgrow-dev-secret";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Descriptografa; aceita valores antigos em texto puro (compatibilidade). */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return value; // legado sem criptografia
  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(":");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Máscara para exibição (nunca mostrar o token inteiro). */
export function maskSecret(plain: string | null): string {
  if (!plain) return "—";
  return plain.length <= 8 ? "••••" : `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
}
