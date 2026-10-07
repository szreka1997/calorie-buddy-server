const FOODS_REQUIRED_FIELDS = [
  "name",
  "kcal_per_100_g",
  "carbs_per_100_g",
  "fat_per_100_g",
  "protein_per_100_g",
  "sugar_per_100_g",
  "added_sugar_per_100_g",
  "recommended_serving_size",
];

const FOODS_ALLOWED_FIELDS = [
  ...FOODS_REQUIRED_FIELDS,
  "barcode",
  "image_uri",
  "image_delete_uri",
];

const FOODS_FIELDS = [
  "id",
  "user_id",
  "nutri_score",
  "is_verified",
  ...FOODS_ALLOWED_FIELDS,
];

const FOODS_SELECT_FIELDS_SQL = FOODS_FIELDS.join(", ");

const FOODS_TABLE_NAME = "foods";

module.exports = {
  FOODS_REQUIRED_FIELDS,
  FOODS_ALLOWED_FIELDS,
  FOODS_FIELDS,
  FOODS_SELECT_FIELDS_SQL,
  FOODS_TABLE_NAME,
};
