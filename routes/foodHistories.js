const express = require("express");

const { pool } = require("../db");
const { INTERNAL_SERVER_ERROR } = require("../constants/commonConstants");
const { FOODS_TABLE_NAME } = require("../constants/foodsConstants");
const {
  FOOD_HISTORIES_TABLE_NAME,
  FOOD_HISTORIES_SELECT_FIELDS_SQL,
} = require("../constants/foodHistoriesConstants");
const {
  validateFoodHistoryPayload,
  validateResourceAccess,
  validateDateField,
  validateMealCategoryField,
} = require("../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  removeRecord,
  buildErrorStatusAndMessage,
  findRecordById,
} = require("../utils/commonUtils");
const {
  findFoodHistoryByUserIdAndDate,
  getLast10FoodHistoryByUserAndMealCategoryDescByDate,
} = require("../utils/foodHistoriesUtils");

const router = express.Router();
const tableName = FOOD_HISTORIES_TABLE_NAME;

async function postFoodHistoriesByUserId(req, res) {
  const userId = req.params.userId;
  const newUserHistory = req.body || {};

  try {
    const validatedFoodHistory = validateFoodHistoryPayload({
      foodHistory: newUserHistory,
    });

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    await findRecordById({
      tableName: FOODS_TABLE_NAME,
      id: validatedFoodHistory.food_id,
    });

    const row = await insertRecord({
      tableName: FOOD_HISTORIES_TABLE_NAME,
      data: {
        ...validatedFoodHistory,
        user_id: userId,
      },
    });

    res.status(201).json({
      message: "Food history created",
      foodHistory: row,
    });
  } catch (error) {
    console.error("Failed to create food history", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getFoodHistories(req, res) {
  try {
    const { rows } = await pool.query(
      `
        SELECT ${FOOD_HISTORIES_SELECT_FIELDS_SQL}
        FROM ${tableName}
        ORDER BY date DESC, id DESC
      `,
    );

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve food histories", error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR });
  }
}

async function getFoodHistoryByUserIdAndDate(req, res) {
  const userId = req.params.userId;
  const date = req.params.date;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const validatedDate = validateDateField(date);
    const rows = await findFoodHistoryByUserIdAndDate({
      userId,
      date: validatedDate,
    });

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve food history", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getFoodHistoryByUserIdAndMealCategory(req, res) {
  const userId = req.params.userId;
  const mealCategory = req.params.mealCategory;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const validatedMealCategory = validateMealCategoryField(mealCategory);
    const rows = await getLast10FoodHistoryByUserAndMealCategoryDescByDate({
      userId,
      mealCategory: validatedMealCategory,
    });

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve food history", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function putFoodHistoryById(req, res) {
  const historyId = req.params.id;
  const updatedFoodHistory = req.body || {};

  try {
    const validatedFoodHistory = validateFoodHistoryPayload({
      foodHistory: updatedFoodHistory,
    });

    const existingHistory = await findRecordById({
      tableName,
      id: historyId,
    });
    const userId = existingHistory.user_id;

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    await findRecordById({
      tableName: FOODS_TABLE_NAME,
      id: updatedFoodHistory.food_id,
    });

    const rows = await updateRecord({
      tableName,
      data: {
        ...validatedFoodHistory,
        user_id: userId,
        id: historyId,
      },
    });

    res.json({
      message: "Food history updated",
      foodHistory: rows[0],
    });
  } catch (error) {
    console.error("Failed to update food history", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function deleteFoodHistoryById(req, res) {
  const historyId = req.params.id;

  try {
    const existingHistory = await findRecordById({
      tableName,
      id: historyId,
    });

    await validateResourceAccess({
      userId: existingHistory.user_id,
      authorizationHeader: req?.headers?.authorization,
    });

    const rows = await removeRecord({
      tableName,
      id: historyId,
    });

    res.json({
      message: "Food history deleted",
      foodHistory: rows[0],
    });
  } catch (error) {
    console.error("Failed to delete food history", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

router.post("/:userId", postFoodHistoriesByUserId);
router.get("/", getFoodHistories);
router.get("/user-id/:userId/date/:date", getFoodHistoryByUserIdAndDate);
router.get(
  "/user-id/:userId/meal-cat/:mealCategory",
  getFoodHistoryByUserIdAndMealCategory,
);
router.put("/:id", putFoodHistoryById);
router.delete("/:id", deleteFoodHistoryById);

module.exports = router;
