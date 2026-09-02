// /js/controllers/spreadsheetController.js

export default class SpreadsheetController {
  getToken() {
    return localStorage.getItem("authToken");
  }
  setToken(token) {
    localStorage.setItem("authToken", token);
  }
  removeToken() {
    localStorage.removeItem("authToken");
  }

  constructor(auth) {
    this.auth = auth;

    this.spreadsheet = null;

    this.selectedWorksheet = null;

    this.selectedX = 0;

    this.selectedY = 0;

    this.formulaBar = document.getElementById("formulaBar");

    this.cellName = document.getElementById("cellName");

    this.saveStatus = document.getElementById("saveStatus");
  }

  // =================================================
  // START
  // =================================================

  async start() {
    // ---------------------------------------------
    // Check login
    // ---------------------------------------------

    if (this.auth && typeof this.auth.requireLogin === "function") {
      const user = await this.auth.requireLogin();

      if (!user) {
        return;
      }

      console.log("Logged in user:", user);
    }

    // ---------------------------------------------
    // Load workbook from database
    // ---------------------------------------------

    const workbook = await this.loadWorkbook();

    // ---------------------------------------------
    // Initialize spreadsheet
    // ---------------------------------------------

    this.initSpreadsheet(workbook);

    // ---------------------------------------------
    // Bind buttons/events
    // ---------------------------------------------

    this.bindEvents();
  }

  // =================================================
  // LOAD WORKBOOK FROM API
  // =================================================

  async loadWorkbook() {
    try {
      this.setStatus("Loading...");

      const token = this.getToken();
      if (!token) {
        return null;
      }

      const response = await fetch("/api/workbook", {
        method: "GET",

        credentials: "include",

        headers: { Authorization: `Bearer ${token}` },
      });

      // -----------------------------------------
      // Not logged in
      // -----------------------------------------

      if (response.status === 401) {
        if (this.auth && typeof this.auth.requireLogin === "function") {
          await this.auth.requireLogin();
        }

        return null;
      }

      // -----------------------------------------
      // No workbook yet
      // -----------------------------------------

      if (response.status === 404) {
        console.log("No workbook found. Creating default workbook.");

        return null;
      }

      // -----------------------------------------
      // Other API error
      // -----------------------------------------

      if (!response.ok) {
        throw new Error(`Failed to load workbook: ${response.status}`);
      }

      const result = await response.json();

      console.log("Workbook loaded from API:", result);

      /*
       * Supports either:
       *
       * {
       *   worksheets: [...]
       * }
       *
       * or:
       *
       * {
       *   workbook: {
       *      worksheets: [...]
       *   }
       * }
       */

      if (result && Array.isArray(result.worksheets)) {
        this.setStatus("Loaded");

        return result;
      }

      if (
        result &&
        result.workbook &&
        Array.isArray(result.workbook.worksheets)
      ) {
        this.setStatus("Loaded");

        return result.workbook;
      }

      console.warn("API returned no worksheets.");

      return null;
    } catch (error) {
      console.error("Load workbook failed:", error);

      this.setStatus("Could not load workbook");

      return null;
    }
  }

  // =================================================
  // INITIALIZE SPREADSHEET
  // =================================================

