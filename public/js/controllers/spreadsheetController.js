// /js/controllers/spreadsheetController.js

export default class SpreadsheetController {

   getToken() {
    return localStorage.getItem("authToken");
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
    // Authentication
    // ---------------------------------------------

    if (this.auth) {
      let authenticated = true;

      if (typeof this.auth.requireLogin === "function") {
        const user = await this.auth.requireLogin();

        authenticated = !!user;
      } else if (typeof this.auth.requireAuth === "function") {
        authenticated = await this.auth.requireAuth();
      }

      if (!authenticated) {
        return;
      }
    }

    // ---------------------------------------------
    // Load workbook
    // ---------------------------------------------

    const workbook = await this.loadWorkbook();

    // ---------------------------------------------
    // Initialize spreadsheet
    // ---------------------------------------------

    this.initSpreadsheet(workbook);

    // ---------------------------------------------
    // Events
    // ---------------------------------------------

    this.bindEvents();
  }

  // =================================================
  // LOAD WORKBOOK
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

        headers: { Authorization: `Bearer ${token}` }
      });

      // -----------------------------------------
      // Unauthorized
      // -----------------------------------------

      if (response.status === 401) {
        this.setStatus("Session expired");

        if (this.auth && typeof this.auth.requireLogin === "function") {
          const user = await this.auth.requireLogin();

          if (!user) {
            return null;
          }

          return await this.loadWorkbook();
        }

        return null;
      }

      // -----------------------------------------
      // No workbook
      // -----------------------------------------

      if (response.status === 404) {
        console.log("No workbook found.");

        this.setStatus("New workbook");

        return null;
      }

      // -----------------------------------------
      // API error
      // -----------------------------------------

      if (!response.ok) {
        throw new Error(`Failed to load workbook: ${response.status}`);
      }

      // -----------------------------------------
      // JSON
      // -----------------------------------------

      const result = await response.json();

      console.log("Workbook received from API:", result);

      // -----------------------------------------
      // API format:
      //
      // {
      //     Sheet1: [...],
      //     Sheet2: [...]
      // }
      // -----------------------------------------

      if (
        result &&
        typeof result === "object" &&
        !Array.isArray(result) &&
        !result.worksheets &&
        !result.workbook
      ) {
        const worksheets = Object.entries(result).map(([sheetName, data]) => {
          return {
            worksheetName: String(sheetName).substring(0, 31),

            minDimensions: [12, 30],

            data: Array.isArray(data) ? data : [],

            columns: [],
          };
        });

        if (worksheets.length > 0) {
          this.setStatus("Loaded");

          return {
            worksheets: worksheets,
          };
        }
      }

      // -----------------------------------------
      // Jspreadsheet worksheets format
      // -----------------------------------------

      if (result && Array.isArray(result.worksheets)) {
        this.setStatus("Loaded");

        return result;
      }

      // -----------------------------------------
      // Nested workbook
      // -----------------------------------------

      if (
        result &&
        result.workbook &&
        Array.isArray(result.workbook.worksheets)
      ) {
        this.setStatus("Loaded");

        return result.workbook;
      }

      console.warn("Unsupported workbook format:", result);

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
    // Check Formula Pro
    // ---------------------------------------------

    if (typeof formula === "undefined") {
      console.error("Formula Pro is not loaded.");

      this.setStatus("Formula engine failed to load");

      return;
    }

    // ---------------------------------------------
    // License
    // ---------------------------------------------

    // jspreadsheet.setLicense(
    //     "evaluation"
    // );

    // ---------------------------------------------
    // Worksheets
    // ---------------------------------------------

    const worksheets =
      workbook &&
      Array.isArray(workbook.worksheets) &&
      workbook.worksheets.length > 0
        ? workbook.worksheets
        : this.defaultWorksheets();

    try {
      // -----------------------------------------
      // Create spreadsheet
      // -----------------------------------------

      this.spreadsheet = jspreadsheet(element, {
        tabs: true,

        toolbar: false,

        worksheets: worksheets,

        // --------------------------------
        // Selection
        // --------------------------------

        onselection: (worksheet, x1, y1) => {
          this.selectedWorksheet = worksheet;

          this.selectedX = Number(x1);

          this.selectedY = Number(y1);

          this.updateFormulaBar(worksheet, Number(x1), Number(y1));
        },

        onbeforepaste: (worksheet, data, x, y) => {
          return data.map(row =>
            row.map(value => {
              if (value === null || value === undefined) {
                return "";
              }

              const text = String(value);

              // Keep DD-MM-YYYY as TEXT
              if (/^\d{2}-\d{2}-\d{4}(?:\s+\d{1,2}:\d{2}:\d{2})?$/.test(text)) {
                return "'" + text;
              }

              return value;
            })
          );
        },

        // --------------------------------
        // Cell changed
        // --------------------------------

        onchange: (worksheet, cell, x, y, value) => {
          // console.log(
          //     "Cell changed:",
          //     {
          //         cell,
          //         x:
          //             Number(x),
          //         y:
          //             Number(y),
          //         value
          //     }
          // );

          this.setStatus("Unsaved changes");
        },

        // --------------------------------
        // Formula error
        // --------------------------------

        onerror: (worksheet, cell, message) => {
          console.error("Formula error:", {
            worksheet,
            cell,
            message,
          });
        },
      });

      // -----------------------------------------
      // Get worksheets
      // -----------------------------------------

      const worksheetsList = this.getWorksheets();

      // -----------------------------------------
      // Select first worksheet
      // -----------------------------------------

      if (worksheetsList.length > 0) {
        this.selectedWorksheet = worksheetsList[0];

        this.selectedX = 0;

        this.selectedY = 0;

        this.updateFormulaBar(worksheetsList[0], 0, 0);
      }

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

        data: [
          ["Product", "Quantity", "Price", "Total"],

          ["Apple", 10, 50, "=B2*C2"],

          ["Mango", 5, 80, "=B3*C3"],

          ["Banana", 20, 30, "=B4*C4"],

          ["", "", "Grand Total", "=SUM(D2:D4)"],
        ],

        columns: [
          {
            type: "text",
            width: 150,
          },

          {
            type: "numeric",
            width: 100,
          },

          {
            type: "numeric",
            width: 100,
          },

          {
            type: "numeric",
            width: 120,
          },
        ],
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
  // BUILD API WORKBOOK
  // =================================================

getWorkbookData() {
  const worksheets = this.getWorksheets();

  const workbook = {
    worksheets: []
  };

  worksheets
    .filter(Boolean)
    .forEach((worksheet, index) => {
      let data = [];

      try {
        data = worksheet.getData(false, false);
      } catch (error) {
        console.error(
          `Could not get data from Sheet ${index + 1}:`,
          error
        );
      }

      let worksheetName = `Sheet${index + 1}`;
      let minDimensions = [12, 30];
      let columns = [];

      try {
        if (worksheet.options) {
          worksheetName =
            worksheet.options.worksheetName ||
            worksheet.options.title ||
            worksheetName;

          minDimensions =
            worksheet.options.minDimensions ||
            minDimensions;

          columns =
            worksheet.options.columns ||
            [];
        }
      } catch (error) {
        console.warn(
          `Could not read options from Sheet ${index + 1}:`,
          error
        );
      }

      workbook.worksheets.push({
        worksheetName: String(worksheetName).substring(0, 31),
        minDimensions,
        data: Array.isArray(data) ? data : [],
        columns: Array.isArray(columns) ? columns : []
      });
    });

  console.log(
    "Final workbook:",
    JSON.stringify(workbook, null, 2)
  );

  return workbook;
}


  // =================================================
  // SAVE WORKBOOK
  // =================================================

async saveWorkbook() {
  if (!this.spreadsheet) {
    console.error("Spreadsheet is not initialized.");
    return;
  }

  try {
    this.setStatus("Saving...");

    const workbook = this.getWorkbookData();

    console.log("Workbook before save:", workbook);
    console.log(
      "Workbook JSON:",
      JSON.stringify(workbook, null, 2)
    );

    if (
      !workbook ||
      typeof workbook !== "object" ||
      !Array.isArray(workbook.worksheets)
    ) {
      console.error("Invalid workbook:", workbook);
      this.setStatus("Invalid workbook");
      return;
    }

    const token = this.getToken();

    if (!token) {
      this.setStatus("Authentication required");
      return;
    }

    const response = await fetch("/api/workbook", {
      method: "POST",

      credentials: "include",

      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify(workbook)
    });

    if (response.status === 401) {
      this.setStatus("Session expired");

      if (
        this.auth &&
        typeof this.auth.requireLogin === "function"
      ) {
        await this.auth.requireLogin();
      }

      return;
    }

    if (!response.ok) {
      let message = `Save failed (${response.status})`;

      try {
        const error = await response.json();

        if (error && (error.message || error.error)) {
          message = error.message || error.error;
        }
      } catch {
        // Response was not JSON
      }

      throw new Error(message);
    }

    const result = await response.json();

    console.log("Workbook saved:", result);

    this.setStatus(
      "Saved to database " +
      new Date().toLocaleTimeString()
    );

  } catch (error) {
    console.error("Save workbook failed:", error);

    this.setStatus("Save failed");
  }
}
  // =================================================
  // FORMULA BAR
  // =================================================

  updateFormulaBar(worksheet, x, y) {
    if (!this.formulaBar || !this.cellName || !worksheet) {
      return;
    }

    x = Number(x);

    y = Number(y);

    // ---------------------------------------------
    // Cell name
    // ---------------------------------------------

    this.cellName.textContent = this.getColumnName(x) + (y + 1);

    try {
      let value = "";

      if (typeof worksheet.getValueFromCoords === "function") {
        // processed = false
        // raw = true
        //
        // This gives us the actual formula
        // instead of the calculated result.

        value = worksheet.getValueFromCoords(x, y, false, true);
      }

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

    let number = Number(index) + 1;

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
      const x = Number(this.selectedX);

      const y = Number(this.selectedY);

      const value = this.formulaBar.value;

      // console.log(
      //     "Updating selected cell:",
      //     {
      //         x,
      //         y,
      //         value
      //     }
      // );

      this.selectedWorksheet.setValueFromCoords(x, y, value);

      this.setStatus("Unsaved changes");
    } catch (error) {
      console.error("Could not update cell:", error);

      this.setStatus("Update failed");
    }
  }

  // =================================================
  // NEW SHEET
  // =================================================

  async newSheet() {
    if (!this.spreadsheet) {
      return;
    }

    try {
      const worksheets = this.getWorksheets();

      const number = worksheets.length + 1;

      const result = this.spreadsheet.createWorksheet({
        worksheetName: `Sheet${number}`,

        minDimensions: [12, 30],
      });

      if (result && typeof result.then === "function") {
        await result;
      }

      this.setStatus("New sheet created");
    } catch (error) {
      console.error("Could not create sheet:", error);

      this.setStatus("Could not create sheet");
    }
  }

  // =================================================
  // REFRESH
  // =================================================

  refresh() {
    window.location.reload();
  }

  // =================================================
  // LOGOUT
  // =================================================

  async logout() {
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
    // Save
    // ---------------------------------------------

    document
      .getElementById("saveButton")
      ?.addEventListener("click", async () => {
        await this.saveWorkbook();
      });

    // ---------------------------------------------
    // New sheet
    // ---------------------------------------------

    document
      .getElementById("newSheetButton")
      ?.addEventListener("click", async () => {
        await this.newSheet();
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
