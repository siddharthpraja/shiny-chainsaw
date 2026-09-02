const express = require("express");

const router = express.Router();

const columnController = require("../controllers/columnController");

const authMiddleware = require("../middleware/authMiddleware");

/*
    GET ALL COLUMNS
*/
router.get(
  "/:tableName",

  authMiddleware,

  columnController.getColumns,
);

/*
    ADD COLUMN
*/
router.post(
  "/:tableName",

  authMiddleware,

  columnController.addColumn,
);

/*
    RENAME COLUMN
*/
router.patch(
  "/:tableName/:columnName",

  authMiddleware,

  columnController.renameColumn,
);

/*
    DROP COLUMN
*/
router.delete(
  "/:tableName/:columnName",

  authMiddleware,

  columnController.dropColumn,
);

module.exports = router;
