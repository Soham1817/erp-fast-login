const CryptoHelper = {
  async deriveKey(pin, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  async encrypt(dataObj, pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(pin, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(dataObj));
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

    return {
      salt: Array.from(salt),
      iv: Array.from(iv),
      cipher: Array.from(new Uint8Array(cipher))
    };
  },

  async decrypt(payload, pin) {
    const salt = new Uint8Array(payload.salt);
    const iv = new Uint8Array(payload.iv);
    const cipher = new Uint8Array(payload.cipher);
    const key = await this.deriveKey(pin, salt);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
};