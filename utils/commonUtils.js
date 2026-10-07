const { pool } = require("../db");
const {
  DATE_FIELDS,
  MAP_TABLE_NAME_TO_SQL_FIELDS,
  INTERNAL_SERVER_ERROR,
  MAP_TABLE_NAME_TO_ERROR_NAME,
} = require("../constants/commonConstants");

// DB
async function insertRecord({ tableName, data }) {
  const { fields, valueParameterazition, values } =
    module.exports.buildInsertQueryParts({
      data,
    });

  const { rows } = await pool.query(
    `
      INSERT INTO ${tableName} (${fields.join(", ")})
      VALUES (${valueParameterazition.join(", ")})
      RETURNING ${MAP_TABLE_NAME_TO_SQL_FIELDS[tableName]}
    `,
    values,
  );

  return rows[0];
}

async function updateRecord({ tableName, data, idName = "id" }) {
  const { setClauses, values } =
    module.exports.createSetClausesAndValuesForUpdate({
      updateWhereClauseValue: data[idName],
      data,
    });

  const query = `
    UPDATE ${tableName}
    SET ${setClauses.join(", ")}
    WHERE ${idName} = $1
    RETURNING ${MAP_TABLE_NAME_TO_SQL_FIELDS[tableName]}
    `;
  const { rows } = await pool.query(query, values);

  return rows;
}

async function removeRecord({ tableName, id, idName = "id" }) {
  const { rows } = await pool.query(
    `
        DELETE FROM ${tableName}
        WHERE ${idName} = $1
        RETURNING ${MAP_TABLE_NAME_TO_SQL_FIELDS[tableName]}
      `,
    [id],
  );

  if (rows.length === 0) {
    const error = new Error(
      `${MAP_TABLE_NAME_TO_ERROR_NAME[tableName]} not found`,
    );
    error.status = 404;
    throw error;
  }

  return rows;
}

async function findRecordById({
  tableName,
  id,
  idName = "id",
  orderBy = "",
  isUserGoalPosting = false,
  shouldReturnMultipleRows = false,
  shoudThrowEntryNotFoundError = true,
}) {
  const { rows } = await pool.query(
    `
      SELECT ${MAP_TABLE_NAME_TO_SQL_FIELDS[tableName]} 
      FROM ${tableName} 
      WHERE ${idName} = $1
      ${orderBy}`,
    [id],
  );

  if (isUserGoalPosting && rows.length > 0) {
    const error = new Error("A goal already exists for this user");
    error.status = 409;
    throw error;
  }

  if (!isUserGoalPosting && rows.length === 0 && shoudThrowEntryNotFoundError) {
    const error = new Error(
      `${MAP_TABLE_NAME_TO_ERROR_NAME[tableName]} not found`,
    );
    error.status = 404;
    throw error;
  }

  return shouldReturnMultipleRows ? rows : rows[0];
}

// PARSERS
function parseInteger(value) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

function parseDecimal(value) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

// OTHER UTILS
function buildErrorStatusAndMessage(error) {
  const status = error.status || 500;
  const message = status === 500 ? INTERNAL_SERVER_ERROR : error.message;
  return { status, message };
}

// HELPERS
function buildInsertQueryParts({ data }) {
  const fields = Object.keys(data);

  const valueParameterazition = [];
  const values = [];

  fields.forEach((field, index) => {
    const paramIndex = index + 1;

    valueParameterazition.push(
      `$${paramIndex}${DATE_FIELDS.includes(field) ? "::timestamp" : ""}`,
    );

    values.push(data[field]);
  });

  return { fields, valueParameterazition, values };
}

function createSetClausesAndValuesForUpdate({ updateWhereClauseValue, data }) {
  const setClauses = [];
  const values = [updateWhereClauseValue];

  Object.keys(data).forEach((field, index) => {
    const paramIndex = index + 2;

    if (DATE_FIELDS.includes(field)) {
      setClauses.push(`${field} = $${paramIndex}::timestamp`);
    } else {
      setClauses.push(`${field} = $${paramIndex}`);
    }

    values.push(data[field]);
  });

  return { setClauses, values };
}

function getAPIKey(apiKeyName) {
  const apiKey = process.env[apiKeyName];

  if (!apiKey) {
    const error = new Error(`${apiKeyName} environment variable is not set`);
    error.status = 500;
    throw error;
  }

  return apiKey;
}

async function handleFetchResponseErrorsAndData(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "An error occured");
  }

  return data;
}

module.exports = {
  insertRecord,
  updateRecord,
  removeRecord,
  findRecordById,
  parseInteger,
  parseDecimal,
  buildErrorStatusAndMessage,
  buildInsertQueryParts,
  createSetClausesAndValuesForUpdate,
  getAPIKey,
  handleFetchResponseErrorsAndData,
};
