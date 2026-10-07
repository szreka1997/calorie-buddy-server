const { MEAL_CATEGORIES } = require("../constants/bmiConstants");
const {
  USERS_REQUIRED_FIELDS,
  USERS_ALLOWED_INSERT_FIELDS,
  USERS_ALLOWED_UPDATE_FIELDS,
  USERS_TABLE_NAME,
} = require("../constants/usersConstants");
const {
  USER_GOALS_REQUIRED_FIELDS,
  USER_GOALS_ALLOWED_FIELDS,
} = require("../constants/userGoalsConsants");
const {
  WEIGHT_HISTORIES_REQUIRED_FIELDS,
  WEIGHT_HISTORIES_ALLOWED_FIELDS,
} = require("../constants/weightHistoryConstants");
const {
  FOODS_REQUIRED_FIELDS,
  FOODS_ALLOWED_FIELDS,
} = require("../constants/foodsConstants");
const {
  MEALS_REQUIRED_FIELDS,
  MEALS_ALLOWED_FIELDS,
  MEALS_FOODS_REQUIRED_FIELDS,
  MEALS_FOODS_ALLOWED_FIELDS,
} = require("../constants/mealsConstants");
const {
  FOOD_HISTORIES_REQUIRED_FIELDS,
  FOOD_HISTORIES_ALLOWED_FIELDS,
} = require("../constants/foodHistoriesConstants");
const {
  parseDecimal,
  parseInteger,
  findRecordById,
} = require("../utils/commonUtils");
const { extractBearerToken } = require("./usersUtils");
const { getValidation, getNutriScore } = require("./chatGptUtils");

// PAYLOAS VALIDATORS
async function validateResourceAccess({ userId, authorizationHeader }) {
  const token = extractBearerToken(authorizationHeader);
  const resource = await findRecordById({
    tableName: USERS_TABLE_NAME,
    id: userId,
  });

  if (!token) {
    const error = new Error("Missing or invalid bearer token");
    error.status = 401;
    throw error;
  }

  if (resource.firebase_id_token !== token) {
    const error = new Error("Token not authorized for resource");
    error.status = 403;
    throw error;
  }

  return resource;
}

function validateUserPayload({ user, isUpdate = false }) {
  if (!isUpdate) {
    module.exports.checkRequiredFields({
      payload: user,
      requiredFields: USERS_REQUIRED_FIELDS,
    });
  }

  module.exports.checkAllowedFields({
    payload: user,
    allowedFields: isUpdate
      ? USERS_ALLOWED_UPDATE_FIELDS
      : USERS_ALLOWED_INSERT_FIELDS,
  });

  return { ...user };
}

function validateUserGoalPayload({ userGoal }) {
  module.exports.checkRequiredFields({
    payload: userGoal,
    requiredFields: USER_GOALS_REQUIRED_FIELDS,
  });

  module.exports.checkAllowedFields({
    payload: userGoal,
    allowedFields: USER_GOALS_ALLOWED_FIELDS,
  });

  const integerValues = module.exports.validateAllIntegerValues({
    data: {
      height: userGoal.height,
      goal_calories: userGoal.goal_calories,
      goal_carbs: userGoal.goal_carbs,
      goal_fat: userGoal.goal_fat,
      goal_protein: userGoal.goal_protein,
    },
  });
  const decimalData = {
    starting_weight: userGoal.starting_weight,
    goal_weight: userGoal.goal_weight,
  };

  if (userGoal.weekly_rate !== undefined) {
    decimalData.weekly_rate = userGoal.weekly_rate;
  }

  const decimalValues = module.exports.validateAllDecimalValues({
    data: decimalData,
  });

  return {
    ...userGoal,
    ...integerValues,
    ...decimalValues,
  };
}

function validateWeightHistoryPayload({ weightHistory }) {
  module.exports.checkRequiredFields({
    payload: weightHistory,
    requiredFields: WEIGHT_HISTORIES_REQUIRED_FIELDS,
  });

  module.exports.checkAllowedFields({
    payload: weightHistory,
    allowedFields: WEIGHT_HISTORIES_ALLOWED_FIELDS,
  });

  const weight = module.exports.validateNumericValue({
    value: weightHistory.weight,
    fieldName: "weight",
    isDecimal: true,
  });

  return {
    ...weightHistory,
    weight,
  };
}

async function validateFoodPayload({ food }) {
  module.exports.checkRequiredFields({
    payload: food,
    requiredFields: FOODS_REQUIRED_FIELDS,
  });
  module.exports.checkAllowedFields({
    payload: food,
    allowedFields: FOODS_ALLOWED_FIELDS,
  });

  const decimalValues = module.exports.validateAllDecimalValues({
    data: {
      kcal_per_100_g: food.kcal_per_100_g,
      carbs_per_100_g: food.carbs_per_100_g,
      fat_per_100_g: food.fat_per_100_g,
      protein_per_100_g: food.protein_per_100_g,
      sugar_per_100_g: food.sugar_per_100_g,
      added_sugar_per_100_g: food.added_sugar_per_100_g,
      recommended_serving_size: food.recommended_serving_size,
    },
  });

  const is_verified = await getValidation(food);
  const nutri_score = await getNutriScore(food);

  return {
    ...food,
    ...decimalValues,
    is_verified,
    nutri_score,
  };
}

