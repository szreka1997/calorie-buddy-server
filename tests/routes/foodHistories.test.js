const request = require("supertest");
const express = require("express");
const foodHistoriesRouter = require("../../routes/foodHistories");

const { pool } = require("../../db");
const { INTERNAL_SERVER_ERROR } = require("../../constants/commonConstants");
const { MEAL_CATEGORIES } = require("../../constants/bmiConstants");
const { FOODS_TABLE_NAME } = require("../../constants/foodsConstants");
const {
  FOOD_HISTORIES_TABLE_NAME,
  FOOD_HISTORIES_SELECT_FIELDS_SQL,
} = require("../../constants/foodHistoriesConstants");
const {
  validateFoodHistoryPayload,
  validateResourceAccess,
  validateDateField,
  validateMealCategoryField,
} = require("../../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  removeRecord,
  findRecordById,
  buildErrorStatusAndMessage,
} = require("../../utils/commonUtils");
const {
  findFoodHistoryByUserIdAndDate,
  getLast10FoodHistoryByUserAndMealCategoryDescByDate,
} = require("../../utils/foodHistoriesUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/validationUtils", () => ({
  validateFoodHistoryPayload: jest.fn(),
  validateResourceAccess: jest.fn(),
  validateDateField: jest.fn(),
  validateMealCategoryField: jest.fn(),
}));

jest.mock("../../utils/commonUtils", () => ({
  insertRecord: jest.fn(),
  updateRecord: jest.fn(),
  removeRecord: jest.fn(),
  findRecordById: jest.fn(),
  buildErrorStatusAndMessage: jest.fn(),
}));

jest.mock("../../utils/foodHistoriesUtils", () => ({
  findFoodHistoryByUserIdAndDate: jest.fn(),
  getLast10FoodHistoryByUserAndMealCategoryDescByDate: jest.fn(),
}));

