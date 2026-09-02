const workbookModel = require("../models/workbookModel");

async function getWorkbook(req, res) {
  try {
    const workbook = await workbookModel.getWorkbook(req.userId);

    res.json(workbook);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to load workbook",
    });
  }
}

async function saveWorkbook(req, res) {
  try {
    const workbook = req.body;

    // -----------------------------
    // Validate body
    // -----------------------------

    if (!workbook) {
      return res.status(400).json({
        success: false,
        error: "Request body is empty"
      });
    }

    if (
      typeof workbook !== "object" ||
      Array.isArray(workbook)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid workbook object"
      });
    }

    if (!Array.isArray(workbook.worksheets)) {
      return res.status(400).json({
        success: false,
        error: "Invalid workbook: worksheets must be an array"
      });
    }

    // -----------------------------
    // Save
    // -----------------------------

    await workbookModel.updateWorkbook(
      req.userId,
      workbook
    );



    return res.json({
      success: true
    });

  } catch (error) {
    console.error(
      "Save workbook error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to save workbook"
    });
  }
}

module.exports = {
  getWorkbook,
  saveWorkbook,
};
