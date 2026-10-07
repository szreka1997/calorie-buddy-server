const calorieDeficitUtils = require("../../utils/calorieDeficitUtils");

const { SEX, ACTIVITY_LEVEL } = require("../../constants/bmiConstants");
const { USERS_TABLE_NAME } = require("../../constants/usersConstants");
const { USER_GOALS_TABLE_NAME } = require("../../constants/userGoalsConsants");
const { FOODS_TABLE_NAME } = require("../../constants/foodsConstants");
const { findRecordById } = require("../../utils/commonUtils");
const { getDayDiff, getCalorieNeeds } = require("../../utils/bmiUtils");
const {
  findFoodHistoryByUserIdAndDate,
} = require("../../utils/foodHistoriesUtils");

jest.mock("../../utils/commonUtils", () => ({
  findRecordById: jest.fn(),
}));

jest.mock("../../utils/bmiUtils", () => ({
  getDayDiff: jest.fn(),
  getCalorieNeeds: jest.fn(),
}));

jest.mock("../../utils/foodHistoriesUtils", () => ({
  findFoodHistoryByUserIdAndDate: jest.fn(),
}));

describe("Calorie Deficit Utils", () => {
  const rawToday = "2026-01-01";
  const today = new Date(rawToday);
  const userId = "user-123";

  const userData = {
    id: userId,
    register_date: "2024-03-01",
    birthday: "1990-01-01",
    sex: SEX.MALE,
  };
  const userGoalData = {
    user_id: userId,
    activity_level: ACTIVITY_LEVEL.ACTIVE,
    height: 180,
    starting_weight: 80,
  };

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe("[calculateLast7DaysCalorieDeficits]", () => {
    let spyCalculateCalorieDeficit;

    const calorieNeeds = 2300;
    const expectedThreshold = 7;

    beforeEach(() => {
      spyCalculateCalorieDeficit = jest
        .spyOn(calorieDeficitUtils, "calculateCalorieDeficit")
        .mockImplementation(async ({ index }) => ({
          index,
        }));

      getCalorieNeeds.mockReturnValue(calorieNeeds);
    });

    test("returns an empty array when user registered today", async () => {
      findRecordById.mockResolvedValueOnce(userData);
      getDayDiff.mockReturnValue(0);

      const result =
        await calorieDeficitUtils.calculateLast7DaysCalorieDeficits({
          userId,
          today: rawToday,
        });

      expect(result).toEqual([]);
      expect(findRecordById).toHaveBeenCalledWith({
        tableName: USERS_TABLE_NAME,
        id: userId,
      });
      expect(getCalorieNeeds).not.toHaveBeenCalled();
      expect(spyCalculateCalorieDeficit).not.toHaveBeenCalled();
    });

    test("calculates deficits for the most recent 7 days when user registered earlier", async () => {
      findRecordById
        .mockResolvedValueOnce(userData)
        .mockResolvedValueOnce(userGoalData);
      getDayDiff.mockReturnValue(10);

      const result =
        await calorieDeficitUtils.calculateLast7DaysCalorieDeficits({
          userId,
          today: rawToday,
        });

      expect(result).toEqual(
        Array.from({ length: expectedThreshold }, (_, idx) => ({
          index: expectedThreshold - idx,
        })),
      );
      expect(findRecordById).toHaveBeenNthCalledWith(1, {
        tableName: USERS_TABLE_NAME,
        id: userId,
      });
      expect(findRecordById).toHaveBeenNthCalledWith(2, {
        tableName: USER_GOALS_TABLE_NAME,
        id: userId,
        idName: "user_id",
      });
      expect(getDayDiff).toHaveBeenCalledWith(userData.register_date, today);
      expect(getCalorieNeeds).toHaveBeenCalledWith({
        activityLevel: userGoalData.activity_level,
        birthday: userData.birthday,
        height: userGoalData.height,
        sex: userData.sex,
        weight: userGoalData.starting_weight,
        today,
      });
      expect(spyCalculateCalorieDeficit).toHaveBeenCalledTimes(
        expectedThreshold,
      );
      for (let i = 1; i <= expectedThreshold; i += 1) {
        expect(spyCalculateCalorieDeficit).toHaveBeenNthCalledWith(i, {
          userId,
          index: i,
          calorieNeeds,
          today,
        });
      }
    });
  });

  describe("[calculateCalorieDeficit]", () => {
    let expectedDate;

    const index = 2;
    const calorieNeeds = 2000;
    const expectedConsumed =
      Math.ceil((250 / 100) * 150) + Math.ceil((120.5 / 100) * 200.5);

    const foodHistory = [
      { food_id: "food-1", quantity: "150" },
      { food_id: "food-2", quantity: "200.5" },
    ];

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(today);

      expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - index);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("returns full calorie needs when no food history is found", async () => {
      findFoodHistoryByUserIdAndDate.mockResolvedValue([]);

      const result = await calorieDeficitUtils.calculateCalorieDeficit({
        userId,
        index,
        calorieNeeds,
        today,
      });

      expect(findFoodHistoryByUserIdAndDate).toHaveBeenCalledWith({
        userId,
        date: expectedDate,
      });
      expect(findRecordById).not.toHaveBeenCalled();
      expect(result).toEqual({
        date: expectedDate,
        calories: calorieNeeds,
      });
    });

    test("subtracts consumed calories based on food history", async () => {
      findFoodHistoryByUserIdAndDate.mockResolvedValue(foodHistory);
      findRecordById
        .mockResolvedValueOnce({ id: "food-1", kcal_per_100_g: "250" })
        .mockResolvedValueOnce({ id: "food-2", kcal_per_100_g: "120.5" });

      const result = await calorieDeficitUtils.calculateCalorieDeficit({
        userId,
        index,
        calorieNeeds,
        today,
      });

      expect(findFoodHistoryByUserIdAndDate).toHaveBeenCalledWith({
        userId,
        date: expectedDate,
      });
      expect(findRecordById).toHaveBeenNthCalledWith(1, {
        tableName: FOODS_TABLE_NAME,
        id: "food-1",
      });
      expect(findRecordById).toHaveBeenNthCalledWith(2, {
        tableName: FOODS_TABLE_NAME,
        id: "food-2",
      });
      expect(result).toEqual({
        date: expectedDate,
        calories: calorieNeeds - expectedConsumed,
      });
    });
  });
});
