const queryService = require("../services/queryService");



async function query(req, res) {
  try {
    const result = await queryService.query(req.userId, req.body);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      error: error.message,
    });
  }
}

module.exports = {
  query,
};
