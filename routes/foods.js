const express = require("express");

const { pool } = require("../db");
const { INTERNAL_SERVER_ERROR } = require("../constants/commonConstants");
const {
  FOODS_TABLE_NAME,
  FOODS_SELECT_FIELDS_SQL,
} = require("../constants/foodsConstants");
const {
  validateFoodPayload,
  validateResourceAccess,
} = require("../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  buildErrorStatusAndMessage,
  findRecordById,
} = require("../utils/commonUtils");

const router = express.Router();
const tableName = FOODS_TABLE_NAME;

async function postFoodByUserId(req, res) {
  const userId = req.params.userId;
  const newFood = req.body || {};

  try {
    const validatedFood = await validateFoodPayload({ food: newFood });

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers.authorization,
    });

    const row = await insertRecord({
      tableName,
      data: {
        ...validatedFood,
        user_id: userId,
      },
    });

    res.status(201).json({
      message: "Food created",
      food: row,
    });
  } catch (error) {
    console.error("Failed to create food", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getFoods(_, res) {
  try {
    const { rows } = await pool.query(
      `
        SELECT ${FOODS_SELECT_FIELDS_SQL}
        FROM ${tableName}
        ORDER BY id
      `,
    );

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve foods", error);
    return res.status(500).json({ error: INTERNAL_SERVER_ERROR });
  }
}

async function getFoodById(req, res) {
  try {
    const row = await findRecordById({ tableName, id: req.params.id });

    res.json(row);
  } catch (error) {
    console.error("Failed to retrieve food", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function putFoodById(req, res) {
  const foodId = req.params.id;
  const updatedFood = req.body || {};

  try {
    const validatedFood = await validateFoodPayload({ food: updatedFood });

    const existingFood = await findRecordById({ tableName, id: foodId });
    const userId = existingFood.user_id;

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const rows = await updateRecord({
      tableName,
      data: {
        ...validatedFood,
        user_id: userId,
        id: foodId,
      },
    });

    res.json({
      message: "Food updated",
      food: rows[0],
    });
  } catch (error) {
    console.error("Failed to update food", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

router.post("/:userId", postFoodByUserId);
router.get("/", getFoods);
router.get("/:id", getFoodById);
router.put("/:id", putFoodById);

module.exports = router;
