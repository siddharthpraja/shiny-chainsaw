const { google } = require("googleapis");

const userModel = require("../models/userModel");

const { getAuthorizedClient } = require("./googleAuthService");

// Matches the DD-MM-YYYY (optionally with time) format the app wants to
// keep as literal text instead of letting Sheets auto-convert it to a date.
const DATE_TEXT_PATTERN =
  /^\d{2}-\d{2}-\d{4}(?:\s+\d{1,2}:\d{2}:\d{2})?$/;

/*
==================================================
GET AN AUTHORIZED sheets/drive CLIENT FOR A USER
==================================================
*/
async function getSheetsClient(userId) {
  const user = userModel.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const auth = await getAuthorizedClient(user);

  return google.sheets({ version: "v4", auth });
}

function getSpreadsheetId(userId) {
  const user = userModel.findById(userId);

  if (!user || !user.spreadsheetId) {
    throw new Error(
      "No spreadsheet linked to this account yet. Please sign in with Google again.",
    );
  }

  return user.spreadsheetId;
}

/*
==================================================
CREATE DATABASE (spreadsheet)

Called once, right after a user first signs in with Google.
==================================================
*/
async function createDatabase(userId) {
  const user = userModel.findById(userId);

  if (user && user.spreadsheetId) {
    return user.spreadsheetId; // already provisioned
  }

  const auth = await getAuthorizedClient(user);

  const sheets = google.sheets({ version: "v4", auth });

  const { data } = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `MyExcelDB - ${user.name || user.email}`,
      },
      sheets: [
        {
          properties: { title: "Sheet1" },
        },
      ],
    },
  });

  const spreadsheetId = data.spreadsheetId;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Product", "Quantity", "Price", "Total"],
        ["Apple", 10, 50, "=B2*C2"],
        ["Mango", 5, 80, "=B3*C3"],
        ["Banana", 20, 30, "=B4*C4"],
        ["", "", "Grand Total", "=SUM(D2:D4)"],
      ],
    },
  });

  userModel.updateUser(userId, { spreadsheetId });

  return spreadsheetId;
}

/*
==================================================
LIST SHEET (TABLE) TITLES
==================================================
*/
async function listSheetTitles(userId) {
  const sheets = await getSheetsClient(userId);

  const spreadsheetId = getSpreadsheetId(userId);

  const { data } = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  return (data.sheets || []).map((sheet) => sheet.properties.title);
}

async function getSheetMeta(userId) {
  const sheets = await getSheetsClient(userId);

  const spreadsheetId = getSpreadsheetId(userId);

  const { data } = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  return data.sheets || [];
}

async function getSheetIdByTitle(userId, title) {
  const meta = await getSheetMeta(userId);

  const sheet = meta.find((item) => item.properties.title === title);

  if (!sheet) {
    throw new Error(`Table '${title}' not found`);
  }

  return sheet.properties.sheetId;
}

/*
==================================================
READ A SHEET AS A 2D GRID (formulas kept as "=...")
==================================================
*/
async function getSheetGrid(userId, title) {
  const sheets = await getSheetsClient(userId);

  const spreadsheetId = getSpreadsheetId(userId);

  let response;

  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${title}'`,
      valueRenderOption: "FORMULA",
    });
  } catch (error) {
    if (error.code === 400 || error.code === 404) {
      throw new Error(`Table '${title}' not found`);
    }

    throw error;
  }

  return response.data.values || [];
}

/*
==================================================
WRITE A 2D GRID BACK TO A SHEET

Clears the sheet first so shrinking (fewer rows/cols,
dropped columns, deleted rows) is reflected correctly.
==================================================
*/
async function setSheetGrid(userId, title, grid) {
  const sheets = await getSheetsClient(userId);

  const spreadsheetId = getSpreadsheetId(userId);

  const safeGrid = (Array.isArray(grid) ? grid : []).map((row) => {
    if (!Array.isArray(row)) {
      return [];
    }

    return row.map((value) => {
      // Keep DD-MM-YYYY strings as literal text (leading apostrophe
      // tells Sheets "don't try to parse this as a date/number").
      if (typeof value === "string" && DATE_TEXT_PATTERN.test(value)) {
        return `'${value}`;
      }

      return value;
    });
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${title}'`,
  });

  if (safeGrid.length === 0) {
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: safeGrid,
    },
  });
}

/*
==================================================
ADD SHEET (CREATE TABLE)
==================================================
*/
async function addSheet(userId, title) {
  const sheets = await getSheetsClient(userId);

  const spreadsheetId = getSpreadsheetId(userId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
}

/*
==================================================
DELETE SHEET (DROP TABLE)
==================================================
*/
async function deleteSheet(userId, title) {
  const sheetId = await getSheetIdByTitle(userId, title);

  const sheets = await getSheetsClient(userId);

  const spreadsheetId = getSpreadsheetId(userId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ deleteSheet: { sheetId } }],
    },
  });
}

/*
==================================================
RENAME SHEET (RENAME TABLE)
==================================================
*/
async function renameSheet(userId, oldTitle, newTitle) {
  const sheetId = await getSheetIdByTitle(userId, oldTitle);

  const sheets = await getSheetsClient(userId);

  const spreadsheetId = getSpreadsheetId(userId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId, title: newTitle },
            fields: "title",
          },
        },
      ],
    },
  });
}

/*
==================================================
FULL WORKBOOK READ (all sheets -> grids)

Matches the {worksheets:[{worksheetName,data,...}]} shape
the frontend spreadsheet editor already expects.
==================================================
*/
async function readWorkbook(userId) {
  const user = userModel.findById(userId);

  if (!user || !user.spreadsheetId) {
    await createDatabase(userId);
  }

  const titles = await listSheetTitles(userId);

  const worksheets = [];

  for (const title of titles) {
    const grid = await getSheetGrid(userId, title);

    worksheets.push({
      worksheetName: title,
      minDimensions: [12, 30],
      data: grid,
      columns: [],
    });
  }

  return { worksheets };
}

/*
==================================================
FULL WORKBOOK SAVE

Rebuilds the spreadsheet's sheet list to match `data.worksheets`
exactly (adds missing sheets, removes ones no longer present),
then overwrites the values of every sheet.
==================================================
*/
async function saveWorkbook(userId, data) {
  const worksheets =
    data && Array.isArray(data.worksheets) ? data.worksheets : [];

  const desiredTitles = worksheets.map((sheet) =>
    String(sheet.worksheetName || "Sheet1").substring(0, 99),
  );

  const existingTitles = await listSheetTitles(userId);

  // Add any missing sheets first (so we're never left with zero sheets)
  for (const title of desiredTitles) {
    if (!existingTitles.includes(title)) {
      await addSheet(userId, title);
    }
  }

  // Remove sheets that are no longer part of the workbook
  for (const title of existingTitles) {
    if (!desiredTitles.includes(title)) {
      await deleteSheet(userId, title);
    }
  }

  // Write values for every sheet
  for (const worksheet of worksheets) {
    if (!worksheet || typeof worksheet !== "object") {
      continue;
    }

    const title = String(worksheet.worksheetName || "Sheet1").substring(
      0,
      99,
    );

    const grid = Array.isArray(worksheet.data) ? worksheet.data : [];

    await setSheetGrid(userId, title, grid);
  }
}

module.exports = {
  createDatabase,
  listSheetTitles,
  getSheetIdByTitle,
  getSheetGrid,
  setSheetGrid,
  addSheet,
  deleteSheet,
  renameSheet,
  readWorkbook,
  saveWorkbook,
};
