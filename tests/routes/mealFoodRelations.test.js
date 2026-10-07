const request = require("supertest");
const express = require("express");
const mealFoodRelationsRouter = require("../../routes/mealFoodRelations");

const { pool } = require("../../db");
const { INTERNAL_SERVER_ERROR } = require("../../constants/commonConstants");
const {
  MEAL_FOOD_RELATIONS_TABLE_NAME,
  MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL,
} = require("../../constants/mealFoodRelationsConstants");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe("Meal Food Relations Routes", () => {
  const tableName = MEAL_FOOD_RELATIONS_TABLE_NAME;
  const error = new Error("An error occurred");

  const relation = {
    id: "relation-1",
    user_id: "user-1",
    food_id: "food-1",
    meal_id: "meal-1",
    quantity: "150.5",
  };

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/meal-food-relations", mealFoodRelationsRouter);

    return app;
  }

  beforeEach(() => {
    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /meal-food-relations/ - [getMealFoodRelations]", () => {
    const path = "/meal-food-relations/";

    test("returns 500 when database read fails", async () => {
      const app = createApp();

      pool.query.mockRejectedValue(error);

      const response = await request(app).get(path).expect(500);
      const [queryText, values] = pool.query.mock.calls[0];

      expect(queryText).toContain(
        `SELECT ${MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL}`,
      );
      expect(queryText).toContain(`FROM ${tableName}`);
      expect(values).toBeUndefined();
      expect(response.body).toEqual({ error: INTERNAL_SERVER_ERROR });
    });

    test("returns relations when database read succeeds", async () => {
      const app = createApp();

      pool.query.mockResolvedValueOnce({ rows: [relation] });

      const response = await request(app).get(path).expect(200);

      expect(response.body).toEqual([relation]);
    });
  });
});
