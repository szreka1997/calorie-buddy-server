const request = require("supertest");
const express = require("express");
const mealsRouter = require("../../routes/meals");

const { pool } = require("../../db");
const { INTERNAL_SERVER_ERROR } = require("../../constants/commonConstants");
const {
  MEALS_TABLE_NAME,
  MEALS_SELECT_FIELDS_SQL,
} = require("../../constants/mealsConstants");
const {
  validateMealPayload,
  validateResourceAccess,
} = require("../../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  findRecordById,
  buildErrorStatusAndMessage,
} = require("../../utils/commonUtils");
const {
  findMealsWithFoodsByUserId,
  findMealsWithFoodsById,
  ensureFoodsExist,
  replaceMealFoodRelations,
} = require("../../utils/mealsUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/validationUtils", () => ({
  validateMealPayload: jest.fn(),
  validateResourceAccess: jest.fn(),
}));

jest.mock("../../utils/commonUtils", () => ({
  insertRecord: jest.fn(),
  updateRecord: jest.fn(),
  findRecordById: jest.fn(),
  buildErrorStatusAndMessage: jest.fn(),
}));

jest.mock("../../utils/mealsUtils", () => ({
  findMealsWithFoodsByUserId: jest.fn(),
  findMealsWithFoodsById: jest.fn(),
  ensureFoodsExist: jest.fn(),
  replaceMealFoodRelations: jest.fn(),
}));

