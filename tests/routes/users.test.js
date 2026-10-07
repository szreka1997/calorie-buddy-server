const request = require("supertest");
const express = require("express");
const usersRouter = require("../../routes/users");

const { pool } = require("../../db");
const { INTERNAL_SERVER_ERROR } = require("../../constants/commonConstants");
const { USERS_TABLE_NAME } = require("../../constants/usersConstants");
const {
  validateUserPayload,
  validateResourceAccess,
} = require("../../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  removeRecord,
  findRecordById,
  buildErrorStatusAndMessage,
} = require("../../utils/commonUtils");
const {
  authenticateFirebaseUser,
  refreshFirebaseUser,
  deleteFirebaseUser,
  updateUserTokens,
  getFirebaseApiKey,
} = require("../../utils/usersUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/validationUtils", () => ({
  validateUserPayload: jest.fn(),
  validateResourceAccess: jest.fn(),
}));

jest.mock("../../utils/commonUtils", () => ({
  insertRecord: jest.fn(),
  updateRecord: jest.fn(),
  removeRecord: jest.fn(),
  findRecordById: jest.fn(),
  buildErrorStatusAndMessage: jest.fn(),
}));

jest.mock("../../utils/usersUtils", () => ({
  authenticateFirebaseUser: jest.fn(),
  refreshFirebaseUser: jest.fn(),
  deleteFirebaseUser: jest.fn(),
  updateUserTokens: jest.fn(),
  getFirebaseApiKey: jest.fn(),
}));

