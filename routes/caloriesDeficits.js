const express = require("express");

const {
  validateDateField,
  validateResourceAccess,
} = require("../utils/validationUtils");
const { buildErrorStatusAndMessage } = require("../utils/commonUtils");
const {
  calculateLast7DaysCalorieDeficits,
} = require("../utils/calorieDeficitUtils");

const router = express.Router();

async function getCalorieDeficitsByUserId(req, res) {
  const userId = req.params.userId;
  const date = req.params.date;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers.authorization,
    });
    const validatedDate = validateDateField(date);

    const rows = await calculateLast7DaysCalorieDeficits({
      userId,
      today: validatedDate,
    });

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve calorie deficits", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

router.get("/user-id/:userId/today/:date", getCalorieDeficitsByUserId);

module.exports = router;
