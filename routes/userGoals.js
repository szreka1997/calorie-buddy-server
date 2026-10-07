const express = require("express");

const { pool } = require("../db");
const { INTERNAL_SERVER_ERROR } = require("../constants/commonConstants");
const {
  USER_GOALS_TABLE_NAME,
  USER_GOALS_SELECT_FIELDS_SQL,
} = require("../constants/userGoalsConsants");
const {
  validateUserGoalPayload,
  validateResourceAccess,
} = require("../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  removeRecord,
  findRecordById,
  buildErrorStatusAndMessage,
} = require("../utils/commonUtils");

const router = express.Router();
const tableName = USER_GOALS_TABLE_NAME;
const idName = "user_id";

async function postUserByUserId(req, res) {
  const userId = req.params.userId;
  const newUserGoal = req.body || {};

  try {
    const validatedUserGoal = validateUserGoalPayload({
      userGoal: newUserGoal,
    });

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    await findRecordById({
      tableName,
      id: userId,
      idName,
      isUserGoalPosting: true,
    });

    const row = await insertRecord({
      tableName: USER_GOALS_TABLE_NAME,
      data: {
        ...validatedUserGoal,
        user_id: userId,
      },
    });

    res.status(201).json({
      message: "User goal created",
      goal: row,
    });
  } catch (error) {
    console.error("Failed to create user goal", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getUserGoals(_, res) {
  try {
    const { rows } = await pool.query(
      `
        SELECT ${USER_GOALS_SELECT_FIELDS_SQL}
        FROM user_goals
        ORDER BY user_id
      `,
    );
    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve user goals", error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR });
  }
}

async function getUserGoalByUserId(req, res) {
  const userId = req.params.userId;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const row = await findRecordById({
      tableName,
      id: userId,
      idName,
    });

    res.json(row);
  } catch (error) {
    console.error("Failed to retrieve user goal", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function putUserGoalByUserId(req, res) {
  const userId = req.params.userId;
  const updatedUserGoal = req.body || {};

  try {
    const validatedUserGoal = validateUserGoalPayload({
      userGoal: updatedUserGoal,
    });

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    await findRecordById({ tableName, id: userId, idName });

    const rows = await updateRecord({
      tableName: USER_GOALS_TABLE_NAME,
      idName,
      data: {
        ...validatedUserGoal,
        user_id: userId,
      },
    });

    res.json({
      message: "User goal updated",
      goal: rows[0],
    });
  } catch (error) {
    console.error("Failed to update user goal", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function deleteUserGoalByUserId(req, res) {
  const userId = req.params.userId;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const rows = await removeRecord({
      tableName: USER_GOALS_TABLE_NAME,
      id: userId,
      idName,
    });

    res.json({
      message: "User goal deleted",
      goal: rows[0],
    });
  } catch (error) {
    console.error("Failed to delete user goal", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

router.post("/:userId", postUserByUserId);
router.get("/", getUserGoals);
router.get("/:userId", getUserGoalByUserId);
router.put("/:userId", putUserGoalByUserId);
router.delete("/:userId", deleteUserGoalByUserId);

module.exports = router;
