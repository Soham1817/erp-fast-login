chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "FETCH_OTP") {
    pollForOTP(req.afterTimestamp)
      .then((otp) => sendResponse({ success: true, otp }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep message channel open
  }

  if (req.type === "AUTH_GMAIL") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }
});

function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || "Gmail auth failed"));
      } else {
        resolve(token);
      }
    });
  });
}

async function pollForOTP(afterMs, maxAttempts = 25, intervalMs = 1500) {
  const token = await getAuthToken(true);
  const afterSec = Math.floor(afterMs / 1000) - 5; // 5s buffer for clock skew
  const query = encodeURIComponent(`(OTP OR ERP) after:${afterSec}`);

  for (let i = 0; i < maxAttempts; i++) {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const listData = await listRes.json();

    if (listData.messages && listData.messages.length > 0) {
      for (const msg of listData.messages) {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const msgData = await msgRes.json();

        // Ensure email actually arrived after clicking Get OTP
        if (Number(msgData.internalDate) < afterMs - 5000) continue;

        const text = msgData.snippet || "";
        const match = text.match(/\b(\d{6})\b/); // 6-digit OTP
        if (match) return match[1];
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for OTP email.");
}