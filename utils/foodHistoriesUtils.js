const { pool } = require("../db");
const {
  FOOD_HISTORIES_SELECT_FIELDS_SQL,
  FOOD_HISTORIES_TABLE_NAME,
} = require("../constants/foodHistoriesConstants");

async function findFoodHistoryByUserIdAndDate({ userId, date }) {
  const { rows } = await pool.query(
    `
      SELECT ${FOOD_HISTORIES_SELECT_FIELDS_SQL}
      FROM ${FOOD_HISTORIES_TABLE_NAME}
      WHERE user_id = $1
        AND date::date = $2::date
      ORDER BY date
    `,
    [userId, date],
  );

  return rows;
}

async function getLast10FoodHistoryByUserAndMealCategoryDescByDate({
  userId,
  mealCategory,
}) {
  const { rows } = await pool.query(
    `
      SELECT ${FOOD_HISTORIES_SELECT_FIELDS_SQL}
      FROM (
        SELECT DISTINCT ON (food_id) ${FOOD_HISTORIES_SELECT_FIELDS_SQL}
        FROM ${FOOD_HISTORIES_TABLE_NAME}
        WHERE user_id = $1
          AND meal_category = $2
        ORDER BY food_id, date DESC
      ) latest_food_histories
      ORDER BY date DESC
      LIMIT 10
    `,
    [userId, mealCategory],
  );

  return rows;
}

module.exports = {
  findFoodHistoryByUserIdAndDate,
  getLast10FoodHistoryByUserAndMealCategoryDescByDate,
};
