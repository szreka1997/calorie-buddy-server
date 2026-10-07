const request = require("supertest");
const express = require("express");
const caloriesDeficitsRouter = require("../../routes/caloriesDeficits");

const {
  validateDateField,
  validateResourceAccess,
} = require("../../utils/validationUtils");
const { buildErrorStatusAndMessage } = require("../../utils/commonUtils");
const {
  calculateLast7DaysCalorieDeficits,
} = require("../../utils/calorieDeficitUtils");

jest.mock("../../utils/validationUtils", () => ({
  validateDateField: jest.fn(),
  validateResourceAccess: jest.fn(),
}));

jest.mock("../../utils/commonUtils", () => ({
  buildErrorStatusAndMessage: jest.fn(),
}));

jest.mock("../../utils/calorieDeficitUtils", () => ({
  calculateLast7DaysCalorieDeficits: jest.fn(),
}));

describe("Calories Deficits Routes", () => {
  const userId = "user-1";
  const bearerToken = "Bearer auth-token";
  const today = "2026-01-01";

  const calorieDeficits = [
    { date: "2026-03-27T08:33:02.329Z", calories: 456 },
    { date: "2026-03-28T08:33:02.329Z", calories: 123 },
  ];

  const error = new Error("An error occurred");
  const mockError = { status: 403, message: "Forbidden" };

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/calories-deficits", caloriesDeficitsRouter);

    return app;
  }

  beforeEach(() => {
    validateDateField.mockReturnValue(today);
    buildErrorStatusAndMessage.mockReturnValue(mockError);
    calculateLast7DaysCalorieDeficits.mockResolvedValue(calorieDeficits);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /calories-deficits/user-id/:userId/today/:date - [getCalorieDeficitsByUserId]", () => {
    const path = `/calories-deficits/user-id/${userId}/today/${today}`;

    test("returns calorie deficits when resource access validation succeeds", async () => {
      const app = createApp();

      const response = await request(app)
        .get(path)
        .set("Authorization", bearerToken)
        .expect(200);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: bearerToken,
      });
      expect(validateDateField).toHaveBeenCalledWith(today);
      expect(calculateLast7DaysCalorieDeficits).toHaveBeenCalledWith({
        userId,
        today,
      });
      expect(response.body).toEqual(calorieDeficits);
    });

    test("returns error when resource access validation fails", async () => {
      const app = createApp();

      validateResourceAccess.mockRejectedValueOnce(error);

      const response = await request(app).get(path).expect(mockError.status);

      expect(validateResourceAccess).toHaveBeenCalledWith({
        userId,
        authorizationHeader: undefined,
      });
      expect(buildErrorStatusAndMessage).toHaveBeenCalledWith(error);
      expect(calculateLast7DaysCalorieDeficits).not.toHaveBeenCalled();
      expect(response.body).toEqual({ error: mockError.message });
    });
  });
});
