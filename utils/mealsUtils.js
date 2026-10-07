const { pool } = require("../db");
const { FOODS_TABLE_NAME } = require("../constants/foodsConstants");
const { MEALS_TABLE_NAME } = require("../constants/mealsConstants");
const {
  MEAL_FOOD_RELATIONS_TABLE_NAME,
  MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL,
} = require("../constants/mealFoodRelationsConstants");
const { findRecordById, insertRecord, removeRecord } = require("./commonUtils");

// DB
function findMealsWithFoodsByUserId({ userId }) {
  return module.exports.findMealsWithFood({
    id: userId,
    idName: "user_id",
    shoudThrowEntryNotFoundError: false,
  });
}

async function findMealsWithFoodsById({ id }) {
  const rows = await module.exports.findMealsWithFood({ id });
  return rows[0];
}

async function ensureFoodsExist({ mealfoods }) {
  await Promise.all(
    mealfoods.map((food) => {
      return findRecordById({
        tableName: FOODS_TABLE_NAME,
        id: food.food_id,
      });
    }),
  );
}

async function replaceMealFoodRelations({
  mealId,
  userId,
  foods,
  isUpdate = false,
}) {
  if (isUpdate) await deleteMealFoodRelationsByMealId({ mealId });

  const relations = foods.map((food) => ({
    user_id: userId,
    meal_id: mealId,
    food_id: food.food_id,
    quantity: food.quantity,
  }));

  const mergedRelations = mergedMealFoodRelations({ relations });
  const relationRows = await Promise.all(
    mergedRelations.map((newRelation) => {
      return postMealFoodRelation({ newRelation });
    }),
  );

  return relationRows;
}

// HELPERS
async function findMealsWithFood({
  id,
  idName = "id",
  shoudThrowEntryNotFoundError = true,
}) {
  const rows = await findRecordById({
    tableName: MEALS_TABLE_NAME,
    id,
    idName,
    orderBy: "ORDER BY id",
    shouldReturnMultipleRows: true,
    shoudThrowEntryNotFoundError,
  });

  if (rows.length === 0) return [];

  const mealIds = rows.map((meal) => meal.id);
  const foods = await module.exports.getMealFoodsByMealIds({ mealIds });

  return rows.map((meal) => ({
    ...meal,
    foods: foods[meal.id] || [],
  }));
}

async function getMealFoodsByMealIds({ mealIds }) {
  if (mealIds.length === 0) return {};

  const { rows } = await pool.query(
    `
      SELECT ${MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL}
      FROM ${MEAL_FOOD_RELATIONS_TABLE_NAME}
      WHERE meal_id = ANY($1)
      ORDER BY id
    `,
    [mealIds],
  );

  if (rows.length === 0) return [];

  const foods = {};
  for (const { meal_id, food_id, quantity } of rows) {
    foods[meal_id] ??= {};
    foods[meal_id][food_id] = quantity;
  }

  const result = {};
  Object.entries(foods).forEach(([meal_id, foodsData]) => {
    const foodsList = [];
    Object.entries(foodsData).forEach(([food_id, quantity]) => {
      foodsList.push({ food_id, quantity });
    });
    result[meal_id] = [...foodsList];
  });

  return result;
}

async function deleteMealFoodRelationsByMealId({ mealId }) {
  const rows = await removeRecord({
    tableName: MEAL_FOOD_RELATIONS_TABLE_NAME,
    id: mealId,
    idName: "meal_id",
  });

  return rows;
}

async function postMealFoodRelation({ newRelation }) {
  const row = await insertRecord({
    tableName: MEAL_FOOD_RELATIONS_TABLE_NAME,
    data: { ...newRelation },
  });

  return row;
}

function mergedMealFoodRelations({ relations }) {
  const map = new Map();

  relations.forEach((item) => {
    const key = `${item.meal_id}-${item.food_id}`;

    if (map.has(key)) {
      map.get(key).quantity += item.quantity;
    } else {
      map.set(key, { ...item });
    }
  });

  return Array.from(map.values());
}

module.exports = {
  findMealsWithFoodsByUserId,
  findMealsWithFoodsById,
  ensureFoodsExist,
  replaceMealFoodRelations,
  findMealsWithFood,
  getMealFoodsByMealIds,
  deleteMealFoodRelationsByMealId,
  postMealFoodRelation,
  mergedMealFoodRelations,
};
