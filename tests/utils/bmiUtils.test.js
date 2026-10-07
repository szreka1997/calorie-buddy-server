const { ACTIVITY_LEVEL, SEX } = require("../../constants/bmiConstants");
const {
  getDayDiff,
  getAge,
  getBMR,
  getCalorieNeeds,
} = require("../../utils/bmiUtils");

describe("BMI Utils", () => {
  const today = "2026-01-01";

  describe("[getDayDiff]", () => {
    test("returns absolute difference in days", () => {
      expect(getDayDiff("2024-01-01", "2024-01-05")).toEqual(4);
      expect(getDayDiff("2024-01-05", "2024-01-01")).toEqual(4);
    });

    test("handles same day", () => {
      expect(getDayDiff("2024-01-01", "2024-01-01")).toEqual(0);
    });

    test("handles big differences", () => {
      expect(getDayDiff("2024-01-01", "2024-02-10")).toEqual(40);
      expect(getDayDiff("2024-02-10", "2024-01-01")).toEqual(40);
      expect(getDayDiff("2025-01-01", "2026-01-01")).toEqual(365);
    });
  });

  describe("[getAge]", () => {
    function buildDate({ yearsAgo, monthsAgo = 0, daysOffset = 0 }) {
      const parsedToday = new Date(today);
      const date = new Date(
        parsedToday.getFullYear() - yearsAgo,
        parsedToday.getMonth() - monthsAgo,
        parsedToday.getDate() + daysOffset,
      );
      return date;
    }

    test("returns age when birthday is today", () => {
      const birthday = buildDate({
        yearsAgo: 30,
      });

      expect(getAge(birthday, today)).toBe(30);
    });

    test("returns age minus one when birthday is tomorrow", () => {
      const birthday = buildDate({
        yearsAgo: 30,
        daysOffset: 1,
      });

      expect(getAge(birthday, today)).toBe(29);
    });
  });

  describe("[getBMR]", () => {
    const birthday = "1990-01-01";
    const height = 180;
    const weight = 75;
    const age = new Date().getFullYear() - 1990;

    test("calculates male BMR using Mifflin-St Jeor equation", () => {
      const bmr = getBMR({
        sex: SEX.MALE,
        birthday,
        height,
        weight,
        today,
      });

      const expected = Math.round(10 * weight + 6.25 * height - 5 * age + 5);

      expect(bmr).toBe(expected);
    });

    test("calculates female BMR using Mifflin-St Jeor equation", () => {
      const bmr = getBMR({
        sex: SEX.FEMALE,
        birthday,
        height,
        weight,
        today,
      });

      const expected = Math.round(10 * weight + 6.25 * height - 5 * age - 161);

      expect(bmr).toBe(expected);
    });
  });

  describe("[getCalorieNeeds]", () => {
    const params = {
      sex: SEX.FEMALE,
      birthday: "1995-05-01",
      height: 165,
      weight: 60,
    };

    test.each([
      [ACTIVITY_LEVEL.NOT_VERY_ACTIVE.title, 1.2],
      [ACTIVITY_LEVEL.LIGHTLY_ACTIVE.title, 1.375],
      [ACTIVITY_LEVEL.ACTIVE.title, 1.55],
      [ACTIVITY_LEVEL.VERY_ACTIVE.title, 1.725],
      [ACTIVITY_LEVEL.EXTRA_ACTIVE.title, 1.9],
    ])(
      "calculates calorie needs for %s activity level",
      (activityLevel, modifierAmount) => {
        const baseBmr = parseInt(getBMR(params));

        const calorieNeeds = getCalorieNeeds({
          ...params,
          activityLevel,
        });

        expect(calorieNeeds).toEqual(Math.round(baseBmr * modifierAmount));
      },
    );

    test("throws error for invalid activity level", () => {
      expect(() =>
        getCalorieNeeds({
          ...params,
          activityLevel: "Unknown",
        }),
      ).toThrow("Invalid parameter: activity_level!");
    });
  });
});
