const sheetsService = require("../services/googleSheetsService");

async function initialize(userId) {
  await sheetsService.createDatabase(userId);
}

async function getWorkbook(userId) {
  return sheetsService.readWorkbook(userId);
}

async function updateWorkbook(userId, workbook) {
  await sheetsService.saveWorkbook(userId, workbook);

  return { success: true };
}

module.exports = {
  initialize,
  getWorkbook,
  updateWorkbook,
};