function validateMealPayload({ meal }) {
  module.exports.checkRequiredFields({
    payload: meal,
    requiredFields: MEALS_REQUIRED_FIELDS,
  });
  module.exports.checkAllowedFields({
    payload: meal,
    allowedFields: MEALS_ALLOWED_FIELDS,
  });

  const kcal = module.exports.validateNumericValue({
    value: meal.kcal,
    fieldName: "kcal",
  });

  if (!Array.isArray(meal.foods) || meal.foods.length < 2) {
    const error = new Error("foods must be an array with at lest 2 elements");
    error.status = 422;
    throw error;
  }

  const foods = meal.foods.map((food) => {
    return module.exports.validateMealFoodPayload({ mealFood: food });
  });

  return {
    ...meal,
    kcal,
    foods,
  };
}

function validateMealFoodPayload({ mealFood }) {
  module.exports.checkRequiredFields({
    payload: mealFood,
    requiredFields: MEALS_FOODS_REQUIRED_FIELDS,
  });
  module.exports.checkAllowedFields({
    payload: mealFood,
    allowedFields: MEALS_FOODS_ALLOWED_FIELDS,
  });

  const parsedIntegers = module.exports.validateAllIntegerValues({
    data: {
      food_id: mealFood.food_id,
      quantity: mealFood.quantity,
    },
  });

  return { ...parsedIntegers };
}

function validateFoodHistoryPayload({ foodHistory }) {
  module.exports.checkRequiredFields({
    payload: foodHistory,
    requiredFields: FOOD_HISTORIES_REQUIRED_FIELDS,
  });
  module.exports.checkAllowedFields({
    payload: foodHistory,
    allowedFields: FOOD_HISTORIES_ALLOWED_FIELDS,
  });

  const quantity = module.exports.validateNumericValue({
    value: foodHistory.quantity,
    fieldName: "quantity",
  });

  return {
    ...foodHistory,
    quantity,
  };
}

// HELPERS
function validateNumericValue({ value, fieldName, isDecimal = false }) {
  const parsedValue = isDecimal ? parseDecimal(value) : parseInteger(value);

  if (parsedValue === undefined) {
    const error = new Error(
      `${fieldName} must be ${isDecimal ? "numeric" : "integer"}`,
    );
    error.status = 422;
    throw error;
  }

  return parsedValue;
}

function validateAllDecimalValues({ data }) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      module.exports.validateNumericValue({
        value,
        fieldName: key,
        isDecimal: true,
      }),
    ]),
  );
}

function validateAllIntegerValues({ data }) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      module.exports.validateNumericValue({ value, fieldName: key }),
    ]),
  );
}

function checkRequiredFields({ payload, requiredFields }) {
  const missingFields = requiredFields.filter((field) => !(field in payload));

  if (missingFields.length > 0) {
    const error = new Error(
      `Missing required field(s): ${missingFields.join(", ")}`,
    );
    error.status = 400;
    throw error;
  }
}

function checkAllowedFields({ payload, allowedFields }) {
  const notAllowedFields = Object.keys(payload).filter(
    (item) => !allowedFields.includes(item),
  );
  const validFields = Object.keys(payload).filter((item) =>
    allowedFields.includes(item),
  );

  if (notAllowedFields.length > 0) {
    const error = new Error(
      `Not allowed field(s): ${notAllowedFields.join(", ")}`,
    );
    error.status = 400;
    throw error;
  }

  if (validFields.length === 0) {
    const error = new Error("No valid fields provided");
    error.status = 400;
    throw error;
  }
}

function validateDateField(date) {
  const isoDate = new Date(date);

  if (Number.isNaN(isoDate.getTime())) {
    const error = new Error("Invalid date format");
    error.status = 422;
    throw error;
  }

  return isoDate.toISOString().split("T")[0];
}

function validateMealCategoryField(mealCategory) {
  const allowedCategories = Object.values(MEAL_CATEGORIES);
  const normalizedCategory = mealCategory.trim().replace(/[-_]/g, " ");

  const match = allowedCategories.find(
    (category) => category.toLowerCase() === normalizedCategory.toLowerCase(),
  );

  if (!match) {
    const error = new Error(
      `meal_category must be one of: ${allowedCategories.join(", ")}`,
    );
    error.status = 422;
    throw error;
  }

  return match;
}

module.exports = {
  validateResourceAccess,
  validateUserPayload,
  validateUserGoalPayload,
  validateWeightHistoryPayload,
  validateFoodPayload,
  validateMealPayload,
  validateMealFoodPayload,
  validateFoodHistoryPayload,
  validateNumericValue,
  validateAllDecimalValues,
  validateAllIntegerValues,
  checkRequiredFields,
  checkAllowedFields,
  validateDateField,
  validateMealCategoryField,
};
