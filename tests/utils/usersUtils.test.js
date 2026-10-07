const UsersUtils = require("../../utils/usersUtils");

const { pool } = require("../../db");
const {
  FIREBASE_BASE_URL,
  FIREBASE_BASE_REFRESH_URL,
  SIGN_IN_MODE,
  SIGN_UP_MODE,
  JSON_HEADERS,
} = require("../../constants/commonConstants");
const { getAPIKey } = require("../../utils/commonUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/commonUtils", () => ({
  getAPIKey: jest.fn(),
}));

describe("Users Utils", () => {
  const userId = "user-id";
  const email = "test@example.com";
  const password = "secure-password";
  const apiKey = "test-api-key";
  const idToken = "firebase-token";
  const refreshToken = "firebase-refresh";

  const errorPayload = {
    error: {
      message: "An error occured",
      status: 400,
    },
  };

  const user = {
    id: userId,
    birthday: "1990-01-01",
    email_address: email,
    first_name: "John",
    last_name: "Doe",
    register_date: "2024-01-01",
    sex: "male",
    username: "johndoe",
    firebase_id_token: idToken,
    firebase_refresh_token: refreshToken,
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe("[authenticateFirebaseUser]", () => {
    let spyGetFirebaseApiKey;
    const mockResponseData = {
      idToken: "id-token",
      refreshToken: "refresh-token",
    };

    beforeEach(() => {
      spyGetFirebaseApiKey = jest
        .spyOn(UsersUtils, "getFirebaseApiKey")
        .mockImplementation(() => apiKey);

      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });
    });

    test("sends a POST request to the sign-up endpoint and returns the response data", async () => {
      const result = await UsersUtils.authenticateFirebaseUser({
        email,
        password,
      });

      expect(spyGetFirebaseApiKey).toHaveBeenCalled();

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toEqual(`${FIREBASE_BASE_URL}:${SIGN_UP_MODE}?key=${apiKey}`);
      expect(JSON.parse(options.body)).toEqual({
        email,
        password,
        returnSecureToken: true,
      });
      expect(result).toEqual(mockResponseData);
    });

    test("uses the sign-in endpoint when isLogin is true", async () => {
      const result = await UsersUtils.authenticateFirebaseUser({
        email,
        password,
        isLogin: true,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${FIREBASE_BASE_URL}:${SIGN_IN_MODE}?key=${apiKey}`,
        expect.any(Object),
      );
      expect(result).toEqual(mockResponseData);
    });

    test("throws an error when the response is not ok, and error is provided", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue(errorPayload),
      });

      await expect(
        UsersUtils.authenticateFirebaseUser({
          email,
          password,
        }),
      ).rejects.toMatchObject({
        message: errorPayload.error.message,
        status: 400,
        details: errorPayload.error,
      });
    });

    test("throws an error when signing up, the response is not ok, and error is not provided", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue(undefined),
      });

      await expect(
        UsersUtils.authenticateFirebaseUser({
          email,
          password,
        }),
      ).rejects.toMatchObject({
        message: "Firebase sign up failed",
        status: 400,
        details: undefined,
      });
    });

    test("throws an error when loging in, the response is not ok, and error is not provided", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue(undefined),
      });

      await expect(
        UsersUtils.authenticateFirebaseUser({
          email,
          password,
          isLogin: true,
        }),
      ).rejects.toThrow({
        message: "Firebase login failed",
        status: 400,
        details: undefined,
      });
    });
  });

  describe("[refreshFirebaseUser]", () => {
    const mockResponseData = {
      refresh_token: "new-refresh-token",
      id_token: "new-id-token",
      expires_in: 3600,
    };

    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });
    });

    test("sends a POST request to the refresh endpoint and returns the response data", async () => {
      const result = await UsersUtils.refreshFirebaseUser({
        apiKey,
        refreshToken,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${FIREBASE_BASE_REFRESH_URL}?key=${apiKey}`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        },
      );

      expect(result).toEqual(mockResponseData);
    });

    test("throws an error with firebase error message when the response is not ok", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue(errorPayload),
      });

      await expect(
        UsersUtils.refreshFirebaseUser({
          apiKey,
          refreshToken,
        }),
      ).rejects.toMatchObject({
        message: errorPayload.error.message,
        status: 400,
        details: errorPayload.error,
      });
    });

    test("throws an error with default message when firebase error is not provided", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue(undefined),
      });

      await expect(
        UsersUtils.refreshFirebaseUser({
          apiKey,
          refreshToken,
        }),
      ).rejects.toMatchObject({
        message: "Firebase token refresh failed",
        status: 400,
        details: undefined,
      });
    });
  });

  describe("[deleteFirebaseUser]", () => {
    const mockResponseData = { success: true };

    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });
    });

    test("sends a POST request to the delete endpoint and returns the response data", async () => {
      const result = await UsersUtils.deleteFirebaseUser({
        apiKey,
        idToken,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${FIREBASE_BASE_URL}:delete?key=${apiKey}`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ idToken }),
        },
      );

      expect(result).toBe(mockResponseData);
    });

    test("throws an error with firebase error message when the response is not ok", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue(errorPayload),
      });

      await expect(
        UsersUtils.deleteFirebaseUser({
          apiKey,
          idToken,
        }),
      ).rejects.toMatchObject({
        message: errorPayload.error.message,
        status: 404,
        details: errorPayload.error,
      });
    });

    test("throws an error with default message and coerced status when firebase error is not provided", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 200,
        json: jest.fn().mockResolvedValue(undefined),
      });

      await expect(
        UsersUtils.deleteFirebaseUser({
          apiKey,
          idToken,
        }),
      ).rejects.toMatchObject({
        message: "Failed to delete user from Firebase",
        status: 400,
        details: undefined,
      });
    });
  });

  describe("[updateUserTokens]", () => {
    test("updates firebase tokens for the specified user", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await UsersUtils.updateUserTokens({ userId, idToken, refreshToken });

      expect(pool.query).toHaveBeenCalled();
      const [queryText, parameters] = pool.query.mock.calls[0];
      expect(queryText).toEqual(
        "UPDATE users SET firebase_id_token = $2, firebase_refresh_token = $3 WHERE id = $1",
      );
      expect(parameters).toEqual([userId, idToken, refreshToken]);
    });
  });

  describe("[extractBearerToken]", () => {
    test("returns token when header contains valid bearer token", () => {
      const token = UsersUtils.extractBearerToken("Bearer valid-token");

      expect(token).toBe("valid-token");
    });

    test("returns null when header is missing", () => {
      const token = UsersUtils.extractBearerToken();

      expect(token).toBeNull();
    });

    test("returns null when scheme is not bearer", () => {
      const token = UsersUtils.extractBearerToken("Basic some-token");

      expect(token).toBeNull();
    });

    test("returns null when token part is missing", () => {
      const token = UsersUtils.extractBearerToken("Bearer");

      expect(token).toBeNull();
    });
  });

  describe("[getFirebaseApiKey]", () => {
    test("delegates to common utils getAPIKey", () => {
      getAPIKey.mockReturnValue(apiKey);

      const result = UsersUtils.getFirebaseApiKey();

      expect(getAPIKey).toHaveBeenCalledWith("FIREBASE_API_KEY");
      expect(result).toEqual(apiKey);
    });
  });
});
