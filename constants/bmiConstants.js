const SEX = {
  MALE: "Male",
  FEMALE: "Female",
};

const MEAL_CATEGORIES = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
  LIQUID_CALORIES: "Liquid Calories",
};

// https://www.calculator.net/bmr-calculator.html?cage=26&csex=f&cheightfeet=5&cheightinch=10&cpound=160&cheightmeter=180&ckg=65&cmop=0&coutunit=c&cformula=m&cfatpct=20&ctype=metric&x=Calculate
const ACTIVITY_LEVEL = {
  NOT_VERY_ACTIVE: {
    title: "Not Very Active",
    details: "Little or no exercise.",
  },
  LIGHTLY_ACTIVE: {
    title: "Lightly Active",
    details: "Exercise 1-3 times per week.",
  },
  ACTIVE: {
    title: "Active",
    details: "Exercise 4-5 times per week.",
  },
  VERY_ACTIVE: {
    title: "Very Active",
    details: "Daily exercise or intense exercise 3-4 times per week.",
  },
  EXTRA_ACTIVE: {
    title: "Extra Active",
    details: "Intense exercise 6-7 times/week",
  },
};

module.exports = {
  SEX,
  MEAL_CATEGORIES,
  ACTIVITY_LEVEL,
};
