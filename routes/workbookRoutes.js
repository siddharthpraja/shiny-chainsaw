const express = require("express");

const router = express.Router();

const workbookController = require("../controllers/workbookController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, workbookController.getWorkbook);

router.post("/", authMiddleware, workbookController.saveWorkbook);

module.exports = router;
