const toHex = (buffer: ArrayBuffer | Uint8Array) => {
  const view = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  return Array.from(view)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const getCrypto = async () => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto;
  }

  const nodeCrypto = await import('crypto');
  return nodeCrypto.webcrypto as Crypto;
};

export async function sha256FromBuffer(input: ArrayBuffer | Buffer): Promise<string> {
  const runtimeCrypto = await getCrypto();
  const buffer = input instanceof ArrayBuffer ? input : input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  const digest = await runtimeCrypto.subtle.digest('SHA-256', buffer);
  return toHex(digest);
}

export async function sha256FromFile(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return sha256FromBuffer(arrayBuffer);
}
