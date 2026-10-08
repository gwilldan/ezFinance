import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12
const TAG_BYTES = 16

/** AES-256 key from REPORT_ENCRYPTION_KEY (e.g. `openssl rand -base64 32`). */
function key() {
  const secret = process.env.REPORT_ENCRYPTION_KEY
  if (!secret) throw new Error("REPORT_ENCRYPTION_KEY is not configured.")
  return createHash("sha256").update(secret).digest()
}

/** Encrypts a value as base64 `iv | tag | ciphertext`. */
export function encryptJson(value: unknown) {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key(), iv)
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")
}

export function decryptJson<T>(encoded: string): T {
  const buffer = Buffer.from(encoded, "base64")
  const decipher = createDecipheriv(
    ALGORITHM,
    key(),
    buffer.subarray(0, IV_BYTES)
  )
  decipher.setAuthTag(buffer.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))
  const data = Buffer.concat([
    decipher.update(buffer.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ])
  return JSON.parse(data.toString("utf8")) as T
}
