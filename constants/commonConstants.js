const {
  USERS_TABLE_NAME,
  USERS_SELECT_FIELDS_SQL,
} = require("./usersConstants");
const {
  USER_GOALS_TABLE_NAME,
  USER_GOALS_SELECT_FIELDS_SQL,
} = require("./userGoalsConsants");
const {
  WEIGHT_HISTORIES_TABLE_NAME,
  WEIGHT_HISTORIES_SELECT_FIELDS_SQL,
} = require("./weightHistoryConstants");
const {
  FOODS_TABLE_NAME,
  FOODS_SELECT_FIELDS_SQL,
} = require("./foodsConstants");
const {
  MEALS_TABLE_NAME,
  MEALS_SELECT_FIELDS_SQL,
} = require("./mealsConstants");
const {
  MEAL_FOOD_RELATIONS_TABLE_NAME,
  MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL,
} = require("./mealFoodRelationsConstants");
const {
  FOOD_HISTORIES_TABLE_NAME,
  FOOD_HISTORIES_SELECT_FIELDS_SQL,
} = require("./foodHistoriesConstants");

const FIREBASE_BASE_URL = "https://identitytoolkit.googleapis.com/v1/accounts";
const FIREBASE_BASE_REFRESH_URL = "https://securetoken.googleapis.com/v1/token";
const SIGN_UP_MODE = "signUp";
const SIGN_IN_MODE = "signInWithPassword";

const JSON_HEADERS = { "Content-Type": "application/json" };

const INTERNAL_SERVER_ERROR = "Internal server error";

const DATE_FIELDS = [
  "birthday",
  "register_date",
  "starting_date",
  "goal_date",
  "date",
];

const MAP_TABLE_NAME_TO_SQL_FIELDS = {
  [USERS_TABLE_NAME]: USERS_SELECT_FIELDS_SQL,
  [USER_GOALS_TABLE_NAME]: USER_GOALS_SELECT_FIELDS_SQL,
  [WEIGHT_HISTORIES_TABLE_NAME]: WEIGHT_HISTORIES_SELECT_FIELDS_SQL,
  [FOODS_TABLE_NAME]: FOODS_SELECT_FIELDS_SQL,
  [MEALS_TABLE_NAME]: MEALS_SELECT_FIELDS_SQL,
  [MEAL_FOOD_RELATIONS_TABLE_NAME]: MEAL_FOOD_RELATIONS_SELECT_FIELDS_SQL,
  [FOOD_HISTORIES_TABLE_NAME]: FOOD_HISTORIES_SELECT_FIELDS_SQL,
};

const MAP_TABLE_NAME_TO_ERROR_NAME = {
  [USERS_TABLE_NAME]: "User",
  [USER_GOALS_TABLE_NAME]: "User goal",
  [WEIGHT_HISTORIES_TABLE_NAME]: "Weight history",
  [FOODS_TABLE_NAME]: "Food",
  [MEALS_TABLE_NAME]: "Meal",
  [MEAL_FOOD_RELATIONS_TABLE_NAME]: "Meal-food relation",
  [FOOD_HISTORIES_TABLE_NAME]: "Food history",
};

module.exports = {
  FIREBASE_BASE_URL,
  FIREBASE_BASE_REFRESH_URL,
  SIGN_IN_MODE,
  SIGN_UP_MODE,
  JSON_HEADERS,
  INTERNAL_SERVER_ERROR,
  DATE_FIELDS,
  MAP_TABLE_NAME_TO_SQL_FIELDS,
  MAP_TABLE_NAME_TO_ERROR_NAME,
};
