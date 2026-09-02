const rowService = require("../services/rowService");

/*
    INSERT
*/
async function insertRow(req, res) {
  try {
    const { tableName } = req.params;

    const data = req.body;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({
        error: "Row data must be an object",
      });
    }

    const result = await rowService.insertRow(req.userId, tableName, data);

    res.status(201).json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
}

/*
    SELECT ALL
*/
async function getRows(req, res) {
  try {
    const { tableName } = req.params;

    const result = await rowService.getRows(req.userId, tableName);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    res.status(404).json({
      error: error.message,
    });
  }
}

/*
    SELECT ONE
*/
async function getRow(req, res) {
  try {
    const { tableName, rowId } = req.params;

    const row = await rowService.getRow(req.userId, tableName, rowId);

    res.json({
      success: true,
      row,
    });
  } catch (error) {
    console.error(error);

    res.status(404).json({
      error: error.message,
    });
  }
}

/*
    UPDATE
*/
async function updateRow(req, res) {
  try {
    const { tableName, rowId } = req.params;

    const result = await rowService.updateRow(req.userId, tableName, rowId, req.body);

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
}

/*
    DELETE
*/
async function deleteRow(req, res) {
  try {
    const { tableName, rowId } = req.params;

    const result = await rowService.deleteRow(req.userId, tableName, rowId);

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
}

module.exports = {
  insertRow,
  getRows,
  getRow,
  updateRow,
  deleteRow,
};