describe("Users Routes", () => {
  const email = "user@example.com";
  const password = "password123";
  const userId = "user-1";
  const registerDate = "2026-01-01";
  const idToken = "firebase-id-token";
  const refreshToken = "firebase-refresh-token";
  const apiKey = "firebase-api-key";
  const newUsername = "NewName";

  const error = new Error("An error occured");
  const mockError = { status: 400, message: "ERROR!" };

  const firebaseAccount = {
    localId: userId,
    email,
    idToken,
    refreshToken,
  };

  const userPayload = {
    username: "sampleuser",
    first_name: "Sample",
    last_name: "User",
    birthday: "1990-01-01",
    sex: "female",
    register_date: registerDate,
  };

  const user = {
    ...userPayload,
    id: userId,
    email_address: email,
    firebase_id_token: idToken,
    firebase_refresh_token: refreshToken,
  };

  const newUser = {
    ...user,
    username: newUsername,
  };

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/users", usersRouter);

    return app;
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(registerDate));
    authenticateFirebaseUser.mockResolvedValue(firebaseAccount);
    insertRecord.mockResolvedValue(user);
    updateRecord.mockResolvedValue([newUser]);
    removeRecord.mockResolvedValue([user]);
    findRecordById.mockResolvedValue(user);
    getFirebaseApiKey.mockReturnValue(apiKey);
    buildErrorStatusAndMessage.mockReturnValue(mockError);

    validateResourceAccess.mockResolvedValue(user);
    validateUserPayload.mockReturnValue(userPayload);
    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe("POST /users/signup - [signupUser]", () => {
    const path = "/users/signup";

    test("returns 400 when request body is missing", async () => {
      const app = createApp();

      const response = await request(app).post(path).send().expect(400);

      expect(response.body).toEqual({
        error: "email, password, and user payload are required",
      });
      expect(validateUserPayload).not.toHaveBeenCalled();
    });

    test("returns error when firebase auth failed", async () => {
      const app = createApp();

      authenticateFirebaseUser.mockRejectedValue(error);

      const response = await request(app)
        .post(path)
        .send({
          email,
          password,
          user: {},
        })
        .expect(mockError.status);

      expect(response.body).toEqual({ error: mockError.message });
    });

    test("creates a user when payload is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .post(path)
        .send({
          email,
          password,
          user: userPayload,
        })
        .expect(201);

      expect(validateUserPayload).toHaveBeenCalledWith({ user: userPayload });
      expect(authenticateFirebaseUser).toHaveBeenCalledWith({
        email,
        password,
      });
      expect(insertRecord).toHaveBeenCalledWith({
        tableName: USERS_TABLE_NAME,
        data: user,
      });
      expect(response.body).toEqual({
        message: "User signed up successfully",
        user: user,
      });
    });
  });

  describe("POST /users/login - [loginUser]", () => {
    const path = "/users/login";

    test("returns 400 when request body is missing", async () => {
      const app = createApp();

      const response = await request(app).post(path).send().expect(400);

      expect(response.body).toEqual({
        error: "email and password are required",
      });
      expect(authenticateFirebaseUser).not.toHaveBeenCalled();
    });

    test("return firebase error when 'email' or 'passsword' is invalid", async () => {
      const app = createApp();

      authenticateFirebaseUser.mockRejectedValue(error);

      const response = await request(app)
        .post(path)
        .send({
          email,
          password,
        })
        .expect(mockError.status);

      expect(response.body).toEqual({ error: mockError.message });
    });

    test("login succesfully when payload is valid", async () => {
      const app = createApp();

      const response = await request(app)
        .post(path)
        .send({
          email,
          password,
        })
        .expect(200);

      expect(authenticateFirebaseUser).toHaveBeenCalledWith({
        email,
        password,
        isLogin: true,
      });
      expect(findRecordById).toHaveBeenCalledWith({
        tableName: USERS_TABLE_NAME,
        id: userId,
      });
      expect(updateUserTokens).toHaveBeenCalledWith({
        userId: firebaseAccount.localId,
        idToken: firebaseAccount.idToken,
        refreshToken: firebaseAccount.refreshToken,
      });
      expect(response.body).toEqual({
        message: "User logged in successfully",
        user,
      });
    });
  });

  describe("POST /users/refresh/:id - [refreshFirebaseToken]", () => {
    const path = `/users/refresh/${userId}`;
    const firebaseRefreshTokenResponse = {
      expires_in: "3600",
      token_type: "Bearer",
      refresh_token: "new_refresh_token",
      id_token: "new_token",
      user_id: userId,
      project_id: "1234",
    };

    beforeEach(() => {
      refreshFirebaseUser.mockResolvedValue(firebaseRefreshTokenResponse);
    });

    test("returns 400 when request body is missing", async () => {
      const app = createApp();

      const response = await request(app).post(path).send().expect(400);

      expect(response.body).toEqual({
        error: "refreshToken is required",
      });
      expect(getFirebaseApiKey).not.toHaveBeenCalled();
    });

    test("returns 403 when user's 'refreshToken' is not match with request's 'refreshToken'", async () => {
      const app = createApp();

      const response = await request(app)
        .post(path)
        .send({
          refreshToken: "token",
        })
        .expect(403);

      expect(response.body).toEqual({
        error: "Refresh token mismatch",
      });
      expect(refreshFirebaseUser).not.toHaveBeenCalled();
    });

    test("returns error when can't refresh token", async () => {
      const app = createApp();

      refreshFirebaseUser.mockRejectedValue(error);

      const response = await request(app)
        .post(path)
        .send({
          refreshToken,
        })
        .expect(mockError.status);

      expect(response.body).toEqual({
        error: mockError.message,
      });
      expect(updateUserTokens).not.toHaveBeenCalled();
    });

    test("updates persisted tokens when Firebase refresh succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .post(path)
        .send({ refreshToken })
        .expect(200);

      expect(getFirebaseApiKey).toHaveBeenCalled();
      expect(findRecordById).toHaveBeenCalledWith({
        tableName: USERS_TABLE_NAME,
        id: userId,
      });
      expect(refreshFirebaseUser).toHaveBeenCalledWith({
        apiKey,
        refreshToken,
      });
      expect(updateUserTokens).toHaveBeenCalledWith({
        userId: firebaseRefreshTokenResponse.user_id,
        idToken: firebaseRefreshTokenResponse.id_token,
        refreshToken: firebaseRefreshTokenResponse.refresh_token,
      });
      expect(response.body).toEqual({
        message: "Token refreshed successfully",
        firebaseTokens: firebaseRefreshTokenResponse,
      });
    });
  });

  describe("GET /users/ - [getUsers]", () => {
    const path = "/users/";

    test("return 500 when database read fails", async () => {
      const app = createApp();

      pool.query.mockRejectedValue(error);

      const response = await request(app).get(path).expect(500);
      const [queryText, values] = pool.query.mock.calls[0];

      expect(queryText).toContain("SELECT id");
      expect(queryText).toContain("FROM users ORDER BY id");
      expect(values).toBeUndefined();
      expect(response.body).toEqual({ error: INTERNAL_SERVER_ERROR });
    });

    test("return successfully when database read not fails", async () => {
      const app = createApp();

      pool.query.mockResolvedValueOnce({ rows: [user] });

      const response = await request(app).get(path).expect(200);

      expect(response.body).toEqual([user]);
    });
  });

  describe("GET /users/:id - [getUserById]", () => {
    const path = `/users/${userId}`;

    test("returns error when resource access validation fails", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValue(error);

      const response = await request(app).get(path).expect(mockError.status);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: undefined,
      });
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("returns resource when validation succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${idToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${idToken}`,
      });
      expect(response.body).toEqual(user);
    });
  });

  describe("PATCH /users/:id - [patchUserById]", () => {
    const path = `/users/${userId}`;

    test("returns error when resource access validation fails ", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValueOnce(error);

      const response = await request(app)
        .patch(path)
        .send()
        .expect(mockError.status);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: undefined,
      });
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("updates allowed fields and casts date fields", async () => {
      const app = createApp();
      const updateUserData = {
        username: newUsername,
      };

      validateUserPayload.mockReturnValueOnce(updateUserData);

      const response = await request(app)
        .patch(path)
        .set("Authorization", `Bearer ${idToken}`)
        .send(updateUserData)
        .expect(200);

      expect(validateUserPayload).toHaveBeenCalledWith({
        user: updateUserData,
        isUpdate: true,
      });
      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${idToken}`,
      });
      expect(updateRecord).toHaveBeenCalledWith({
        tableName: USERS_TABLE_NAME,
        data: {
          ...updateUserData,
          id: userId,
        },
      });
      expect(response.body).toEqual({
        message: "User updated",
        user: newUser,
      });
    });
  });

  describe("DELETE /users/:id - [deleteUserById]", () => {
    const path = `/users/${userId}`;

    test("returns error when resource access validation fails", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValueOnce(error);

      const response = await request(app).delete(path).expect(mockError.status);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: undefined,
      });
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("returns error when firebase deletion fails", async () => {
      const app = createApp();

      deleteFirebaseUser.mockRejectedValue(error);

      const response = await request(app).delete(path).expect(mockError.status);

      expect(getFirebaseApiKey).toHaveBeenCalled();
      expect(response.body).toEqual({ error: mockError.message });
    });

    test("deletes user when firebase deletion succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .delete(path)
        .set("Authorization", `Bearer ${idToken}`)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: `Bearer ${idToken}`,
      });
      expect(getFirebaseApiKey).toHaveBeenCalled();
      expect(deleteFirebaseUser).toHaveBeenCalledWith({ apiKey, idToken });
      expect(removeRecord).toHaveBeenCalledWith({
        tableName: USERS_TABLE_NAME,
        id: userId,
      });
      expect(response.body).toEqual({
        message: "User deleted",
        user,
      });
    });
  });
});
