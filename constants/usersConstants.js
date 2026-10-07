const USERS_REQUIRED_FIELDS = [
  "first_name",
  "last_name",
  "username",
  "register_date",
];

const USERS_ALLOWED_INSERT_FIELDS = [...USERS_REQUIRED_FIELDS];
const USERS_ALLOWED_UPDATE_FIELDS = ["birthday", "sex", "username"];

const USERS_FIELDS = [
  "id",
  "email_address",
  ...USERS_REQUIRED_FIELDS,
  "sex",
  "birthday",
  "firebase_id_token",
  "firebase_refresh_token",
];

const USERS_SELECT_FIELDS_SQL = USERS_FIELDS.join(", ");

const USERS_TABLE_NAME = "users";

module.exports = {
  USERS_REQUIRED_FIELDS,
  USERS_ALLOWED_INSERT_FIELDS,
  USERS_ALLOWED_UPDATE_FIELDS,
  USERS_FIELDS,
  USERS_SELECT_FIELDS_SQL,
  USERS_TABLE_NAME,
};
