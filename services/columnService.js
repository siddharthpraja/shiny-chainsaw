const sheetsService = require("./googleSheetsService");

function validateTableName(tableName) {
  if (!tableName || typeof tableName !== "string") {
    throw new Error("Table name is required");
  }

  return tableName.trim();
}

function validateColumnName(columnName) {
  if (!columnName || typeof columnName !== "string") {
    throw new Error("Column name is required");
  }

  columnName = columnName.trim();

  if (!columnName) {
    throw new Error("Column name cannot be empty");
  }

  return columnName;
}

function findColumnIndex(header, columnName) {
  return header.findIndex(
    (column) => String(column).toLowerCase() === columnName.toLowerCase(),
  );
}

// Mirrors XLSX.utils.encode_col: 0 -> A, 25 -> Z, 26 -> AA, ...
function encodeColumnLetter(index) {
  let letters = "";

  let n = index;

  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;

    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return letters;
}

/*
    ALTER TABLE
    ADD COLUMN
*/
async function addColumn(userId, tableName, columnName, defaultValue = "") {
  tableName = validateTableName(tableName);

  columnName = validateColumnName(columnName);

  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const header = grid[0] ? [...grid[0]] : [];

  if (findColumnIndex(header, columnName) !== -1) {
    throw new Error(`Column '${columnName}' already exists`);
  }

  header.push(columnName);

  const newGrid = [header];

  grid.slice(1).forEach((row) => {
    const newRow = [...row];

    while (newRow.length < header.length - 1) {
      newRow.push("");
    }

    newRow.push(defaultValue);

    newGrid.push(newRow);
  });

  await sheetsService.setSheetGrid(userId, tableName, newGrid);

  return {
    success: true,
    table: tableName,
    column: columnName,
    defaultValue,
  };
}

/*
    ALTER TABLE
    DROP COLUMN
*/
async function dropColumn(userId, tableName, columnName) {
  tableName = validateTableName(tableName);

  columnName = validateColumnName(columnName);

  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const header = grid[0] || [];

  const columnIndex = findColumnIndex(header, columnName);

  if (columnIndex === -1) {
    throw new Error(`Column '${columnName}' not found`);
  }

  const newGrid = grid.map((row) =>
    row.filter((_, index) => index !== columnIndex),
  );

  await sheetsService.setSheetGrid(userId, tableName, newGrid);

  return {
    success: true,
    table: tableName,
    deletedColumn: columnName,
  };
}

/*
    ALTER TABLE
    RENAME COLUMN
*/
async function renameColumn(userId, tableName, oldName, newName) {
  tableName = validateTableName(tableName);

  oldName = validateColumnName(oldName);

  newName = validateColumnName(newName);

  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const header = grid[0] ? [...grid[0]] : [];

  const oldIndex = findColumnIndex(header, oldName);

  if (oldIndex === -1) {
    throw new Error(`Column '${oldName}' not found`);
  }

  if (findColumnIndex(header, newName) !== -1) {
    throw new Error(`Column '${newName}' already exists`);
  }

  header[oldIndex] = newName;

  const newGrid = [header, ...grid.slice(1)];

  await sheetsService.setSheetGrid(userId, tableName, newGrid);

  return {
    success: true,
    table: tableName,
    oldColumn: oldName,
    newColumn: newName,
  };
}

/*
    GET COLUMN INFORMATION
*/
async function getColumnsInfo(userId, tableName) {
  tableName = validateTableName(tableName);

  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const header = grid[0] || [];

  return header.map((name, index) => ({
    index,
    name,
    letter: encodeColumnLetter(index),
  }));
}

module.exports = {
  addColumn,
  dropColumn,
  renameColumn,
  getColumnsInfo,
};
