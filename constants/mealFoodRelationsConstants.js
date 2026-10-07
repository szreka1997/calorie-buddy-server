const MEAL_FOOD_RELATIONS_FIELDS = [
  "id",
  "user_id",
  "meal_id",
  "food_id",
  "quantity",
];

const MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL =
  MEAL_FOOD_RELATIONS_FIELDS.join(", ");

const MEAL_FOOD_RELATIONS_TABLE_NAME = "meal_food_relations";

module.exports = {
  MEAL_FOOD_RELATIONS_FIELDS,
  MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL,
  MEAL_FOOD_RELATIONS_TABLE_NAME,
};
