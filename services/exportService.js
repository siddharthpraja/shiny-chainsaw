const XLSX = require("xlsx");

/*
==================================================
EXPORT TO XLSX
==================================================
*/

function exportXLSX(result) {
  if (!result || !Array.isArray(result.rows)) {
    throw new Error("Invalid query result");
  }

  const rows = result.rows;

  const workbook = XLSX.utils.book_new();

  const sheet = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(workbook, sheet, "Query Result");

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
}

/*
==================================================
EXPORT TO CSV
==================================================
*/

function exportCSV(result) {
  if (!result || !Array.isArray(result.rows)) {
    throw new Error("Invalid query result");
  }

  const rows = result.rows;

  const sheet = XLSX.utils.json_to_sheet(rows);

  const csv = XLSX.utils.sheet_to_csv(sheet);

  return Buffer.from(csv, "utf8");
}

module.exports = {
  exportXLSX,

  exportCSV,
};
