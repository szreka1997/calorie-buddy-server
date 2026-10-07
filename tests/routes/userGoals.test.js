const request = require("supertest");
const express = require("express");
const userGoalsRouter = require("../../routes/userGoals");

const { pool } = require("../../db");
const { INTERNAL_SERVER_ERROR } = require("../../constants/commonConstants");
const {
  USER_GOALS_TABLE_NAME,
  USER_GOALS_SELECT_FIELDS_SQL,
} = require("../../constants/userGoalsConsants");
const {
  validateUserGoalPayload,
  validateResourceAccess,
} = require("../../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  removeRecord,
  findRecordById,
  buildErrorStatusAndMessage,
} = require("../../utils/commonUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/validationUtils", () => ({
  validateUserGoalPayload: jest.fn(),
  validateResourceAccess: jest.fn(),
}));

jest.mock("../../utils/commonUtils", () => ({
  insertRecord: jest.fn(),
  updateRecord: jest.fn(),
  removeRecord: jest.fn(),
  findRecordById: jest.fn(),
  buildErrorStatusAndMessage: jest.fn(),
}));

describe("User Goals Routes", () => {
  const userId = "user-1";
  const bearerToken = "bearer-token";
  const tableName = USER_GOALS_TABLE_NAME;
  const idName = "user_id";

  const error = new Error("An error occurred");
  const mockError = { status: 400, message: "ERROR!" };

  const userGoalPayload = {
    activity_level: "moderate",
    goal_calories: 2000,
    goal_carbs: 250,
    goal_fat: 70,
    goal_protein: 120,
    goal_weight: "75.5",
    starting_weight: "80.3",
    plan: "lose",
    starting_date: "2024-01-01",
    goal_date: "2024-06-01",
    weekly_rate: "0.5",
    height: 175,
  };

  const validatedUserGoal = {
    ...userGoalPayload,
    goal_weight: 75.5,
    starting_weight: 80.3,
    weekly_rate: 0.5,
  };

  const userGoal = {
    user_id: userId,
    ...validatedUserGoal,
  };

  const updatedUserGoal = {
    ...userGoal,
    goal_calories: 2100,
  };

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/user-goals", userGoalsRouter);

    return app;
  }

  beforeEach(() => {
    validateUserGoalPayload.mockReturnValue(validatedUserGoal);
    validateResourceAccess.mockResolvedValue({ id: userId });

    insertRecord.mockResolvedValue(userGoal);
    updateRecord.mockResolvedValue([updatedUserGoal]);
    removeRecord.mockResolvedValue([userGoal]);
    findRecordById.mockResolvedValue(userGoal);
    buildErrorStatusAndMessage.mockReturnValue(mockError);

    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /user-goals/:userId - [postUserByUserId]", () => {
    const path = `/user-goals/${userId}`;

    test("returns error when payload validation fails", async () => {
      const app = createApp();

      validateUserGoalPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .post(path)
        .send()
        .expect(mockError.status);

      expect(validateUserGoalPayload).toHaveBeenCalledWith({
        userGoal: {},
      });
      expect(validateResourceAccess).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("creates user goal when payload is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .post(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .send(userGoalPayload)
        .expect(201);

      expect(validateUserGoalPayload).toHaveBeenCalledWith({
        userGoal: userGoalPayload,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        idName,
        id: userId,
        isUserGoalPosting: true,
      });
      expect(insertRecord).toHaveBeenCalledWith({
        tableName: USER_GOALS_TABLE_NAME,
        data: { ...validatedUserGoal, user_id: userId },
      });
      expect(response.body).toEqual({
        message: "User goal created",
        goal: userGoal,
      });
    });
  });

  describe("GET /user-goals/ - [getUserGoals]", () => {
    const path = "/user-goals/";

    test("returns 500 when database read fails", async () => {
      const app = createApp();

      pool.query.mockRejectedValue(error);

      const response = await request(app).get(path).expect(500);
      const [queryText, values] = pool.query.mock.calls[0];

      expect(queryText).toContain(`SELECT ${USER_GOALS_SELECT_FIELDS_SQL}`);
      expect(queryText).toContain("FROM user_goals");
      expect(values).toBeUndefined();
      expect(response.body).toEqual({ error: INTERNAL_SERVER_ERROR });
    });

    test("returns user goals when database read succeeds", async () => {
      const app = createApp();

      pool.query.mockResolvedValueOnce({ rows: [userGoal] });

      const response = await request(app).get(path).expect(200);

      expect(response.body).toEqual([userGoal]);
    });
  });

  describe("GET /user-goals/:userId - [getUserGoalByUserId]", () => {
    const path = `/user-goals/${userId}`;

    test("returns error when resource access validation fails", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValueOnce(error);

      const response = await request(app).get(path).expect(mockError.status);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: undefined,
      });
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("returns user goal when resource access validation succeeds", async () => {
      const app = createApp();

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
        idName,
        id: userId,
      });
      expect(response.body).toEqual(userGoal);
    });
  });

  describe("PUT /user-goals/:userId - [putUserGoalByUserId]", () => {
    const path = `/user-goals/${userId}`;

    test("returns error when payload validation fails", async () => {
      const app = createApp();

      validateUserGoalPayload.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .put(path)
        .send()
        .expect(mockError.status);

      expect(validateUserGoalPayload).toHaveBeenCalledWith({
        userGoal: {},
      });
      expect(validateResourceAccess).not.toHaveBeenCalled();
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("updates user goal when payload is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .put(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .send(userGoalPayload)
        .expect(200);

      expect(validateUserGoalPayload).toHaveBeenCalledWith({
        userGoal: userGoalPayload,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        idName,
        id: userId,
      });
      expect(updateRecord).toHaveBeenCalledWith({
        tableName,
        idName,
        data: { ...validatedUserGoal, user_id: userId },
      });
      expect(response.body).toEqual({
        message: "User goal updated",
        goal: updatedUserGoal,
      });
    });
  });

  describe("DELETE /user-goals/:userId - [deleteUserGoalByUserId]", () => {
    const path = `/user-goals/${userId}`;

    test("returns error when resource access validation fails", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValueOnce(error);

      const response = await request(app).delete(path).expect(mockError.status);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: undefined,
      });
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("deletes user goal when resource access validation succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .delete(path)
        .set("Authorization", `Bearer ${bearerToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${bearerToken}`,
      });
      expect(removeRecord).toHaveBeenCalledWith({
        tableName,
        idName,
        id: userId,
      });
      expect(response.body).toEqual({
        message: "User goal deleted",
        goal: userGoal,
      });
    });
  });
});
