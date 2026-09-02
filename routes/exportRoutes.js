const express = require("express");

const router = express.Router();

const exportController = require("../controllers/exportController");

const authMiddleware = require("../middleware/authMiddleware");

/*
==================================================
EXPORT XLSX
==================================================
*/

router.post("/xlsx", authMiddleware, exportController.exportXLSX);

/*
==================================================
EXPORT CSV
==================================================
*/

router.post("/csv", authMiddleware, exportController.exportCSV);

module.exports = router;
