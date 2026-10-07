const ValidationUtils = require("../../utils/validationUtils");

const { MEAL_CATEGORIES } = require("../../constants/bmiConstants");
const {
  USERS_REQUIRED_FIELDS,
  USERS_ALLOWED_INSERT_FIELDS,
  USERS_ALLOWED_UPDATE_FIELDS,
  USERS_TABLE_NAME,
} = require("../../constants/usersConstants");
const {
  USER_GOALS_REQUIRED_FIELDS,
  USER_GOALS_ALLOWED_FIELDS,
} = require("../../constants/userGoalsConsants");
const {
  WEIGHT_HISTORIES_REQUIRED_FIELDS,
  WEIGHT_HISTORIES_ALLOWED_FIELDS,
} = require("../../constants/weightHistoryConstants");
const {
  FOODS_REQUIRED_FIELDS,
  FOODS_ALLOWED_FIELDS,
} = require("../../constants/foodsConstants");
const {
  MEALS_REQUIRED_FIELDS,
  MEALS_ALLOWED_FIELDS,
  MEALS_FOODS_REQUIRED_FIELDS,
  MEALS_FOODS_ALLOWED_FIELDS,
} = require("../../constants/mealsConstants");
const {
  FOOD_HISTORIES_REQUIRED_FIELDS,
  FOOD_HISTORIES_ALLOWED_FIELDS,
} = require("../../constants/foodHistoriesConstants");

const {
  findRecordById,
  parseDecimal,
  parseInteger,
} = require("../../utils/commonUtils");
const { extractBearerToken } = require("../../utils/usersUtils");
const { getValidation, getNutriScore } = require("../../utils/chatGptUtils");

jest.mock("../../utils/commonUtils", () => ({
  parseDecimal: jest.fn(),
  parseInteger: jest.fn(),
  findRecordById: jest.fn(),
}));

jest.mock("../../utils/usersUtils", () => ({
  extractBearerToken: jest.fn(),
}));

jest.mock("../../utils/chatGptUtils", () => ({
  getValidation: jest.fn(),
  getNutriScore: jest.fn(),
}));

