const express = require("express");

const controller = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
==================================================
LOGIN WITH GOOGLE
==================================================
*/

router.get("/google", controller.googleLogin);

router.get("/google/callback", controller.googleCallback);

/*
==================================================
CURRENT USER
==================================================
*/

router.get("/me", authMiddleware, controller.me);

/*
==================================================
LOGOUT
==================================================
*/

router.post("/logout", authMiddleware, controller.logout);

module.exports = router;
