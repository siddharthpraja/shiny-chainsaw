const express = require("express");

const router = express.Router();

const rowController = require("../controllers/rowController");

const authMiddleware = require("../middleware/authMiddleware");

/*
    INSERT
*/
router.post("/:tableName", authMiddleware, rowController.insertRow);

/*
    SELECT ALL
*/
router.get("/:tableName", authMiddleware, rowController.getRows);

/*
    SELECT ONE
*/
router.get("/:tableName/:rowId", authMiddleware, rowController.getRow);

/*
    UPDATE
*/
router.put("/:tableName/:rowId", authMiddleware, rowController.updateRow);

/*
    DELETE
*/
router.delete("/:tableName/:rowId", authMiddleware, rowController.deleteRow);

module.exports = router;
