(function () {
  const originalAlert = window.alert;
  window.alert = function (msg) {
    if (typeof msg === "string" && /otp/i.test(msg)) {
      console.log("[ERP Fast Login] Suppressed alert:", msg);
      return;
    }
    return originalAlert.apply(this, arguments);
  };
})();