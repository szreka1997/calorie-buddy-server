const express = require("express");

const { pool } = require("../db");
const { INTERNAL_SERVER_ERROR } = require("../constants/commonConstants");
const {
  MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL,
  MEAL_FOOD_RELATIONS_TABLE_NAME,
} = require("../constants/mealFoodRelationsConstants");

const router = express.Router();
const tableName = MEAL_FOOD_RELATIONS_TABLE_NAME;

async function getMealFoodRelations(_, res) {
  try {
    const { rows } = await pool.query(
      `
        SELECT ${MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL}
        FROM ${tableName}
        ORDER BY id
      `,
    );

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve meal-food relations", error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR });
  }
}

router.get("/", getMealFoodRelations);

module.exports = router;
