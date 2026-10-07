const { pool } = require("../db");
const {
  WEIGHT_HISTORIES_SELECT_FIELDS_SQL,
  WEIGHT_HISTORIES_TABLE_NAME,
} = require("../constants/weightHistoryConstants");
const { findRecordById } = require("../utils/commonUtils");

async function findLast7WeightHistoriesByUserId({ userId }) {
  const rows = await findRecordById({
    tableName: WEIGHT_HISTORIES_TABLE_NAME,
    id: userId,
    idName: "user_id",
    orderBy: "ORDER BY date DESC",
    shouldReturnMultipleRows: true,
  });
  const results = rows.length < 7 ? rows.slice() : rows.slice(0, 7);

  return results.reverse();
}

async function findWeightHistoryByUserIdAndDate({
  userId,
  date,
  isPosting = false,
}) {
  const { rows } = await pool.query(
    `
      SELECT ${WEIGHT_HISTORIES_SELECT_FIELDS_SQL}
      FROM ${WEIGHT_HISTORIES_TABLE_NAME}
      WHERE user_id = $1
        AND date::date = $2::date
    `,
    [userId, date],
  );

  if (isPosting && rows.length > 0) {
    const error = new Error("Weight already recorded for this day");
    error.status = 409;
    throw error;
  }

  return rows[0];
}

async function checkForConflictingEntry({ userId, date, entryId }) {
  const { rows } = await pool.query(
    `
      SELECT ${WEIGHT_HISTORIES_SELECT_FIELDS_SQL}
      FROM ${WEIGHT_HISTORIES_TABLE_NAME}
      WHERE user_id = $1
        AND date::date = $2::date
        AND id <> $3
    `,
    [userId, date, entryId],
  );

  if (rows.length > 0) {
    const error = new Error("Weight already recorded for this day");
    error.status = 409;
    throw error;
  }

  return rows;
}

module.exports = {
  findLast7WeightHistoriesByUserId,
  findWeightHistoryByUserIdAndDate,
  checkForConflictingEntry,
};
