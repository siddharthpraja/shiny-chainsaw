import DashboardView from "../views/dashboardView.js";

export default class DashboardController {
  constructor(authController) {
    this.auth = authController;
    this.view = new DashboardView();

    // Keep reference so we can clear it
    this.countdownInterval = null;
  }

  // ==================================================
  // TOKEN
  // ==================================================

  getToken() {
    return localStorage.getItem("authToken");
  }

  getTokenExp() {
    return localStorage.getItem("authTokenExp");
  }

  getTokenLog() {
    return localStorage.getItem("loginAtDate");
  }

  // ==================================================
  // START
  // ==================================================

  async start() {
    const user =
      await this.auth.requireLogin();

    if (!user) {
      return;
    }

    const token = this.getToken();

    this.view.showUser(user);

    // ==================================================
    // API KEY
    // ==================================================

    const apiKeyInput =
      document.getElementById("apiKey");

    if (apiKeyInput) {
      apiKeyInput.value = token || "";
    }

    // ==================================================
    // COUNTDOWN
    // ==================================================

    this.startCountdown();

    // ==================================================
    // LOGOUT
    // ==================================================

    const logoutButton =
      document.getElementById("logoutButton");

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        () => {
          this.auth.logout();
        }
      );
    }

    // ==================================================
    // OPEN SPREADSHEET
    // ==================================================

    const spreadsheetButton =
      document.getElementById(
        "openSpreadsheet"
      );

    if (spreadsheetButton) {
      spreadsheetButton.addEventListener(
        "click",
        () => {
          window.location.href =
            "/spreadsheet.html";
        }
      );
    }

    // ==================================================
    // SHOW / HIDE API KEY
    // ==================================================

    const toggleApiKey =
      document.getElementById(
        "toggleApiKey"
      );

    if (toggleApiKey) {
      toggleApiKey.addEventListener(
        "click",
        () => {
          if (
            apiKeyInput.type ===
            "password"
          ) {
            apiKeyInput.type = "text";

            toggleApiKey.textContent =
              "Hide API Key";
          } else {
            apiKeyInput.type =
              "password";

            toggleApiKey.textContent =
              "Show API Key";
          }
        }
      );
    }

    // ==================================================
    // COPY API KEY
    // ==================================================

    const copyApiKey =
      document.getElementById(
        "copyApiKey"
      );

    if (copyApiKey) {
      copyApiKey.addEventListener(
        "click",
        async () => {
          if (!apiKeyInput.value) {
            return;
          }

          try {
            await navigator.clipboard.writeText(
              apiKeyInput.value
            );

            const originalText =
              copyApiKey.textContent;

            copyApiKey.textContent =
              "Copied!";

            setTimeout(() => {
              copyApiKey.textContent =
                originalText;
            }, 1500);
          } catch (error) {
            console.error(
              "Copy failed:",
              error
            );
          }
        }
      );
    }
  }

  // ==================================================
  // COUNTDOWN
  // ==================================================

  startCountdown() {
    const countdown =
      document.getElementById(
        "expiresCountdown"
      );

    if (!countdown) {
      return;
    }

    const expDate =
      this.getTokenExp();

    // No expiry
    if (!expDate) {
      countdown.textContent =
        "Inactive";

      return;
    }

    // Convert stored expiry to timestamp
    const expiryTime =
      new Date(expDate).getTime();

    // Invalid expiry
    if (isNaN(expiryTime)) {
      countdown.textContent =
        "Invalid expiry";

      return;
    }

    // Clear old interval
    if (this.countdownInterval) {
      clearInterval(
        this.countdownInterval
      );
    }

    const updateCountdown = () => {
      // Current time
      const now = Date.now();

      // Remaining milliseconds
      const remaining =
        expiryTime - now;

      // ==================================================
      // EXPIRED
      // ==================================================

      if (remaining <= 0) {
        countdown.textContent =
          "Expired";

        countdown.classList.remove(
          "text-green-600"
        );

        countdown.classList.add(
          "text-red-600"
        );

        clearInterval(
          this.countdownInterval
        );

        return;
      }

      // ==================================================
      // REMAINING TIME
      // ==================================================

      const totalSeconds =
        Math.floor(
          remaining / 1000
        );

      const days =
        Math.floor(
          totalSeconds / 86400
        );

      const hours =
        Math.floor(
          (totalSeconds % 86400) /
            3600
        );

      const minutes =
        Math.floor(
          (totalSeconds % 3600) /
            60
        );

      const seconds =
        totalSeconds % 60;

      countdown.textContent =
        `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    // Run immediately
    updateCountdown();

    // Update every second
    this.countdownInterval =
      setInterval(
        updateCountdown,
        1000
      );
  }
}
