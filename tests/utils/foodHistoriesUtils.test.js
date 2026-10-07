const { pool } = require("../../db");
const { MEAL_CATEGORIES } = require("../../constants/bmiConstants");
const {
  FOOD_HISTORIES_SELECT_FIELDS_SQL,
  FOOD_HISTORIES_TABLE_NAME,
} = require("../../constants/foodHistoriesConstants");
const {
  findFoodHistoryByUserIdAndDate,
  getLast10FoodHistoryByUserAndMealCategoryDescByDate,
} = require("../../utils/foodHistoriesUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe("Food Histories Utils", () => {
  const userId = "user-1";
  const foodId = "food-1";
  const quantity = 100;
  const mealCategory = MEAL_CATEGORIES.BREAKFAST;
  const date = "2024-03-27";

  const rows = [
    {
      id: "history-1",
      user_id: userId,
      food_id: foodId,
      quantity,
      meal_category: mealCategory,
      date,
    },
  ];

  beforeEach(() => {
    pool.query.mockResolvedValue({ rows });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("[findFoodHistoryByUserIdAndDate]", () => {
    test("executes expected query and returns rows", async () => {
      const result = await findFoodHistoryByUserIdAndDate({ userId, date });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(`SELECT ${FOOD_HISTORIES_SELECT_FIELDS_SQL}`),
        [userId, date],
      );
      const [queryText] = pool.query.mock.calls[0];

      expect(queryText).toContain(`FROM ${FOOD_HISTORIES_TABLE_NAME}`);
      expect(queryText).toContain("WHERE user_id = $1");
      expect(queryText).toContain("AND date::date = $2::date");
      expect(queryText).toContain("ORDER BY date");
      expect(result).toEqual(rows);
    });
  });

  describe("[getLast10FoodHistoryByUserAndMealCategoryDescByDate]", () => {
    test("executes expected query and returns rows", async () => {
      const result = await getLast10FoodHistoryByUserAndMealCategoryDescByDate({
        userId,
        mealCategory,
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(`SELECT ${FOOD_HISTORIES_SELECT_FIELDS_SQL}`),
        [userId, mealCategory],
      );
      const [queryText] = pool.query.mock.calls[0];

      expect(queryText).toContain(`FROM ${FOOD_HISTORIES_TABLE_NAME}`);
      expect(queryText).toContain("WHERE user_id = $1");
      expect(queryText).toContain("AND meal_category = $2");
      expect(queryText).toContain("ORDER BY date DESC");
      expect(queryText).toContain("LIMIT 10");
      expect(result).toEqual(rows);
    });
  });
});
