const msg = document.getElementById("msg");

document.getElementById("saveBtn").addEventListener("click", async () => {
  const pin = document.getElementById("pin").value.trim();
  if (!/^\d{4}$/.test(pin)) {
    msg.textContent = "PIN must be exactly 4 digits.";
    return;
  }

  const securityQA = {};
  for (let i = 1; i <= 3; i++) {
    const q = document.getElementById(`q${i}`).value.trim();
    const a = document.getElementById(`a${i}`).value.trim();
    if (q && a) securityQA[q] = a;
  }

  const creds = {
    userId: document.getElementById("userId").value.trim(),
    password: document.getElementById("password").value,
    securityQA
  };

  const encryptedCreds = await CryptoHelper.encrypt(creds, pin);
  await chrome.storage.local.set({ encryptedCreds });
  msg.textContent = "Encrypted & saved locally!";
});

document.getElementById("authBtn").addEventListener("click", async () => {
  msg.textContent = "Opening Google sign-in...";
  const res = await chrome.runtime.sendMessage({ type: "AUTH_GMAIL" });
  msg.textContent = res?.success ? "Gmail connected!" : `Auth error: ${res?.error}`;
});