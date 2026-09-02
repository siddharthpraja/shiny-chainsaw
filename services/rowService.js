const sheetsService = require("./googleSheetsService");

function getData(grid) {
  if (!grid || grid.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = grid[0] || [];

  const rows = grid.slice(1).map((rowArr, index) => {
    const row = { _rowId: index + 1 };

    columns.forEach((column, columnIndex) => {
      row[column] = rowArr[columnIndex] ?? "";
    });

    return row;
  });

  return { columns, rows };
}

function buildGrid(columns, rows) {
  const output = [columns];

  rows.forEach((row) => {
    output.push(columns.map((column) => row[column] ?? ""));
  });

  return output;
}

/*
    INSERT
*/
async function insertRow(userId, tableName, data) {
  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const { columns, rows } = getData(grid);

  if (!columns.length) {
    throw new Error("Table has no columns");
  }

  const row = {};

  columns.forEach((column) => {
    row[column] = data[column] ?? "";
  });

  rows.push(row);

  await sheetsService.setSheetGrid(userId, tableName, buildGrid(columns, rows));

  return {
    success: true,
    row,
  };
}

/*
    SELECT ALL
*/
async function getRows(userId, tableName) {
  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const { columns, rows } = getData(grid);

  return {
    table: tableName,
    columns,
    rows,
  };
}

/*
    SELECT BY ID
*/
async function getRow(userId, tableName, rowId) {
  const result = await getRows(userId, tableName);

  const row = result.rows.find((row) => String(row._rowId) === String(rowId));

  if (!row) {
    throw new Error("Row not found");
  }

  return row;
}

/*
    UPDATE
*/
async function updateRow(userId, tableName, rowId, data) {
  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const { columns, rows } = getData(grid);

  const index = rows.findIndex((row) => String(row._rowId) === String(rowId));

  if (index === -1) {
    throw new Error("Row not found");
  }

  columns.forEach((column) => {
    if (Object.prototype.hasOwnProperty.call(data, column)) {
      rows[index][column] = data[column];
    }
  });

  await sheetsService.setSheetGrid(userId, tableName, buildGrid(columns, rows));

  return {
    success: true,
    row: rows[index],
  };
}

/*
    DELETE
*/
async function deleteRow(userId, tableName, rowId) {
  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const { columns, rows } = getData(grid);

  const index = rows.findIndex((row) => String(row._rowId) === String(rowId));

  if (index === -1) {
    throw new Error("Row not found");
  }

  const deleted = rows[index];

  rows.splice(index, 1);

  await sheetsService.setSheetGrid(userId, tableName, buildGrid(columns, rows));

  return {
    success: true,
    deleted,
  };
}

module.exports = {
  insertRow,
  getRows,
  getRow,
  updateRow,
  deleteRow,
};
