(function () {
  // Build floating PIN widget
  const box = document.createElement("div");
  box.id = "erp-pin-box";
  box.innerHTML = `
    <div style="position:fixed; top:16px; right:16px; z-index:99999; background:#1e293b; color:#f8fafc;
      padding:14px 16px; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.35);
      font-family:system-ui,sans-serif; width:230px;">
      <div style="font-size:13px; font-weight:600; margin-bottom:8px;">⚡ ERP Fast Login</div>
      <input id="erp-pin-input" type="password" inputmode="numeric" maxlength="4"
        placeholder="Enter 4-digit PIN"
        style="width:100%; padding:8px; border-radius:6px; border:1px solid #475569;
        background:#0f172a; color:#fff; font-size:16px; letter-spacing:6px; text-align:center; box-sizing:border-box;" />
      <div id="erp-pin-status" style="font-size:11px; color:#94a3b8; margin-top:8px; min-height:14px;">
        Waiting for PIN...
      </div>
    </div>
  `;
  document.body.appendChild(box);

  const pinInput = document.getElementById("erp-pin-input");
  const statusEl = document.getElementById("erp-pin-status");
  pinInput.focus();

  const setStatus = (msg, isErr = false) => {
    statusEl.textContent = msg;
    statusEl.style.color = isErr ? "#f87171" : "#38bdf8";
  };

  pinInput.addEventListener("input", async () => {
    if (pinInput.value.length !== 4) return;
    const pin = pinInput.value;
    pinInput.disabled = true;

    const { encryptedCreds } = await chrome.storage.local.get("encryptedCreds");
    if (!encryptedCreds) {
      setStatus("Set up credentials in extension popup first.", true);
      pinInput.value = "";
      pinInput.disabled = false;
      return;
    }

    let creds;
    try {
      creds = await CryptoHelper.decrypt(encryptedCreds, pin);
    } catch (e) {
      console.error("[ERP Fast Login] Decrypt error:", e);
      setStatus("Wrong PIN.", true);
      pinInput.value = "";
      pinInput.disabled = false;
      pinInput.focus();
      return;
    }

    try {
      await runLoginFlow(creds);
    } catch (e) {
      console.error("[ERP Fast Login] Flow error:", e);
      setStatus(e.message || "Login flow error.", true);
      pinInput.disabled = false;
    }
  });

  function setInputValue(el, value) {
    el.removeAttribute("readonly");
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function waitForCondition(fn, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (fn()) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          reject(new Error("Timed out waiting for ERP DOM update."));
        }
      }, 150);
    });
  }

  async function runLoginFlow(creds) {
    const userIdEl = document.getElementById("user_id");
    const passEl = document.getElementById("password");
    const questionEl = document.getElementById("question");
    const answerEl = document.getElementById("answer");
    const getOtpBtn = document.getElementById("getotp");
    const otpEl = document.getElementById("email_otp1");
    const submitBtn = document.getElementById("loginFormSubmitButton");

    // 1. Fill User ID to trigger dynamic security question
    setStatus("Fetching security question...");
    setInputValue(userIdEl, creds.userId);

    // 2. Wait for security question text to load & answer input to unlock
    await waitForCondition(() => {
      const qText = questionEl.textContent.trim();
      return qText && qText !== "Security Question" && !answerEl.hasAttribute("readonly");
    });

    // 3. Match security question and fill Password + Answer
    const loadedQ = questionEl.textContent.trim().toLowerCase();
    const matchedKey = Object.keys(creds.securityQA).find((k) =>
      loadedQ.includes(k.trim().toLowerCase())
    );

    if (!matchedKey) {
      setStatus(`No saved answer for: "${questionEl.textContent.trim()}"`, true);
      return;
    }

    setInputValue(passEl, creds.password);
    setInputValue(answerEl, creds.securityQA[matchedKey]);

    // 4. Wait for Get OTP button to be enabled, then click it
    await waitForCondition(() => !getOtpBtn.disabled);
    const clickTime = Date.now();
    setStatus("Requesting OTP...");
    getOtpBtn.click();

    // 5. Poll Gmail via background service worker
    setStatus("Waiting for OTP email...");
    const res = await chrome.runtime.sendMessage({
      type: "FETCH_OTP",
      afterTimestamp: clickTime
    });

    if (!res?.success) {
      setStatus(res?.error || "Failed to fetch OTP.", true);
      return;
    }

    // 6. Fill OTP and submit
    setStatus("OTP found! Logging in...");
    await waitForCondition(() => !otpEl.hasAttribute("readonly"), 5000).catch(() => {});
    setInputValue(otpEl, res.otp);
    submitBtn.click();
  }
})();