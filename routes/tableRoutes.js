const express = require("express");

const router = express.Router();

const tableController = require("../controllers/tableController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, tableController.listTables);

router.post("/", authMiddleware, tableController.createTable);

router.get("/:tableName", authMiddleware, tableController.getTable);

router.patch("/:tableName", authMiddleware, tableController.renameTable);

router.delete("/:tableName", authMiddleware, tableController.dropTable);

module.exports = router;
