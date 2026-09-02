const { verifyToken } = require("../services/tokenService");

function authMiddleware(req, res, next) {
    try {
        const adminSecret = req.headers["x-admin-secret"];
        const authorization = req.headers.authorization;

        // Optional admin-secret authentication.
        // Disabled unless ADMIN_SECRET and ADMIN_USER_ID are set in .env -
        // there is no built-in/hardcoded secret.
        if (
            process.env.ADMIN_SECRET &&
            process.env.ADMIN_USER_ID &&
            adminSecret === process.env.ADMIN_SECRET
        ) {
            req.userId = process.env.ADMIN_USER_ID;

            req.user = {
                id: process.env.ADMIN_USER_ID,
                role: "admin"
            };

            return next();
        }

        // Normal JWT authentication
        if (!authorization) {
            return res.status(401).json({
                error: "Authentication token required"
            });
        }

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Invalid authorization format"
            });
        }

        const token = authorization.substring(7);

        const decoded = verifyToken(token);

        req.user = decoded;
        req.userId = decoded.id;

        next();

    } catch (error) {

        console.error(error);

        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
}

module.exports = authMiddleware;
