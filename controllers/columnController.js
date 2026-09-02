const columnService = require("../services/columnService");

/*
    GET COLUMNS
*/
async function getColumns(req, res) {
  try {
    const { tableName } = req.params;

    const columns = await columnService.getColumnsInfo(req.userId, tableName);

    res.json({
      success: true,

      table: tableName,

      columns,
    });
  } catch (error) {
    console.error(error);

    res.status(404).json({
      error: error.message,
    });
  }
}

/*
    ADD COLUMN
*/
async function addColumn(req, res) {
  try {
    const { tableName } = req.params;

    const { name, defaultValue = "" } = req.body;

    const result = await columnService.addColumn(
      req.userId,

      tableName,

      name,

      defaultValue,
    );

    res.status(201).json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
}

/*
    DROP COLUMN
*/
async function dropColumn(req, res) {
  try {
    const { tableName, columnName } = req.params;

    const result = await columnService.dropColumn(
      req.userId,

      tableName,

      columnName,
    );

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
}

/*
    RENAME COLUMN
*/
async function renameColumn(req, res) {
  try {
    const { tableName, columnName } = req.params;

    const { name } = req.body;

    const result = await columnService.renameColumn(
      req.userId,

      tableName,

      columnName,

      name,
    );

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
}

module.exports = {
  getColumns,

  addColumn,

  dropColumn,

  renameColumn,
};
