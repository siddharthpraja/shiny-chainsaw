const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-jwt-secret-before-production";

const JWT_EXPIRES_IN = "24h";

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  createToken,
  verifyToken,
};
