const request = require("supertest");
const express = require("express");
const foodsRouter = require("../../routes/foods");

const { pool } = require("../../db");
const { INTERNAL_SERVER_ERROR } = require("../../constants/commonConstants");
const {
  FOODS_TABLE_NAME,
  FOODS_SELECT_FIELDS_SQL,
} = require("../../constants/foodsConstants");
const {
  validateFoodPayload,
  validateResourceAccess,
} = require("../../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  buildErrorStatusAndMessage,
  findRecordById,
} = require("../../utils/commonUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/validationUtils", () => ({
  validateFoodPayload: jest.fn(),
  validateResourceAccess: jest.fn(),
}));

jest.mock("../../utils/commonUtils", () => ({
  insertRecord: jest.fn(),
  updateRecord: jest.fn(),
  buildErrorStatusAndMessage: jest.fn(),
  findRecordById: jest.fn(),
}));

describe("Foods Routes", () => {
  const userId = "user-1";
  const foodId = "food-1";
  const bearerToken = "bearer-token";
  const tableName = FOODS_TABLE_NAME;

  const foodPayload = {
    name: "Apple",
    is_verified: true,
    nutri_score: "A",
    kcal_per_100_g: "52",
    carbs_per_100_g: "14",
    fat_per_100_g: "0.2",
    protein_per_100_g: "0.3",
    sugar_per_100_g: "10",
    added_sugar_per_100_g: "0",
    recommended_serving_size: "100",
    barcode: "1234567890",
    image_uri: "https://example.com/apple.jpg",
  };

  const validatedFood = {
    ...foodPayload,
    kcal_per_100_g: 52,
    carbs_per_100_g: 14,
    fat_per_100_g: 0.2,
    protein_per_100_g: 0.3,
    sugar_per_100_g: 10,
    added_sugar_per_100_g: 0,
    recommended_serving_size: 100,
  };

  const food = {
    id: foodId,
    user_id: userId,
    ...validatedFood,
  };

  const updatedFood = {
    ...food,
    name: "Green Apple",
  };

  const error = new Error("An error occurred");
  const mockError = { status: 400, message: "ERROR!" };

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/foods", foodsRouter);

    return app;
  }

  beforeEach(() => {
    validateFoodPayload.mockReturnValue(validatedFood);
    validateResourceAccess.mockResolvedValue({ id: userId });

    insertRecord.mockResolvedValue(food);
    updateRecord.mockResolvedValue([updatedFood]);
    findRecordById.mockResolvedValue(food);
    buildErrorStatusAndMessage.mockReturnValue(mockError);

    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /foods/:userId - [postFoodByUserId]", () => {
    const path = `/foods/${userId}`;

    test("returns error when payload validation fails", async () => {
      const app = createApp();

      validateFoodPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .post(path)
        .send()
        .expect(mockError.status);

      expect(validateFoodPayload).toHaveBeenCalledWith({ food: {} });
      expect(validateResourceAccess).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
      expect(insertRecord).not.toHaveBeenCalled();
    });

    test("creates food when payload is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .post(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .send(foodPayload)
        .expect(201);

      expect(validateFoodPayload).toHaveBeenCalledWith({ food: foodPayload });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(insertRecord).toHaveBeenCalledWith({
        tableName,
        data: { ...validatedFood, user_id: userId },
      });
      expect(response.body).toEqual({
        message: "Food created",
        food,
      });
    });
  });

  describe("GET /foods/ - [getFoods]", () => {
    const path = "/foods/";

    test("returns 500 when database read fails", async () => {
      const app = createApp();

      pool.query.mockRejectedValue(error);

      const response = await request(app).get(path).expect(500);
      const [queryText, values] = pool.query.mock.calls[0];

      expect(queryText).toContain(`SELECT ${FOODS_SELECT_FIELDS_SQL}`);
      expect(queryText).toContain(`FROM ${tableName}`);
      expect(values).toBeUndefined();
      expect(response.body).toEqual({ error: INTERNAL_SERVER_ERROR });
    });

    test("returns foods when database read succeeds", async () => {
      const app = createApp();

      pool.query.mockResolvedValueOnce({ rows: [food] });

      const response = await request(app).get(path).expect(200);

      expect(response.body).toEqual([food]);
    });
  });

  describe("GET /foods/:id - [getFoodById]", () => {
    const path = `/foods/${foodId}`;

    test("returns error when findRecordById fails", async () => {
      const app = createApp();

      findRecordById.mockRejectedValueOnce(error);

      const response = await request(app).get(path).expect(mockError.status);

      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: foodId,
      });
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("returns food when findRecordById succeeds", async () => {
      const app = createApp();

      const response = await request(app).get(path).expect(200);

      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: foodId,
      });
      expect(response.body).toEqual(food);
    });
  });

  describe("PUT /foods/:id - [putFoodById]", () => {
    const path = `/foods/${foodId}`;

    test("returns error when validation fails", async () => {
      const app = createApp();

      validateFoodPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .put(path)
        .send()
        .expect(mockError.status);

      expect(validateFoodPayload).toHaveBeenCalledWith({ food: {} });
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
      expect(updateRecord).not.toHaveBeenCalled();
    });

    test("updates food when payload is valid", async () => {
      const app = createApp();
      const sanitizedFood = { ...validatedFood, name: "Green Apple" };

      validateFoodPayload.mockReturnValueOnce(sanitizedFood);

      const response = await request(app)
        .put(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .send(foodPayload)
        .expect(200);

      expect(validateFoodPayload).toHaveBeenCalledWith({ food: foodPayload });
      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: foodId,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(updateRecord).toHaveBeenCalledWith({
        tableName,
        data: updatedFood,
      });
      expect(response.body).toEqual({
        message: "Food updated",
        food: updatedFood,
      });
    });
  });
});
