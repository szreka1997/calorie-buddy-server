const MealsUtils = require("../../utils/mealsUtils");

const { pool } = require("../../db");
const { FOODS_TABLE_NAME } = require("../../constants/foodsConstants");
const { MEALS_TABLE_NAME } = require("../../constants/mealsConstants");
const {
  MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL,
  MEAL_FOOD_RELATIONS_TABLE_NAME,
} = require("../../constants/mealFoodRelationsConstants");
const {
  findRecordById,
  insertRecord,
  removeRecord,
} = require("../../utils/commonUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/commonUtils", () => ({
  findRecordById: jest.fn(),
  insertRecord: jest.fn(),
  removeRecord: jest.fn(),
}));

describe("Meals Utils", () => {
  let spyFindMealsWithFood;
  let spyGetMealFoodsByMealIds;

  const userId = "user-1";
  const mealId = "meal-1";
  const foodId = "food-1";
  const quantity = 100;

  const mealWithFoods = {
    id: mealId,
    user_id: userId,
    name: "Breakfast",
    kcal: "500",
    nutri_score: "B",
    foods: [{ food_id: foodId, quantity }],
    kcal: 500,
  };
  const { foods, ...mealRow } = mealWithFoods;

  const insertRelationData = {
    user_id: userId,
    meal_id: mealId,
    food_id: foodId,
    quantity,
  };
  const relation = {
    id: "relation-1",
    ...insertRelationData,
  };

  const error = new Error("An error occurred");

  beforeEach(() => {
    spyFindMealsWithFood = jest.spyOn(MealsUtils, "findMealsWithFood");
    spyGetMealFoodsByMealIds = jest.spyOn(MealsUtils, "getMealFoodsByMealIds");

    findRecordById.mockResolvedValue([mealRow]);

    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("[findMealsWithFoodsByUserId]", () => {
    test("delegates to findMealsWithFood with user_id and idName", async () => {
      spyFindMealsWithFood.mockResolvedValue([mealWithFoods]);

      const result = await MealsUtils.findMealsWithFoodsByUserId({ userId });

      expect(spyFindMealsWithFood).toHaveBeenCalledWith({
        id: userId,
        idName: "user_id",
        shoudThrowEntryNotFoundError: false,
      });
      expect(result).toEqual([mealWithFoods]);
    });
  });

  describe("[findMealsWithFoodsById]", () => {
    test("returns the first meal from the list", async () => {
      spyFindMealsWithFood.mockResolvedValue([mealWithFoods]);

      const result = await MealsUtils.findMealsWithFoodsById({ id: mealId });

      expect(spyFindMealsWithFood).toHaveBeenCalledWith({
        id: mealId,
      });
      expect(result).toEqual(mealWithFoods);
    });
  });

  describe("[ensureFoodsExist]", () => {
    test("verifies each food exists via findRecordById", async () => {
      findRecordById.mockResolvedValue();

      await MealsUtils.ensureFoodsExist({ mealfoods: foods });

      foods.forEach(({ food_id }) => {
        expect(findRecordById).toHaveBeenCalledWith({
          tableName: FOODS_TABLE_NAME,
          id: food_id,
        });
      });
    });

    test("propagates errors from findRecordById", async () => {
      findRecordById.mockRejectedValue(error);

      await expect(
        MealsUtils.ensureFoodsExist({ mealfoods: foods }),
      ).rejects.toThrow(error);
    });
  });

  describe("[replaceMealFoodRelations]", () => {
    beforeEach(() => {
      removeRecord.mockResolvedValue([]);
      insertRecord.mockResolvedValueOnce(relation);
    });

    test("replaces relations with deletion when in update mode", async () => {
      const result = await MealsUtils.replaceMealFoodRelations({
        mealId,
        userId,
        foods,
        isUpdate: true,
      });

      expect(removeRecord).toHaveBeenCalledWith({
        tableName: MEAL_FOOD_RELATIONS_TABLE_NAME,
        id: mealId,
        idName: "meal_id",
      });
      expect(insertRecord).toHaveBeenCalledWith({
        tableName: MEAL_FOOD_RELATIONS_TABLE_NAME,
        data: insertRelationData,
      });
      expect(result).toEqual([relation]);
    });

    test("creates relations without deleting when not updating", async () => {
      await MealsUtils.replaceMealFoodRelations({
        mealId,
        userId,
        foods,
      });

      expect(removeRecord).not.toHaveBeenCalled();
      expect(insertRecord).toHaveBeenCalled();
    });
  });

  describe("[findMealsWithFood]", () => {
    test("returns empty array when no meals are found", async () => {
      findRecordById.mockResolvedValue([]);
      const result = await MealsUtils.findMealsWithFood({ id: mealId });

      expect(findRecordById).toHaveBeenCalledWith({
        tableName: MEALS_TABLE_NAME,
        id: mealId,
        idName: "id",
        orderBy: "ORDER BY id",
        shouldReturnMultipleRows: true,
        shoudThrowEntryNotFoundError: true,
      });
      expect(result).toEqual([]);
      expect(spyGetMealFoodsByMealIds).not.toHaveBeenCalled();
    });

    test("attaches foods to each meal", async () => {
      findRecordById.mockResolvedValue([mealRow]);
      spyGetMealFoodsByMealIds.mockResolvedValue({ [mealId]: foods });

      const result = await MealsUtils.findMealsWithFood({
        id: userId,
        idName: "user_id",
      });

      expect(findRecordById).toHaveBeenCalledWith({
        tableName: MEALS_TABLE_NAME,
        id: userId,
        idName: "user_id",
        orderBy: "ORDER BY id",
        shouldReturnMultipleRows: true,
        shoudThrowEntryNotFoundError: true,
      });
      expect(spyGetMealFoodsByMealIds).toHaveBeenCalledWith({
        mealIds: [mealId],
      });
      expect(result).toEqual([mealWithFoods]);
    });

    test("defaults foods to empty array when none are found", async () => {
      findRecordById.mockResolvedValue([mealRow]);
      spyGetMealFoodsByMealIds.mockResolvedValue({});

      const result = await MealsUtils.findMealsWithFood({ id: mealId });

      expect(spyGetMealFoodsByMealIds).toHaveBeenCalledWith({
        mealIds: [mealId],
      });
      expect(result).toEqual([
        {
          ...mealRow,
          foods: [],
        },
      ]);
    });
  });

  describe("[getMealFoodsByMealIds]", () => {
    test("returns empty object when mealIds is empty", async () => {
      const result = await MealsUtils.getMealFoodsByMealIds({ mealIds: [] });

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    test("returns empty array when no relations are found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await MealsUtils.getMealFoodsByMealIds({
        mealIds: [mealId],
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          `SELECT ${MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL}`,
        ),
        [[mealId]],
      );
      expect(result).toEqual([]);
    });

    test("groups foods by meal id", async () => {
      const rows = [
        { meal_id: "meal-1", food_id: "food-1", quantity: 100 },
        { meal_id: "meal-1", food_id: "food-2", quantity: 50 },
        { meal_id: "meal-2", food_id: "food-3", quantity: 75 },
      ];
      pool.query.mockResolvedValueOnce({ rows });

      const result = await MealsUtils.getMealFoodsByMealIds({
        mealIds: ["meal-1", "meal-2"],
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(`FROM ${MEAL_FOOD_RELATIONS_TABLE_NAME}`),
        [["meal-1", "meal-2"]],
      );
      expect(result).toEqual({
        "meal-1": [
          { food_id: "food-1", quantity: 100 },
          { food_id: "food-2", quantity: 50 },
        ],
        "meal-2": [{ food_id: "food-3", quantity: 75 }],
      });
    });
  });

  describe("[deleteMealFoodRelationsByMealId]", () => {
    test("delegates to removeRecord", async () => {
      removeRecord.mockResolvedValue([relation]);

      const result = await MealsUtils.deleteMealFoodRelationsByMealId({
        mealId,
      });

      expect(removeRecord).toHaveBeenCalledWith({
        tableName: MEAL_FOOD_RELATIONS_TABLE_NAME,
        id: mealId,
        idName: "meal_id",
      });
      expect(result).toEqual([relation]);
    });
  });

  describe("[postMealFoodRelation]", () => {
    test("delegates to insertRecord", async () => {
      insertRecord.mockResolvedValue(relation);

      const result = await MealsUtils.postMealFoodRelation({
        newRelation: insertRelationData,
      });

      expect(insertRecord).toHaveBeenCalledWith({
        tableName: MEAL_FOOD_RELATIONS_TABLE_NAME,
        data: insertRelationData,
      });
      expect(result).toEqual(relation);
    });
  });

  describe("[mergedMealFoodRelations]", () => {
    test("merges relations with identical meal and food ids by summing quantities", () => {
      const relations = [
        { meal_id: "meal-1", food_id: "food-1", quantity: 100 },
        { meal_id: "meal-1", food_id: "food-1", quantity: 50 },
        { meal_id: "meal-1", food_id: "food-2", quantity: 20 },
        { meal_id: "meal-2", food_id: "food-1", quantity: 30 },
      ];

      const result = MealsUtils.mergedMealFoodRelations({ relations });

      expect(result).toEqual([
        { meal_id: "meal-1", food_id: "food-1", quantity: 150 },
        { meal_id: "meal-1", food_id: "food-2", quantity: 20 },
        { meal_id: "meal-2", food_id: "food-1", quantity: 30 },
      ]);
    });

    test("returns empty array when no relations are provided", () => {
      const result = MealsUtils.mergedMealFoodRelations({ relations: [] });

      expect(result).toEqual([]);
    });
  });
});