  initSpreadsheet(workbook = null) {
    const element = document.getElementById("spreadsheet");

    if (!element) {
      console.error("Spreadsheet element not found.");

      return;
    }

    // ---------------------------------------------
    // Check Jspreadsheet
    // ---------------------------------------------

    if (typeof jspreadsheet === "undefined") {
      console.error("Jspreadsheet is not loaded.");

      this.setStatus("Jspreadsheet failed to load");

      return;
    }

    // ---------------------------------------------
    // License
    // ---------------------------------------------

    jspreadsheet.setLicense("evaluation");

    // ---------------------------------------------
    // Use DB workbook if available
    // Otherwise create default workbook
    // ---------------------------------------------

    const worksheets =
      workbook &&
      Array.isArray(workbook.worksheets) &&
      workbook.worksheets.length
        ? workbook.worksheets
        : this.defaultWorksheets();

    try {
      this.spreadsheet = jspreadsheet(element, {
        tabs: true,

        toolbar: true,

        worksheets: worksheets,

        // --------------------------------
        // Cell selection
        // --------------------------------

        onselection: (worksheet, x1, y1) => {
          this.selectedWorksheet = worksheet;

          this.selectedX = x1;

          this.selectedY = y1;

          this.updateFormulaBar(worksheet, x1, y1);
        },

        // --------------------------------
        // Cell change
        // --------------------------------

        onchange: () => {
          this.setStatus("Unsaved changes");
        },
      });

      this.setStatus(workbook ? "Loaded" : "New workbook");
    } catch (error) {
      console.error("Failed to initialize Jspreadsheet:", error);

      this.setStatus("Spreadsheet failed to load");
    }
  }

  // =================================================
  // DEFAULT WORKBOOK
  // =================================================

  defaultWorksheets() {
    return [
      {
        worksheetName: "Sheet1",

        minDimensions: [12, 30],

        data: [],

        columns: [],
      },
    ];
  }

  // =================================================
  // GET WORKSHEETS
  // =================================================

  getWorksheets() {
    if (!this.spreadsheet) {
      return [];
    }

    // Jspreadsheet normally exposes
    // worksheet instances as an array.

    if (Array.isArray(this.spreadsheet)) {
      return this.spreadsheet;
    }

    if (Array.isArray(this.spreadsheet.worksheets)) {
      return this.spreadsheet.worksheets;
    }

    if (this.spreadsheet[0]) {
      return [this.spreadsheet[0]];
    }

    return [];
  }

  // =================================================
  // BUILD WORKBOOK
  // =================================================

  getWorkbookData() {
    const worksheets = this.getWorksheets();

    const savedWorksheets = worksheets
      .filter(Boolean)
      .map((worksheet, index) => {
        let data = [];

        try {
          data = worksheet.getData();
        } catch (error) {
          console.error(`Could not get data from Sheet ${index + 1}:`, error);
        }

        return {
          worksheetName:
            worksheet.options?.worksheetName || `Sheet${index + 1}`,

          data: data,

          minDimensions: [12, 30],
        };
      });

    return {
      worksheets: savedWorksheets,
    };
  }

  // =================================================
  // SAVE WORKBOOK TO API
  // =================================================

