import * as ed25519 from "@noble/ed25519";

export interface DeviceIdentity {
  deviceId: string;
  publicKey: string;
  privateKey: string;
}

interface StoredIdentity {
  version: 1;
  deviceId: string;
  publicKey: string;
  privateKey: string;
}

const STORAGE_KEY = "openclaw-device-identity-v1";

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeDeviceId(publicKeyBytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", publicKeyBytes as unknown as ArrayBuffer);
  return toHex(new Uint8Array(hash));
}

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed: StoredIdentity = JSON.parse(stored);
      if (parsed.version === 1 && parsed.deviceId && parsed.publicKey && parsed.privateKey) {
        return { deviceId: parsed.deviceId, publicKey: parsed.publicKey, privateKey: parsed.privateKey };
      }
    } catch {
      // regenerate on corrupt data
    }
  }

  const privateKeyBytes = ed25519.utils.randomSecretKey();
  const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);
  const deviceId = await computeDeviceId(publicKeyBytes);
  const publicKey = toBase64Url(publicKeyBytes);
  const privateKey = toBase64Url(privateKeyBytes);

  const entry: StoredIdentity = { version: 1, deviceId, publicKey, privateKey };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));

  return { deviceId, publicKey, privateKey };
}

export interface SignChallengeParams {
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  token: string;
  nonce: string;
}

export interface SignedChallenge {
  signature: string;
  signedAt: number;
}

export async function signChallenge(
  identity: DeviceIdentity,
  params: SignChallengeParams,
): Promise<SignedChallenge> {
  const signedAt = Date.now();
  const scopesJoined = params.scopes.join(",");
  const token = params.token || "";
  const payload = [
    "v2",
    identity.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopesJoined,
    String(signedAt),
    token,
    params.nonce,
  ].join("|");

  const messageBytes = new TextEncoder().encode(payload);
  const privateKeyBytes = fromBase64Url(identity.privateKey);
  const sigBytes = await ed25519.signAsync(messageBytes, privateKeyBytes);
  const signature = toBase64Url(sigBytes);

  return { signature, signedAt };
}
