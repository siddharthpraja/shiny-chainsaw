const queryService = require("../services/queryService");

const exportService = require("../services/exportService");

/*
==================================================
EXPORT XLSX
==================================================
*/

async function exportXLSX(req, res) {
  try {
    const userId = req.userId || req.session.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    /*
        Execute query
        */

    const result = await queryService.query(userId, req.body);

    /*
        Convert result
        */

    const buffer = exportService.exportXLSX(result);

    /*
        Download
        */

    const fileName = req.body.fileName || "query-result.xlsx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    res.send(buffer);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,

      error: error.message,
    });
  }
}

/*
==================================================
EXPORT CSV
==================================================
*/

async function exportCSV(req, res) {
  try {
    const userId = req.userId || req.session.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    /*
        Execute query
        */

    const result = await queryService.query(userId, req.body);

    /*
        Convert result
        */

    const buffer = exportService.exportCSV(result);

    /*
        Download
        */

    const fileName = req.body.fileName || "query-result.csv";

    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    res.send(buffer);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,

      error: error.message,
    });
  }
}

module.exports = {
  exportXLSX,

  exportCSV,
};
