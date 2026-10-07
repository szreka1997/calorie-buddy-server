const request = require("supertest");
const express = require("express");
const weightHistoriesRouter = require("../../routes/weightHistories");

const { pool } = require("../../db");
const { INTERNAL_SERVER_ERROR } = require("../../constants/commonConstants");
const {
  WEIGHT_HISTORIES_TABLE_NAME,
  WEIGHT_HISTORIES_SELECT_FIELDS_SQL,
} = require("../../constants/weightHistoryConstants");
const {
  validateDateField,
  validateResourceAccess,
  validateWeightHistoryPayload,
} = require("../../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  removeRecord,
  findRecordById,
  buildErrorStatusAndMessage,
} = require("../../utils/commonUtils");
const {
  findWeightHistoryByUserIdAndDate,
  checkForConflictingEntry,
  findLast7WeightHistoriesByUserId,
} = require("../../utils/weightHistoriesUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/validationUtils", () => ({
  validateDateField: jest.fn(),
  validateResourceAccess: jest.fn(),
  validateWeightHistoryPayload: jest.fn(),
}));

jest.mock("../../utils/commonUtils", () => ({
  insertRecord: jest.fn(),
  updateRecord: jest.fn(),
  removeRecord: jest.fn(),
  findRecordById: jest.fn(),
  buildErrorStatusAndMessage: jest.fn(),
}));

jest.mock("../../utils/weightHistoriesUtils", () => ({
  findWeightHistoryByUserIdAndDate: jest.fn(),
  checkForConflictingEntry: jest.fn(),
  findLast7WeightHistoriesByUserId: jest.fn(),
}));

