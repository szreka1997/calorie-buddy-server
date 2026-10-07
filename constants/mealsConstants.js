const MEALS_REQUIRED_FIELDS = ["name", "kcal", "nutri_score", "foods"];
const MEALS_FOODS_REQUIRED_FIELDS = ["food_id", "quantity"];

const MEALS_ALLOWED_FIELDS = [
  ...MEALS_REQUIRED_FIELDS,
  "image_uri",
  "image_delete_uri",
];
const MEALS_FOODS_ALLOWED_FIELDS = [...MEALS_FOODS_REQUIRED_FIELDS];

const MEALS_FIELDS = [
  "id",
  "user_id",
  "name",
  "kcal",
  "nutri_score",
  "image_uri",
  "image_delete_uri",
];

const MEALS_SELECT_FIELDS_SQL = MEALS_FIELDS.join(", ");

const MEALS_TABLE_NAME = "meals";

module.exports = {
  MEALS_REQUIRED_FIELDS,
  MEALS_FOODS_REQUIRED_FIELDS,
  MEALS_ALLOWED_FIELDS,
  MEALS_FOODS_ALLOWED_FIELDS,
  MEALS_FIELDS,
  MEALS_SELECT_FIELDS_SQL,
  MEALS_TABLE_NAME,
};