  async saveWorkbook() {
    if (!this.spreadsheet) {
      console.error("Spreadsheet is not initialized.");

      return;
    }

    try {
      this.setStatus("Saving...");

      // -----------------------------------------
      // Build workbook
      // -----------------------------------------

      const workbook = this.getWorkbookData();

      console.log("Saving workbook:", workbook);

      const token = this.getToken();
      if (!token) {
        return null;
      }

      // -----------------------------------------
      // Send to backend
      // -----------------------------------------

      const response = await fetch("/api/workbook", {
        method: "POST",

        credentials: "include",

        headers: { Authorization: `Bearer ${token}` },

        body: JSON.stringify(workbook),
      });

      // -----------------------------------------
      // Unauthorized
      // -----------------------------------------

      if (response.status === 401) {
        this.setStatus("Session expired");

        if (this.auth && typeof this.auth.requireLogin === "function") {
          await this.auth.requireLogin();
        }

        return;
      }

      // -----------------------------------------
      // API error
      // -----------------------------------------

      if (!response.ok) {
        let message = `Save failed (${response.status})`;

        try {
          const error = await response.json();

          if (error && error.message) {
            message = error.message;
          }
        } catch {
          // Response was not JSON
        }

        throw new Error(message);
      }

      // -----------------------------------------
      // API response
      // -----------------------------------------

      const result = await response.json();

      console.log("Workbook saved successfully:", result);

      this.setStatus("Saved to database " + new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Save workbook failed:", error);

      this.setStatus("Save failed");
    }
  }

  // =================================================
  // FORMULA BAR
  // =================================================

  updateFormulaBar(worksheet, x, y) {
    if (!this.formulaBar || !this.cellName) {
      return;
    }

    this.cellName.textContent = this.getColumnName(x) + (y + 1);

    try {
      const value = worksheet.getValueFromCoords(x, y);

      this.formulaBar.value = value ?? "";
    } catch (error) {
      console.error("Could not read selected cell:", error);

      this.formulaBar.value = "";
    }
  }

  // =================================================
  // COLUMN NAME
  // =================================================

  getColumnName(index) {
    let name = "";

    let number = index + 1;

    while (number > 0) {
      const remainder = (number - 1) % 26;

      name = String.fromCharCode(65 + remainder) + name;

      number = Math.floor((number - 1) / 26);
    }

    return name;
  }

  // =================================================
  // UPDATE SELECTED CELL
  // =================================================

  updateSelectedCell() {
    if (!this.selectedWorksheet || !this.formulaBar) {
      return;
    }

    try {
      this.selectedWorksheet.setValueFromCoords(
        this.selectedX,
        this.selectedY,
        this.formulaBar.value,
      );

      this.setStatus("Unsaved changes");
    } catch (error) {
      console.error("Could not update cell:", error);

      this.setStatus("Update failed");
    }
  }

  // =================================================
  // NEW SHEET
  // =================================================

  newSheet() {
    if (!this.spreadsheet) {
      return;
    }

    try {
      const worksheets = this.getWorksheets();

      const number = worksheets.length + 1;

      this.spreadsheet.createWorksheet({
        worksheetName: `Sheet${number}`,

        minDimensions: [12, 30],
      });

      this.setStatus("New sheet created");
    } catch (error) {
      console.error("Could not create sheet:", error);

      this.setStatus("Could not create sheet");
    }
  }

  // =================================================
  // REFRESH
  // =================================================

  async refresh() {
    this.setStatus("Refreshing...");

    // Reload from server by reloading page.
    window.location.reload();
  }

  // =================================================
  // LOGOUT
  // =================================================

  async logout() {
    // Remove old local workbook if one exists.
    // The real workbook is stored in the DB.
    localStorage.removeItem("myexcel_workbook");

    // Use AuthController.
    if (this.auth && typeof this.auth.logout === "function") {
      await this.auth.logout();
    } else {
      window.location.href = "/login.html";
    }
  }

  // =================================================
  // EVENTS
  // =================================================

  bindEvents() {
    // ---------------------------------------------
    // Save button
    // ---------------------------------------------

    document
      .getElementById("saveButton")
      ?.addEventListener("click", async () => {
        await this.saveWorkbook();
      });

    // ---------------------------------------------
    // New sheet
    // ---------------------------------------------

    document.getElementById("newSheetButton")?.addEventListener("click", () => {
      this.newSheet();
    });

    // ---------------------------------------------
    // Refresh
    // ---------------------------------------------

    document.getElementById("refreshButton")?.addEventListener("click", () => {
      this.refresh();
    });

    // ---------------------------------------------
    // Formula bar
    // ---------------------------------------------

    this.formulaBar?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();

      this.updateSelectedCell();
    });

    // ---------------------------------------------
    // Ctrl + S / Cmd + S
    // ---------------------------------------------

    document.addEventListener("keydown", async (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();

        await this.saveWorkbook();
      }
    });

    // ---------------------------------------------
    // Logout
    // ---------------------------------------------

    document
      .getElementById("logoutButton")
      ?.addEventListener("click", async () => {
        await this.logout();
      });
  }

  // =================================================
  // STATUS
  // =================================================

  setStatus(message) {
    if (this.saveStatus) {
      this.saveStatus.textContent = message;
    }
  }
}
