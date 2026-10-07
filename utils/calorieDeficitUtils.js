const { USERS_TABLE_NAME } = require("../constants/usersConstants");
const { USER_GOALS_TABLE_NAME } = require("../constants/userGoalsConsants");
const { FOODS_TABLE_NAME } = require("../constants/foodsConstants");
const { findRecordById } = require("./commonUtils");
const { getDayDiff, getCalorieNeeds } = require("../utils/bmiUtils");
const { findFoodHistoryByUserIdAndDate } = require("./foodHistoriesUtils");

async function calculateLast7DaysCalorieDeficits({ userId, today }) {
  const userData = await findRecordById({
    tableName: USERS_TABLE_NAME,
    id: userId,
  });

  today = new Date(today);
  const registerDate = userData.register_date;
  const diffDays = getDayDiff(registerDate, today);
  const threshold = Math.min(diffDays, 7);

  if (diffDays === 0) return [];

  const userGoalData = await findRecordById({
    tableName: USER_GOALS_TABLE_NAME,
    id: userId,
    idName: "user_id",
  });
  const calorieNeeds = getCalorieNeeds({
    activityLevel: userGoalData.activity_level,
    birthday: userData.birthday,
    height: userGoalData.height,
    sex: userData.sex,
    weight: userGoalData.starting_weight,
    today,
  });

  let i = 1;
  const rows = [];
  while (i <= threshold) {
    const row = await module.exports.calculateCalorieDeficit({
      userId,
      index: i,
      calorieNeeds,
      today,
    });
    rows.push(row);
    i = i + 1;
  }

  return rows.reverse();
}

async function calculateCalorieDeficit({ userId, index, calorieNeeds, today }) {
  const prevDay = new Date(today);
  prevDay.setDate(today.getDate() - index);

  const localFoodHistory = await findFoodHistoryByUserIdAndDate({
    userId,
    date: prevDay,
  });

  let calories = 0;
  await Promise.all(
    localFoodHistory.map(async (item) => {
      const food = await findRecordById({
        tableName: FOODS_TABLE_NAME,
        id: item.food_id,
      });

      calories =
        calories +
        Math.ceil(
          (parseFloat(food.kcal_per_100_g) / 100) * parseFloat(item.quantity),
        );
    }),
  );

  return {
    date: prevDay,
    calories: parseInt(calorieNeeds) - calories,
  };
}

module.exports = {
  calculateLast7DaysCalorieDeficits,
  calculateCalorieDeficit,
};
