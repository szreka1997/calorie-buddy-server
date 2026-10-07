const express = require("express");

const { pool } = require("../db");
const { INTERNAL_SERVER_ERROR } = require("../constants/commonConstants");
const {
  MEALS_SELECT_FIELDS_SQL,
  MEALS_TABLE_NAME,
} = require("../constants/mealsConstants");
const {
  validateMealPayload,
  validateResourceAccess,
} = require("../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  findRecordById,
  buildErrorStatusAndMessage,
} = require("../utils/commonUtils");
const {
  findMealsWithFoodsByUserId,
  findMealsWithFoodsById,
  ensureFoodsExist,
  replaceMealFoodRelations,
} = require("../utils/mealsUtils");

const router = express.Router();
const tableName = MEALS_TABLE_NAME;

async function postMealByUserId(req, res) {
  const userId = req.params.userId;
  const newMeal = req.body || {};

  try {
    const validatedMeal = await validateMealPayload({ meal: newMeal });

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    await ensureFoodsExist({ mealfoods: validatedMeal.foods });

    const mealRow = await insertRecord({
      tableName,
      data: {
        user_id: userId,
        name: validatedMeal.name,
        kcal: validatedMeal.kcal,
        nutri_score: validatedMeal.nutri_score,
        image_uri: validatedMeal?.image_uri,
        image_delete_uri: validatedMeal.image_delete_uri,
      },
    });

    const relationRow = await replaceMealFoodRelations({
      mealId: mealRow.id,
      userId,
      foods: validatedMeal.foods,
    });

    res.status(201).json({
      message: "Meal created",
      meal: mealRow,
      relations: relationRow,
    });
  } catch (error) {
    console.error("Failed to create meal:", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getMeals(_, res) {
  try {
    const { rows } = await pool.query(
      `
        SELECT ${MEALS_SELECT_FIELDS_SQL}
        FROM ${tableName}
        ORDER BY id
      `,
    );

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve meals", error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR });
  }
}

async function getMealsByUserId(req, res) {
  const userId = req.params.userId;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const rows = await findMealsWithFoodsByUserId({ userId });

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve meals", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getMealById(req, res) {
  const mealId = req.params.id;

  try {
    const existingMeal = await findRecordById({
      id: mealId,
      tableName: MEALS_TABLE_NAME,
    });
    const userId = existingMeal.user_id;

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const row = await findMealsWithFoodsById({ id: mealId });

    res.json(row);
  } catch (error) {
    console.error("Failed to retrieve meals", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function putMealById(req, res) {
  const mealId = req.params.id;
  const updatedMeal = req.body || {};

  try {
    const validatedMeal = await validateMealPayload({ meal: updatedMeal });

    const existingMeal = await findRecordById({ tableName, id: mealId });
    const userId = existingMeal.user_id;

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    await ensureFoodsExist({ mealfoods: validatedMeal.foods });

    const mealRows = await updateRecord({
      tableName,
      data: {
        id: mealId,
        user_id: userId,
        name: validatedMeal.name,
        kcal: validatedMeal.kcal,
        nutri_score: validatedMeal.nutri_score,
        image_uri: validatedMeal.image_uri,
        image_delete_uri: validatedMeal.image_delete_uri,
      },
    });

    const relationRow = await replaceMealFoodRelations({
      mealId: mealId,
      userId,
      foods: validatedMeal.foods,
      isUpdate: true,
    });

    res.json({
      message: "Meal updated",
      meal: mealRows[0],
      relations: relationRow,
    });
  } catch (error) {
    console.error("Failed to update meal:", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

router.post("/:userId", postMealByUserId);
router.get("/", getMeals);
router.get("/user-id/:userId", getMealsByUserId);
router.get("/meal-id/:id", getMealById);
router.put("/:id", putMealById);

module.exports = router;