describe("Food Histories Routes", () => {
  const userId = "user-1";
  const historyId = "history-1";
  const foodId = "food-1";
  const bearerToken = "bearer-token";
  const tableName = FOOD_HISTORIES_TABLE_NAME;
  const date = "2024-03-27";
  const validatedDate = "2024-03-27";
  const mealCategory = "liquid-calories";
  const validatedMealCategory = MEAL_CATEGORIES.LIQUID_CALORIES;

  const foodHistoryPayload = {
    food_id: foodId,
    meal_category: MEAL_CATEGORIES.LIQUID_CALORIES,
    quantity: "150.5",
    date: "2024-03-27",
  };

  const validatedFoodHistory = {
    ...foodHistoryPayload,
    quantity: 150.5,
  };

  const foodHistory = {
    id: historyId,
    user_id: userId,
    ...validatedFoodHistory,
  };

  const updatedFoodHistory = {
    ...foodHistory,
    quantity: 200.75,
  };

  const error = new Error("An error occurred");
  const mockError = { status: 400, message: "ERROR!" };

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/food-histories", foodHistoriesRouter);

    return app;
  }

  beforeEach(() => {
    validateFoodHistoryPayload.mockReturnValue(validatedFoodHistory);
    validateResourceAccess.mockResolvedValue({ id: userId });
    validateDateField.mockReturnValue(validatedDate);
    validateMealCategoryField.mockReturnValue(validatedMealCategory);

    insertRecord.mockResolvedValue(foodHistory);
    updateRecord.mockResolvedValue([updatedFoodHistory]);
    removeRecord.mockResolvedValue([foodHistory]);
    findRecordById.mockResolvedValue(foodHistory);
    buildErrorStatusAndMessage.mockReturnValue(mockError);

    findFoodHistoryByUserIdAndDate.mockResolvedValue([foodHistory]);
    getLast10FoodHistoryByUserAndMealCategoryDescByDate.mockResolvedValue([
      foodHistory,
    ]);

    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /food-histories/:userId - [postFoodHistoriesByUserId]", () => {
    const path = `/food-histories/${userId}`;

    test("returns error when payload validation fails", async () => {
      const app = createApp();

      validateFoodHistoryPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .post(path)
        .send()
        .expect(mockError.status);

      expect(validateFoodHistoryPayload).toHaveBeenCalledWith({
        foodHistory: {},
      });
      expect(validateResourceAccess).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
      expect(insertRecord).not.toHaveBeenCalled();
    });

    test("creates food history when payload is valid", async () => {
      const app = createApp();

      findRecordById
        .mockResolvedValueOnce(foodHistory)
        .mockResolvedValueOnce({ id: foodId });

      const response = await request(app)
        .post(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .send(foodHistoryPayload)
        .expect(201);

      expect(validateFoodHistoryPayload).toHaveBeenCalledWith({
        foodHistory: foodHistoryPayload,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(findRecordById).toHaveBeenCalledWith({
        tableName: FOODS_TABLE_NAME,
        id: validatedFoodHistory.food_id,
      });
      expect(insertRecord).toHaveBeenCalledWith({
        tableName,
        data: { ...validatedFoodHistory, user_id: userId },
      });
      expect(response.body).toEqual({
        message: "Food history created",
        foodHistory,
      });
    });
  });

  describe("GET /food-histories/ - [getFoodHistories]", () => {
    const path = "/food-histories/";

    test("returns 500 when database read fails", async () => {
      const app = createApp();

      pool.query.mockRejectedValue(error);

      const response = await request(app).get(path).expect(500);
      const [queryText, values] = pool.query.mock.calls[0];

      expect(queryText).toContain(`SELECT ${FOOD_HISTORIES_SELECT_FIELDS_SQL}`);
      expect(queryText).toContain(`FROM ${tableName}`);
      expect(values).toBeUndefined();
      expect(response.body).toEqual({ error: INTERNAL_SERVER_ERROR });
    });

    test("returns food histories when database read succeeds", async () => {
      const app = createApp();

      pool.query.mockResolvedValueOnce({ rows: [foodHistory] });

      const response = await request(app).get(path).expect(200);

      expect(response.body).toEqual([foodHistory]);
    });
  });

  describe("GET /food-histories/user-id/:userId/date/:date - [getFoodHistoryByUserIdAndDate]", () => {
    const path = `/food-histories/user-id/${userId}/date/${date}`;

    test("returns error when resource access validation fails", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValueOnce(error);

      const response = await request(app).get(path).expect(mockError.status);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: undefined,
      });
      expect(validateDateField).not.toHaveBeenCalled();
      expect(findFoodHistoryByUserIdAndDate).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("returns food history rows when validation succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(validateDateField).toHaveBeenCalledWith(date);
      expect(findFoodHistoryByUserIdAndDate).toHaveBeenCalledWith({
        userId,
        date: validatedDate,
      });
      expect(response.body).toEqual([foodHistory]);
    });
  });

  describe("GET /food-histories/user-id/:userId/meal-cat/:mealCategory - [getFoodHistoryByUserIdAndMealCategory]", () => {
    const path = `/food-histories/user-id/${userId}/meal-cat/${mealCategory}`;

    test("returns error when meal category validation fails", async () => {
      const app = createApp();

      validateMealCategoryField.mockImplementationOnce(() => {
        throw error;
      });

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(mockError.status);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(validateMealCategoryField).toHaveBeenCalledWith(mealCategory);
      expect(
        getLast10FoodHistoryByUserAndMealCategoryDescByDate,
      ).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("returns last 10 food history rows when validation succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(validateMealCategoryField).toHaveBeenCalledWith(mealCategory);
      expect(
        getLast10FoodHistoryByUserAndMealCategoryDescByDate,
      ).toHaveBeenCalledWith({
        userId,
        mealCategory: validatedMealCategory,
      });
      expect(response.body).toEqual([foodHistory]);
    });
  });

  describe("PUT /food-histories/:id - [putFoodHistoryById]", () => {
    const path = `/food-histories/${historyId}`;

    test("returns error when payload validation fails", async () => {
      const app = createApp();

      validateFoodHistoryPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .put(path)
        .send()
        .expect(mockError.status);

      expect(validateFoodHistoryPayload).toHaveBeenCalledWith({
        foodHistory: {},
      });
      expect(validateResourceAccess).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
      expect(updateRecord).not.toHaveBeenCalled();
    });

    test("updates food history when payload is valid", async () => {
      const app = createApp();
      const sanitizedFoodHistory = {
        ...validatedFoodHistory,
        quantity: 200.75,
      };

      validateFoodHistoryPayload.mockReturnValueOnce(sanitizedFoodHistory);

      findRecordById
        .mockResolvedValueOnce(foodHistory)
        .mockResolvedValueOnce({ user_id: userId })
        .mockResolvedValueOnce({ id: foodId });

      const response = await request(app)
        .put(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .send(foodHistoryPayload)
        .expect(200);

      expect(validateFoodHistoryPayload).toHaveBeenCalledWith({
        foodHistory: foodHistoryPayload,
      });
      expect(findRecordById).toHaveBeenNthCalledWith(1, {
        tableName,
        id: historyId,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(findRecordById).toHaveBeenNthCalledWith(2, {
        tableName: FOODS_TABLE_NAME,
        id: foodId,
      });
      expect(updateRecord).toHaveBeenCalledWith({
        tableName,
        data: updatedFoodHistory,
      });
      expect(response.body).toEqual({
        message: "Food history updated",
        foodHistory: updatedFoodHistory,
      });
    });
  });

  describe("DELETE /food-histories/:id - [deleteFoodHistoryById]", () => {
    const path = `/food-histories/${historyId}`;

    test("returns error when resource access validation fails", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValueOnce(error);

      const response = await request(app).delete(path).expect(mockError.status);

      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: historyId,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: undefined,
      });
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
      expect(removeRecord).not.toHaveBeenCalled();
    });

    test("deletes food history when resource access validation succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .delete(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: historyId,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(removeRecord).toHaveBeenCalledWith({
        tableName,
        id: historyId,
      });
      expect(response.body).toEqual({
        message: "Food history deleted",
        foodHistory,
      });
    });
  });
});
