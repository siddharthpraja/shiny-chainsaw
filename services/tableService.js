const sheetsService = require("./googleSheetsService");

function validateTableName(name) {
  if (!name || typeof name !== "string") {
    throw new Error("Table name is required");
  }

  name = name.trim();

  if (!name) {
    throw new Error("Table name cannot be empty");
  }

  if (name.length > 99) {
    throw new Error("Table name cannot exceed 99 characters");
  }

  return name;
}

async function listTables(userId) {
  return sheetsService.listSheetTitles(userId);
}

async function createTable(userId, tableName, columns = []) {
  tableName = validateTableName(tableName);

  const existing = await sheetsService.listSheetTitles(userId);

  if (existing.includes(tableName)) {
    throw new Error("Table already exists");
  }

  const headers = columns.map((column) =>
    typeof column === "string" ? column : column.name,
  );

  await sheetsService.addSheet(userId, tableName);

  if (headers.length > 0) {
    await sheetsService.setSheetGrid(userId, tableName, [headers]);
  }

  return {
    name: tableName,
    columns: headers,
  };
}

async function dropTable(userId, tableName) {
  tableName = validateTableName(tableName);

  const existing = await sheetsService.listSheetTitles(userId);

  if (!existing.includes(tableName)) {
    throw new Error("Table not found");
  }

  await sheetsService.deleteSheet(userId, tableName);

  return { success: true };
}

async function renameTable(userId, oldName, newName) {
  oldName = validateTableName(oldName);

  newName = validateTableName(newName);

  const existing = await sheetsService.listSheetTitles(userId);

  if (!existing.includes(oldName)) {
    throw new Error("Table not found");
  }

  if (existing.includes(newName)) {
    throw new Error("New table name already exists");
  }

  await sheetsService.renameSheet(userId, oldName, newName);

  return {
    success: true,
    oldName,
    newName,
  };
}

async function getTable(userId, tableName) {
  tableName = validateTableName(tableName);

  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const headers = grid[0] || [];

  const rows = grid.slice(1).map((rowArr) => {
    const row = {};

    headers.forEach((header, index) => {
      row[header] = rowArr[index] ?? "";
    });

    return row;
  });

  return {
    name: tableName,
    columns: headers,
    rows,
  };
}

module.exports = {
  listTables,
  createTable,
  dropTable,
  renameTable,
  getTable,
};
