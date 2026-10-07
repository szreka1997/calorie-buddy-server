const USER_GOALS_REQUIRED_FIELDS = [
  "height",
  "starting_weight",
  "goal_weight",
  "activity_level",
  "goal_calories",
  "goal_carbs",
  "goal_fat",
  "goal_protein",
  "starting_date",
  "plan",
];

const USER_GOALS_ALLOWED_FIELDS = [
  ...USER_GOALS_REQUIRED_FIELDS,
  "goal_date",
  "weekly_rate",
];

const USER_GOALS_FIELDS = ["user_id", ...USER_GOALS_ALLOWED_FIELDS];

const USER_GOALS_SELECT_FIELDS_SQL = USER_GOALS_FIELDS.join(", ");

const USER_GOALS_TABLE_NAME = "user_goals";

module.exports = {
  USER_GOALS_REQUIRED_FIELDS,
  USER_GOALS_ALLOWED_FIELDS,
  USER_GOALS_FIELDS,
  USER_GOALS_SELECT_FIELDS_SQL,
  USER_GOALS_TABLE_NAME,
};
