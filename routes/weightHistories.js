const express = require("express");

const { pool } = require("../db");
const { INTERNAL_SERVER_ERROR } = require("../constants/commonConstants");
const {
  WEIGHT_HISTORIES_TABLE_NAME,
  WEIGHT_HISTORIES_SELECT_FIELDS_SQL,
} = require("../constants/weightHistoryConstants");
const {
  validateDateField,
  validateResourceAccess,
  validateWeightHistoryPayload,
} = require("../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  removeRecord,
  findRecordById,
  buildErrorStatusAndMessage,
} = require("../utils/commonUtils");
const {
  findWeightHistoryByUserIdAndDate,
  checkForConflictingEntry,
  findLast7WeightHistoriesByUserId,
} = require("../utils/weightHistoriesUtils");

const router = express.Router();
const tableName = WEIGHT_HISTORIES_TABLE_NAME;

async function postWeightHistoryByUserId(req, res) {
  const userId = req.params.userId;
  const newWeightHistory = req.body || {};

  try {
    const validatedWeightHistory = validateWeightHistoryPayload({
      weightHistory: newWeightHistory,
    });

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    await findWeightHistoryByUserIdAndDate({
      userId,
      date: newWeightHistory.date,
      isPosting: true,
    });

    const row = await insertRecord({
      tableName,
      data: {
        ...validatedWeightHistory,
        user_id: userId,
      },
    });

    res.status(201).json({
      message: "Weight entry created",
      weightEntry: row,
    });
  } catch (error) {
    console.error("Failed to create weight history entry", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getWeightHistories(_, res) {
  try {
    const { rows } = await pool.query(
      `
        SELECT ${WEIGHT_HISTORIES_SELECT_FIELDS_SQL}
        FROM weight_histories
        ORDER BY date DESC, id DESC
      `,
    );
    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve weight history entries", error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR });
  }
}

async function getWeightHistoriesByUserId(req, res) {
  const userId = req.params.userId;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const row = await findRecordById({
      tableName,
      id: userId,
      idName: "user_id",
      orderBy: "ORDER BY date DESC",
      shouldReturnMultipleRows: true,
    });

    res.json(row);
  } catch (error) {
    console.error("Failed to retrieve weight history entry by user id", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getLast7WeightHistoriesByUserId(req, res) {
  const userId = req.params.userId;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const rows = await findLast7WeightHistoriesByUserId({ userId });

    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve last 7 weight history entry", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getLastWeightHistoryByUserId(req, res) {
  const userId = req.params.userId;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const rows = await findLast7WeightHistoriesByUserId({ userId });

    res.json(rows.reverse()[0]);
  } catch (error) {
    console.error("Failed to retrieve last weight history entry", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getWeightHistoriesByUserIdAndByDate(req, res) {
  const userId = req.params.userId;
  const date = req.params.date;

  try {
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });
    const validatedDate = validateDateField(date);

    const row = await findWeightHistoryByUserIdAndDate({
      userId,
      date: new Date(validatedDate),
    });

    res.json(row || {});
  } catch (error) {
    console.error("Failed to retrieve today's weight history entry", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function putWeightHistoryById(req, res) {
  const entryId = req.params.id;
  const updatedFoodHistory = req.body || {};

  try {
    const validatedWeightHistory = validateWeightHistoryPayload({
      weightHistory: updatedFoodHistory,
    });

    const existingWeightHistory = await findRecordById({
      tableName,
      id: entryId,
    });
    const userId = existingWeightHistory?.user_id;

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    await checkForConflictingEntry({
      userId,
      date: updatedFoodHistory.date,
      entryId,
    });

    const rows = await updateRecord({
      tableName,
      data: {
        ...validatedWeightHistory,
        user_id: userId,
        id: entryId,
      },
    });

    res.json({
      message: "Weight entry updated",
      weightEntry: rows[0],
    });
  } catch (error) {
    console.error("Failed to update weight history entry", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function deleteWeightHistoryById(req, res) {
  const entryId = req.params.id;

  try {
    const weightHistory = await findRecordById({ tableName, id: entryId });
    const userId = weightHistory.user_id;

    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const rows = await removeRecord({
      tableName: WEIGHT_HISTORIES_TABLE_NAME,
      id: entryId,
    });

    res.json({
      message: "Weight entry deleted",
      weightEntry: rows[0],
    });
  } catch (error) {
    console.error("Failed to delete weight history entry", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

router.post("/:userId", postWeightHistoryByUserId);
router.get("/", getWeightHistories);
router.get("/:userId", getWeightHistoriesByUserId);
router.get("/last7/:userId", getLast7WeightHistoriesByUserId);
router.get("/last/:userId", getLastWeightHistoryByUserId);
router.get("/user-id/:userId/date/:date", getWeightHistoriesByUserIdAndByDate);
router.put("/:id", putWeightHistoryById);
router.delete("/:id", deleteWeightHistoryById);

module.exports = router;