describe("Meals Routes", () => {
  const userId = "user-1";
  const mealId = "meal-1";
  const foodId = "food-1";
  const quantity = 100;
  const bearerToken = "bearer-token";
  const tableName = MEALS_TABLE_NAME;
  const foods = [{ food_id: foodId, quantity }];

  const mealPayload = {
    name: "Breakfast",
    kcal: "500",
    nutri_score: "B",
    foods,
  };
  const validatedMeal = {
    ...mealPayload,
    kcal: 500,
  };
  const insertMealData = {
    user_id: userId,
    name: validatedMeal.name,
    kcal: validatedMeal.kcal,
    nutri_score: validatedMeal.nutri_score,
  };
  const mealWithFoods = {
    id: mealId,
    user_id: userId,
    ...validatedMeal,
  };
  const { foods: foodResponse, ...mealRow } = mealWithFoods;

  const relation = {
    id: "relation-1",
    user_id: userId,
    meal_id: mealId,
    food_id: foodId,
    quantity,
  };

  const error = new Error("An error occurred");
  const mockError = { status: 400, message: "ERROR!" };

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/meals", mealsRouter);

    return app;
  }

  beforeEach(() => {
    validateMealPayload.mockResolvedValue(validatedMeal);

    insertRecord.mockResolvedValue(mealRow);
    findRecordById.mockResolvedValue(mealRow);
    buildErrorStatusAndMessage.mockReturnValue(mockError);

    findMealsWithFoodsByUserId.mockResolvedValue([mealWithFoods]);
    findMealsWithFoodsById.mockResolvedValue(mealWithFoods);
    replaceMealFoodRelations.mockResolvedValue([relation]);

    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /meals/:userId - [postMealByUserId]", () => {
    const path = `/meals/${userId}`;

    test("returns error response when validation fails", async () => {
      const app = createApp();
      validateMealPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .post(path)
        .set("Authorization", bearerToken)
        .send()
        .expect(mockError.status);

      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("creates meal and relations when payload is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .post(path)
        .set("Authorization", bearerToken)
        .send(mealPayload)
        .expect(201);

      expect(validateMealPayload).toHaveBeenCalledWith({ meal: mealPayload });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: bearerToken,
      });
      expect(ensureFoodsExist).toHaveBeenCalledWith({
        mealfoods: foods,
      });
      expect(insertRecord).toHaveBeenCalledWith({
        tableName,
        data: insertMealData,
      });
      expect(replaceMealFoodRelations).toHaveBeenCalledWith({
        mealId,
        userId,
        foods,
      });
      expect(response.body).toEqual({
        message: "Meal created",
        meal: mealRow,
        relations: [relation],
      });
    });
  });

  describe("GET /meals/ - [getMeals]", () => {
    const path = "/meals/";

    test("returns 500 when database read fails", async () => {
      const app = createApp();

      pool.query.mockRejectedValue(error);

      const response = await request(app).get(path).expect(500);
      const [queryText, values] = pool.query.mock.calls[0];

      expect(queryText).toContain(`SELECT ${MEALS_SELECT_FIELDS_SQL}`);
      expect(queryText).toContain(`FROM ${tableName}`);
      expect(values).toBeUndefined();
      expect(response.body).toEqual({ error: INTERNAL_SERVER_ERROR });
    });

    test("returns meals when database read succeeds", async () => {
      const app = createApp();

      pool.query.mockResolvedValueOnce({ rows: [mealWithFoods] });

      const response = await request(app).get(path).expect(200);

      expect(response.body).toEqual([mealWithFoods]);
    });
  });

  describe("GET /meals/user-id/:userId - [getMealsByUserId]", () => {
    const path = `/meals/user-id/${userId}`;

    test("returns error response when retrieval fails", async () => {
      const app = createApp();
      findMealsWithFoodsByUserId.mockRejectedValueOnce(error);

      const response = await request(app)
        .get(path)
        .set("Authorization", bearerToken)
        .expect(mockError.status);

      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("returns meals for a user when access is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .get(path)
        .set("Authorization", bearerToken)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: bearerToken,
      });
      expect(findMealsWithFoodsByUserId).toHaveBeenCalledWith({ userId });
      expect(response.body).toEqual([mealWithFoods]);
    });
  });

  describe("GET /meals/meal-id/:id - [getMealById]", () => {
    const path = `/meals/meal-id/${mealId}`;

    test("returns error response when retrieval fails", async () => {
      const app = createApp();
      findMealsWithFoodsById.mockRejectedValueOnce(error);

      const response = await request(app)
        .get(path)
        .set("Authorization", bearerToken)
        .expect(mockError.status);

      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("returns a meal when access is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .get(path)
        .set("Authorization", bearerToken)
        .expect(200);

      expect(findRecordById).toHaveBeenCalledWith({
        id: mealId,
        tableName,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: bearerToken,
      });
      expect(findMealsWithFoodsById).toHaveBeenCalledWith({ id: mealId });
      expect(response.body).toEqual(mealWithFoods);
    });
  });

  describe("PUT /meals/:id - [putMealById]", () => {
    const path = `/meals/${mealId}`;

    const updatedMealFields = { name: "Lunch" };
    const updatedMealPayload = {
      ...mealPayload,
      ...updatedMealFields,
    };
    const updatedValidatedMeal = {
      ...validatedMeal,
      ...updatedMealFields,
    };
    const updateRecordMealPayload = {
      ...insertMealData,
      ...updatedMealFields,
      id: mealId,
    };
    const updatedMealWithFoods = {
      ...mealWithFoods,
      ...updatedMealFields,
    };
    const { foods, ...updatedMealRow } = updatedMealWithFoods;

    beforeEach(() => {
      updateRecord.mockResolvedValue([updatedMealRow]);
    });

    test("returns error response when update fails", async () => {
      const app = createApp();
      validateMealPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .put(path)
        .set("Authorization", bearerToken)
        .send()
        .expect(mockError.status);

      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("updates a meal and relations when payload is valid", async () => {
      const app = createApp();

      validateMealPayload.mockReturnValue(updatedValidatedMeal);

      const response = await request(app)
        .put(path)
        .set("Authorization", bearerToken)
        .send(updatedMealPayload)
        .expect(200);

      expect(validateMealPayload).toHaveBeenCalledWith({
        meal: updatedMealPayload,
      });
      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: mealId,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: bearerToken,
      });
      expect(ensureFoodsExist).toHaveBeenCalledWith({
        mealfoods: foods,
      });
      expect(updateRecord).toHaveBeenCalledWith({
        tableName,
        data: updateRecordMealPayload,
      });
      expect(replaceMealFoodRelations).toHaveBeenCalledWith({
        mealId,
        userId,
        foods,
        isUpdate: true,
      });
      expect(response.body).toEqual({
        message: "Meal updated",
        meal: updatedMealRow,
        relations: [relation],
      });
    });
  });
});