describe("Weight Histories Routes", () => {
  const userId = "user-1";
  const entryId = "entry-1";
  const bearerToken = "bearer-token";
  const tableName = WEIGHT_HISTORIES_TABLE_NAME;
  const date = "2026-01-01";

  const weightHistoryPayload = {
    date: "2024-03-26",
    weight: "83.7",
  };

  const validatedWeightHistory = {
    ...weightHistoryPayload,
    weight: 83.7,
  };

  const weightHistory = {
    id: entryId,
    user_id: userId,
    ...validatedWeightHistory,
  };

  const updatedWeightHistory = {
    ...weightHistory,
    weight: 82.9,
  };

  const error = new Error("An error occurred");
  const mockError = { status: 400, message: "ERROR!" };

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/weight-histories", weightHistoriesRouter);

    return app;
  }

  beforeEach(() => {
    validateDateField.mockReturnValue(date);
    validateResourceAccess.mockResolvedValue({ id: userId });
    validateWeightHistoryPayload.mockReturnValue(validatedWeightHistory);

    insertRecord.mockResolvedValue(weightHistory);
    updateRecord.mockResolvedValue([updatedWeightHistory]);
    removeRecord.mockResolvedValue([weightHistory]);
    findRecordById.mockResolvedValue(weightHistory);
    buildErrorStatusAndMessage.mockReturnValue(mockError);

    findWeightHistoryByUserIdAndDate.mockResolvedValue(null);
    checkForConflictingEntry.mockResolvedValue([]);
    findLast7WeightHistoriesByUserId.mockResolvedValue([weightHistory]);

    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /weight-histories/:userId - [postWeightHistoryByUserId]", () => {
    const path = `/weight-histories/${userId}`;

    test("returns error when payload validation fails", async () => {
      const app = createApp();

      validateWeightHistoryPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .post(path)
        .send()
        .expect(mockError.status);

      expect(validateWeightHistoryPayload).toHaveBeenCalledWith({
        weightHistory: {},
      });
      expect(validateResourceAccess).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
      expect(insertRecord).not.toHaveBeenCalled();
    });

    test("creates weight history when payload is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .post(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .send(weightHistoryPayload)
        .expect(201);

      expect(validateWeightHistoryPayload).toHaveBeenCalledWith({
        weightHistory: weightHistoryPayload,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(findWeightHistoryByUserIdAndDate).toHaveBeenCalledWith({
        userId,
        date: weightHistoryPayload.date,
        isPosting: true,
      });
      expect(insertRecord).toHaveBeenCalledWith({
        tableName,
        data: { ...validatedWeightHistory, user_id: userId },
      });
      expect(response.body).toEqual({
        message: "Weight entry created",
        weightEntry: weightHistory,
      });
    });
  });

  describe("GET /weight-histories/ - [getWeightHistories]", () => {
    const path = "/weight-histories/";

    test("returns 500 when database read fails", async () => {
      const app = createApp();

      pool.query.mockRejectedValue(error);

      const response = await request(app).get(path).expect(500);
      const [queryText, values] = pool.query.mock.calls[0];

      expect(queryText).toContain(
        `SELECT ${WEIGHT_HISTORIES_SELECT_FIELDS_SQL}`,
      );
      expect(queryText).toContain("FROM weight_histories");
      expect(values).toBeUndefined();
      expect(response.body).toEqual({ error: INTERNAL_SERVER_ERROR });
    });

    test("returns weight histories when database read succeeds", async () => {
      const app = createApp();

      pool.query.mockResolvedValueOnce({ rows: [weightHistory] });

      const response = await request(app).get(path).expect(200);

      expect(response.body).toEqual([weightHistory]);
    });
  });

  describe("GET /weight-histories/:userId - [getWeightHistoriesByUserId]", () => {
    const path = `/weight-histories/${userId}`;

    test("returns weight histories when retrieval succeeds", async () => {
      const app = createApp();

      findRecordById.mockResolvedValueOnce([weightHistory]);

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: userId,
        idName: "user_id",
        orderBy: "ORDER BY date DESC",
        shouldReturnMultipleRows: true,
      });
      expect(response.body).toEqual([weightHistory]);
    });

    test("returns error when retrieval fails", async () => {
      const app = createApp();

      findRecordById.mockRejectedValueOnce(error);

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(mockError.status);

      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });
  });

  describe("GET /weight-histories/last7/:userId - [getLast7WeightHistoriesByUserId]", () => {
    const path = `/weight-histories/last7/${userId}`;

    test("returns last 7 weight histories when retrieval succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(findLast7WeightHistoriesByUserId).toHaveBeenCalledWith({
        userId,
      });
      expect(response.body).toEqual([weightHistory]);
    });

    test("returns error when retrieval fails", async () => {
      const app = createApp();

      findLast7WeightHistoriesByUserId.mockRejectedValueOnce(error);

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(mockError.status);

      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });
  });

  describe("GET /weight-histories/last/:userId - [getLastWeightHistoryByUserId]", () => {
    const path = `/weight-histories/last/${userId}`;

    test("returns last weight history when retrieval succeeds", async () => {
      const app = createApp();
      const olderEntry = { ...weightHistory, id: "older-entry" };
      const latestEntry = {
        ...weightHistory,
        id: "latest-entry",
        weight: 82.5,
      };

      findLast7WeightHistoriesByUserId.mockResolvedValueOnce([
        olderEntry,
        latestEntry,
      ]);

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(findLast7WeightHistoriesByUserId).toHaveBeenCalledWith({
        userId,
      });
      expect(response.body).toEqual(latestEntry);
    });

    test("returns error when retrieval fails", async () => {
      const app = createApp();

      findLast7WeightHistoriesByUserId.mockRejectedValueOnce(error);

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(mockError.status);

      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });
  });

  describe("GET /weight-histories/user-id/:userId/date/:date - [getWeightHistoriesByUserIdAndByDate]", () => {
    const path = `/weight-histories/user-id/${userId}/date/${date}`;

    test("returns today's weight history", async () => {
      const app = createApp();

      findWeightHistoryByUserIdAndDate.mockResolvedValueOnce(weightHistory);

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(validateDateField).toHaveBeenCalledWith(date);
      expect(findWeightHistoryByUserIdAndDate).toHaveBeenCalledWith({
        userId,
        date: new Date(date),
      });
      expect(response.body).toEqual(weightHistory);
    });

    test("returns empty object when today's weight history not found", async () => {
      const app = createApp();

      findWeightHistoryByUserIdAndDate.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(response.body).toEqual({});
    });

    test("returns error when retrieval fails", async () => {
      const app = createApp();

      findWeightHistoryByUserIdAndDate.mockRejectedValueOnce(error);

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(mockError.status);

      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });
  });

  describe("PUT /weight-histories/:id - [putWeightHistoryById]", () => {
    const path = `/weight-histories/${entryId}`;

    test("returns error when validation fails", async () => {
      const app = createApp();

      validateWeightHistoryPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .put(path)
        .send()
        .expect(mockError.status);

      expect(validateWeightHistoryPayload).toHaveBeenCalledWith({
        weightHistory: {},
      });
      expect(validateResourceAccess).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
      expect(updateRecord).not.toHaveBeenCalled();
    });

    test("updates weight history when payload is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .put(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .send(weightHistoryPayload)
        .expect(200);

      expect(validateWeightHistoryPayload).toHaveBeenCalledWith({
        weightHistory: weightHistoryPayload,
      });
      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: entryId,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(checkForConflictingEntry).toHaveBeenCalledWith({
        userId,
        date: weightHistoryPayload.date,
        entryId,
      });
      expect(updateRecord).toHaveBeenCalledWith({
        tableName,
        data: weightHistory,
      });
      expect(response.body).toEqual({
        message: "Weight entry updated",
        weightEntry: updatedWeightHistory,
      });
    });
  });

  describe("DELETE /weight-histories/:id - [deleteWeightHistoryById]", () => {
    const path = `/weight-histories/${entryId}`;

    test("returns error when resource access validation fails", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValueOnce(error);

      const response = await request(app).delete(path).expect(mockError.status);

      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: entryId,
      });
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
      expect(removeRecord).not.toHaveBeenCalled();
    });

    test("deletes weight history when resource access validation succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .delete(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: entryId,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(removeRecord).toHaveBeenCalledWith({
        tableName,
        id: entryId,
      });
      expect(response.body).toEqual({
        message: "Weight entry deleted",
        weightEntry: weightHistory,
      });
    });
  });
});