describe("Validation Utils", () => {
  let spyCheckRequiredFields;
  let spyCheckAllowedFields;
  let spyValidateNumericValue;
  let spyValidateAllIntegerValues;
  let spyValidateAllDecimalValues;
  let spyValidateMealFoodPayload;

  beforeEach(() => {
    parseDecimal.mockImplementation((num) => parseFloat(num));
    parseInteger.mockImplementation((num) => parseInt(num));

    getValidation.mockResolvedValue("Not valid");
    getNutriScore.mockResolvedValue("E");

    spyCheckRequiredFields = jest.spyOn(ValidationUtils, "checkRequiredFields");
    spyCheckAllowedFields = jest.spyOn(ValidationUtils, "checkAllowedFields");
    spyValidateNumericValue = jest.spyOn(
      ValidationUtils,
      "validateNumericValue",
    );
    spyValidateAllIntegerValues = jest.spyOn(
      ValidationUtils,
      "validateAllIntegerValues",
    );
    spyValidateAllDecimalValues = jest.spyOn(
      ValidationUtils,
      "validateAllDecimalValues",
    );
    spyValidateMealFoodPayload = jest.spyOn(
      ValidationUtils,
      "validateMealFoodPayload",
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe("[validateResourceAccess]", () => {
    const userId = 1;
    const token = "valid-token";
    const authorizationHeader = `Bearer ${token}`;

    beforeEach(() => {
      extractBearerToken.mockReturnValue(token);
      findRecordById.mockResolvedValue({ firebase_id_token: token });
    });

    test("returns the resource when token matches", async () => {
      const result = await ValidationUtils.validateResourceAccess({
        userId,
        authorizationHeader,
      });

      expect(extractBearerToken).toHaveBeenCalledWith(authorizationHeader);
      expect(findRecordById).toHaveBeenCalledWith({
        tableName: USERS_TABLE_NAME,
        id: userId,
      });
      expect(result).toEqual({ firebase_id_token: token });
    });

    test("throws 401 when bearer token is missing", async () => {
      extractBearerToken.mockReturnValue(null);

      await expect(
        ValidationUtils.validateResourceAccess({
          userId,
          authorizationHeader: "invalid",
        }),
      ).rejects.toMatchObject({
        message: "Missing or invalid bearer token",
        status: 401,
      });
    });

    test("throws 403 when token does not match the resource", async () => {
      extractBearerToken.mockReturnValue("wrong-token");

      await expect(
        ValidationUtils.validateResourceAccess({
          userId,
          authorizationHeader: "Bearer wrong-token",
        }),
      ).rejects.toMatchObject({
        message: "Token not authorized for resource",
        status: 403,
      });
    });
  });

  describe("[validateUserPayload]", () => {
    const validUser = {
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
      register_date: "2026-01-01",
    };

    test("validates required and allowed fields for insert and returns user", () => {
      const result = ValidationUtils.validateUserPayload({ user: validUser });

      expect(spyCheckRequiredFields).toHaveBeenCalledWith({
        payload: validUser,
        requiredFields: USERS_REQUIRED_FIELDS,
      });
      expect(spyCheckAllowedFields).toHaveBeenCalledWith({
        payload: validUser,
        allowedFields: USERS_ALLOWED_INSERT_FIELDS,
      });
      expect(result).toEqual(validUser);
    });

    test("skips required fields check and uses update allowed fields when isUpdate is true", () => {
      const updateUser = { username: "newname" };

      const result = ValidationUtils.validateUserPayload({
        user: updateUser,
        isUpdate: true,
      });

      expect(spyCheckRequiredFields).not.toHaveBeenCalled();
      expect(spyCheckAllowedFields).toHaveBeenCalledWith({
        payload: updateUser,
        allowedFields: USERS_ALLOWED_UPDATE_FIELDS,
      });
      expect(result).toEqual(updateUser);
    });

    test("throws when required fields are missing on insert", () => {
      expect(() =>
        ValidationUtils.validateUserPayload({ user: { first_name: "John" } }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });

    test("throws when not allowed field is present", () => {
      expect(() =>
        ValidationUtils.validateUserPayload({
          user: { ...validUser, not_allowed_field: false },
        }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });
  });

  describe("[validateUserGoalPayload]", () => {
    const integerFields = {
      height: "180",
      goal_calories: "2000",
      goal_protein: "150",
      goal_carbs: "250",
      goal_fat: "65",
    };
    const decimalFields = {
      starting_weight: "85.5",
      goal_weight: "75.0",
    };
    const validUserGoal = {
      ...integerFields,
      ...decimalFields,
      activity_level: "Active",
      starting_date: "2024-01-01",
      plan: "lose",
    };

    test("validates and returns parsed user goal payload", () => {
      const result = ValidationUtils.validateUserGoalPayload({
        userGoal: validUserGoal,
      });

      expect(spyCheckRequiredFields).toHaveBeenCalledWith({
        payload: validUserGoal,
        requiredFields: USER_GOALS_REQUIRED_FIELDS,
      });
      expect(spyCheckAllowedFields).toHaveBeenCalledWith({
        payload: validUserGoal,
        allowedFields: USER_GOALS_ALLOWED_FIELDS,
      });
      expect(spyValidateAllIntegerValues).toHaveBeenCalledWith({
        data: integerFields,
      });
      expect(spyValidateAllDecimalValues).toHaveBeenCalledWith({
        data: decimalFields,
      });
      expect(result.height).toEqual(180);
      expect(result.starting_weight).toBeCloseTo(85.5);
    });

    test("includes weekly_rate in decimal validation when provided", () => {
      const goalWithRate = { ...validUserGoal, weekly_rate: "0.5" };

      ValidationUtils.validateUserGoalPayload({ userGoal: goalWithRate });

      expect(spyValidateAllDecimalValues).toHaveBeenCalledWith({
        data: {
          ...decimalFields,
          weekly_rate: "0.5",
        },
      });
    });

    test("throws when required fields are missing", () => {
      expect(() =>
        ValidationUtils.validateUserGoalPayload({
          userGoal: { height: "180" },
        }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });

    test("throws when not allowed field is present", () => {
      expect(() =>
        ValidationUtils.validateUserGoalPayload({
          userGoal: { ...validUserGoal, not_allowed_field: false },
        }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });
  });

  describe("[validateWeightHistoryPayload]", () => {
    const validWeightHistory = {
      date: "2024-06-15",
      weight: "80.5",
    };

    test("validates and returns parsed weight history payload", () => {
      const result = ValidationUtils.validateWeightHistoryPayload({
        weightHistory: validWeightHistory,
      });

      expect(spyCheckRequiredFields).toHaveBeenCalledWith({
        payload: validWeightHistory,
        requiredFields: WEIGHT_HISTORIES_REQUIRED_FIELDS,
      });
      expect(spyCheckAllowedFields).toHaveBeenCalledWith({
        payload: validWeightHistory,
        allowedFields: WEIGHT_HISTORIES_ALLOWED_FIELDS,
      });
      expect(spyValidateNumericValue).toHaveBeenCalledWith({
        value: "80.5",
        fieldName: "weight",
        isDecimal: true,
      });
      expect(result.weight).toBeCloseTo(80.5);
    });

    test("throws when required fields are missing", () => {
      expect(() =>
        ValidationUtils.validateWeightHistoryPayload({
          weightHistory: { date: "2024-06-15" },
        }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });

    test("throws when not allowed field is present", () => {
      expect(() =>
        ValidationUtils.validateWeightHistoryPayload({
          weightHistory: { ...validWeightHistory, not_allowed_field: false },
        }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });
  });

  describe("[validateFoodPayload]", () => {
    const decimalFields = {
      kcal_per_100_g: "52",
      carbs_per_100_g: "14",
      fat_per_100_g: "0.2",
      protein_per_100_g: "0.3",
      sugar_per_100_g: "10",
      added_sugar_per_100_g: "0",
      recommended_serving_size: "150",
    };
    const validFood = {
      ...decimalFields,
      name: "Apple",
    };

    test("validates and returns parsed food payload with chatGpt results", async () => {
      const result = await ValidationUtils.validateFoodPayload({
        food: validFood,
      });

      expect(spyCheckRequiredFields).toHaveBeenCalledWith({
        payload: validFood,
        requiredFields: FOODS_REQUIRED_FIELDS,
      });
      expect(spyCheckAllowedFields).toHaveBeenCalledWith({
        payload: validFood,
        allowedFields: FOODS_ALLOWED_FIELDS,
      });
      expect(spyValidateAllDecimalValues).toHaveBeenCalledWith({
        data: decimalFields,
      });
      expect(getValidation).toHaveBeenCalledWith(validFood);
      expect(getNutriScore).toHaveBeenCalledWith(validFood);
      expect(result.kcal_per_100_g).toEqual(52);
      expect(result.is_verified).toEqual("Not valid");
      expect(result.nutri_score).toEqual("E");
    });

    test("throws when required fields are missing", async () => {
      await expect(
        ValidationUtils.validateFoodPayload({ food: { name: "Apple" } }),
      ).rejects.toMatchObject({
        status: 400,
      });
    });

    test("throws when not allowed field is present", async () => {
      await expect(
        ValidationUtils.validateFoodPayload({
          food: { ...validFood, not_allowed_field: false },
        }),
      ).rejects.toMatchObject(
        expect.objectContaining({
          status: 400,
        }),
      );
    });
  });

  describe("[validateMealPayload]", () => {
    const validMeal = {
      name: "Lunch Bowl",
      kcal: "500",
      nutri_score: "B",
      foods: [
        { food_id: "1", quantity: "200" },
        { food_id: "2", quantity: "150" },
      ],
    };

    test("validates and returns parsed meal payload with validated foods", () => {
      const result = ValidationUtils.validateMealPayload({ meal: validMeal });

      expect(spyCheckRequiredFields).toHaveBeenCalledWith({
        payload: validMeal,
        requiredFields: MEALS_REQUIRED_FIELDS,
      });
      expect(spyCheckAllowedFields).toHaveBeenCalledWith({
        payload: validMeal,
        allowedFields: MEALS_ALLOWED_FIELDS,
      });
      expect(spyValidateNumericValue).toHaveBeenCalledWith({
        value: "500",
        fieldName: "kcal",
      });
      expect(spyValidateMealFoodPayload).toHaveBeenCalledTimes(2);
      expect(result.kcal).toEqual(500);
      expect(result.foods).toHaveLength(2);
    });

    test("throws 422 when foods is not an array", () => {
      expect(() =>
        ValidationUtils.validateMealPayload({
          meal: { ...validMeal, foods: "not-array" },
        }),
      ).toThrow(
        expect.objectContaining({
          message: "foods must be an array with at lest 2 elements",
          status: 422,
        }),
      );
    });

    test("throws 422 when foods has fewer than 2 elements", () => {
      expect(() =>
        ValidationUtils.validateMealPayload({
          meal: { ...validMeal, foods: [{ food_id: "1", quantity: "100" }] },
        }),
      ).toThrow(
        expect.objectContaining({
          message: "foods must be an array with at lest 2 elements",
          status: 422,
        }),
      );
    });

    test("throws when required fields are missing", () => {
      expect(() =>
        ValidationUtils.validateMealPayload({ meal: { name: "Lunch" } }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });
  });

  describe("[validateMealFoodPayload]", () => {
    const validMealFood = {
      food_id: "1",
      quantity: "200",
    };

    test("validates and returns parsed meal food payload", () => {
      const result = ValidationUtils.validateMealFoodPayload({
        mealFood: validMealFood,
      });

      expect(spyCheckRequiredFields).toHaveBeenCalledWith({
        payload: validMealFood,
        requiredFields: MEALS_FOODS_REQUIRED_FIELDS,
      });
      expect(spyCheckAllowedFields).toHaveBeenCalledWith({
        payload: validMealFood,
        allowedFields: MEALS_FOODS_ALLOWED_FIELDS,
      });
      expect(spyValidateAllIntegerValues).toHaveBeenCalledWith({
        data: validMealFood,
      });
      expect(result).toEqual({ food_id: 1, quantity: 200 });
    });

    test("throws when required fields are missing", () => {
      expect(() =>
        ValidationUtils.validateMealFoodPayload({
          mealFood: { food_id: "1" },
        }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });
  });

  describe("[validateFoodHistoryPayload]", () => {
    const validFoodHistory = {
      food_id: "1",
      meal_category: "Breakfast",
      quantity: "150",
      date: "2024-06-15",
    };

    test("validates and returns parsed food history payload", () => {
      const result = ValidationUtils.validateFoodHistoryPayload({
        foodHistory: validFoodHistory,
      });

      expect(spyCheckRequiredFields).toHaveBeenCalledWith({
        payload: validFoodHistory,
        requiredFields: FOOD_HISTORIES_REQUIRED_FIELDS,
      });
      expect(spyCheckAllowedFields).toHaveBeenCalledWith({
        payload: validFoodHistory,
        allowedFields: FOOD_HISTORIES_ALLOWED_FIELDS,
      });
      expect(spyValidateNumericValue).toHaveBeenCalledWith({
        value: "150",
        fieldName: "quantity",
      });
      expect(result.quantity).toEqual(150);
    });

    test("throws when required fields are missing", () => {
      expect(() =>
        ValidationUtils.validateFoodHistoryPayload({
          foodHistory: { food_id: "1" },
        }),
      ).toThrow(
        expect.objectContaining({
          status: 400,
        }),
      );
    });
  });

  describe("[validateNumericValue]", () => {
    test("returns parsed integer for a valid integer value", () => {
      const result = ValidationUtils.validateNumericValue({
        value: "42",
        fieldName: "quantity",
      });

      expect(result).toEqual(42);
    });

    test("returns parsed decimal when isDecimal is true", () => {
      const result = ValidationUtils.validateNumericValue({
        value: "3.14",
        fieldName: "weight",
        isDecimal: true,
      });

      expect(result).toBeCloseTo(3.14);
    });

    test("throws 422 when integer value is invalid", () => {
      parseInteger.mockReturnValue(undefined);

      expect(() =>
        ValidationUtils.validateNumericValue({
          value: "not-a-number",
          fieldName: "quantity",
        }),
      ).toThrow(
        expect.objectContaining({
          message: "quantity must be integer",
          status: 422,
        }),
      );
    });

    test("throws 422 when decimal value is invalid", () => {
      parseDecimal.mockReturnValue(undefined);

      expect(() =>
        ValidationUtils.validateNumericValue({
          value: "not-a-number",
          fieldName: "weight",
          isDecimal: true,
        }),
      ).toThrow(
        expect.objectContaining({
          message: "weight must be numeric",
          status: 422,
        }),
      );
    });
  });

  describe("[validateAllDecimalValues]", () => {
    test("returns an object with all values parsed as decimals", () => {
      const result = ValidationUtils.validateAllDecimalValues({
        data: { weight: "75.5", height: "180.2" },
      });

      expect(result).toEqual({ weight: 75.5, height: 180.2 });
      expect(spyValidateNumericValue).toHaveBeenCalledTimes(2);
      expect(spyValidateNumericValue).toHaveBeenNthCalledWith(1, {
        value: "75.5",
        fieldName: "weight",
        isDecimal: true,
      });
      expect(spyValidateNumericValue).toHaveBeenNthCalledWith(2, {
        value: "180.2",
        fieldName: "height",
        isDecimal: true,
      });
    });
  });

  describe("[validateAllIntegerValues]", () => {
    test("returns an object with all values parsed as integers", () => {
      const result = ValidationUtils.validateAllIntegerValues({
        data: { food_id: "1", quantity: "200" },
      });

      expect(result).toEqual({ food_id: 1, quantity: 200 });
      expect(spyValidateNumericValue).toHaveBeenCalledTimes(2);
      expect(spyValidateNumericValue).toHaveBeenNthCalledWith(1, {
        value: "1",
        fieldName: "food_id",
      });
      expect(spyValidateNumericValue).toHaveBeenNthCalledWith(2, {
        value: "200",
        fieldName: "quantity",
      });
    });
  });

  describe("[checkRequiredFields]", () => {
    const requiredFields = ["first_name", "last_name"];

    test("does not throw when all required fields are present", () => {
      expect(() =>
        ValidationUtils.checkRequiredFields({
          payload: { first_name: "John", last_name: "Doe" },
          requiredFields,
        }),
      ).not.toThrow();
    });

    test("throws 400 when a required field is missing", () => {
      expect(() =>
        ValidationUtils.checkRequiredFields({
          payload: { first_name: "John" },
          requiredFields,
        }),
      ).toThrow(
        expect.objectContaining({
          message: "Missing required field(s): last_name",
          status: 400,
        }),
      );
    });

    test("lists all missing fields in the error message", () => {
      expect(() =>
        ValidationUtils.checkRequiredFields({
          payload: {},
          requiredFields: ["first_name", "last_name"],
        }),
      ).toThrow(
        expect.objectContaining({
          message: "Missing required field(s): first_name, last_name",
          status: 400,
        }),
      );
    });
  });

  describe("[checkAllowedFields]", () => {
    const allowedFields = ["first_name", "last_name"];
    const payload = { first_name: "John" };

    test("does not throw when all fields are allowed", () => {
      expect(() =>
        ValidationUtils.checkAllowedFields({ payload, allowedFields }),
      ).not.toThrow();
    });

    test("throws 400 when a field is not allowed", () => {
      expect(() =>
        ValidationUtils.checkAllowedFields({
          payload: { ...payload, not_allowed_field: false },
          allowedFields,
        }),
      ).toThrow(
        expect.objectContaining({
          message: "Not allowed field(s): not_allowed_field",
          status: 400,
        }),
      );
    });

    test("throws 400 when no valid fields are provided", () => {
      expect(() =>
        ValidationUtils.checkAllowedFields({
          payload: { not_allowed_field: false },
          allowedFields,
        }),
      ).toThrow(
        expect.objectContaining({
          message: "Not allowed field(s): not_allowed_field",
          status: 400,
        }),
      );
    });

    test("throws 400 with 'No valid fields provided' when payload has only disallowed fields removed", () => {
      expect(() =>
        ValidationUtils.checkAllowedFields({
          payload: {},
          allowedFields,
        }),
      ).toThrow(
        expect.objectContaining({
          message: "No valid fields provided",
          status: 400,
        }),
      );
    });
  });

  describe("[validateDateField]", () => {
    test("returns ISO date string for a valid date", () => {
      const result = ValidationUtils.validateDateField("2024-06-15");

      expect(result).toEqual("2024-06-15");
    });

    test("returns ISO date string for a full ISO timestamp", () => {
      const result = ValidationUtils.validateDateField(
        "2024-06-15T10:30:00.000Z",
      );

      expect(result).toEqual("2024-06-15");
    });

    test("throws 422 for an invalid date string", () => {
      expect(() => ValidationUtils.validateDateField("not-a-date")).toThrow(
        expect.objectContaining({
          message: "Invalid date format",
          status: 422,
        }),
      );
    });
  });

  describe("[validateMealCategoryField]", () => {
    test("returns the matched category for a valid meal category", () => {
      const result = ValidationUtils.validateMealCategoryField("Breakfast");

      expect(result).toEqual(MEAL_CATEGORIES.BREAKFAST);
    });

    test("matches case-insensitively", () => {
      const result = ValidationUtils.validateMealCategoryField("breakfast");

      expect(result).toEqual(MEAL_CATEGORIES.BREAKFAST);
    });

    test("normalizes hyphens and underscores to spaces", () => {
      const result =
        ValidationUtils.validateMealCategoryField("liquid_calories");

      expect(result).toEqual(MEAL_CATEGORIES.LIQUID_CALORIES);
    });

    test("normalizes hyphens to spaces", () => {
      const result =
        ValidationUtils.validateMealCategoryField("liquid-calories");

      expect(result).toEqual(MEAL_CATEGORIES.LIQUID_CALORIES);
    });

    test("trims whitespace", () => {
      const result = ValidationUtils.validateMealCategoryField("  Lunch  ");

      expect(result).toEqual(MEAL_CATEGORIES.LUNCH);
    });

    test("throws 422 for an invalid meal category", () => {
      expect(() => ValidationUtils.validateMealCategoryField("Brunch")).toThrow(
        expect.objectContaining({
          message: expect.stringContaining("meal_category must be one of:"),
          status: 422,
        }),
      );
    });
  });
});
