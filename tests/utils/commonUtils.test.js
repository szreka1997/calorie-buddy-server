const CommonUtils = require("../../utils/commonUtils");

const { pool } = require("../../db");
const {
  MAP_TABLE_NAME_TO_ERROR_NAME,
  INTERNAL_SERVER_ERROR,
} = require("../../constants/commonConstants");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe("Common Utils", () => {
  const id = 42;
  const firstName = "John";
  const registerDate = "2024-01-01T00:00:00.000Z";
  const tableName = "users";

  const insertData = {
    first_name: firstName,
    register_date: registerDate,
  };

  const data = {
    id,
    ...insertData,
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.restoreAllMocks();
  });

  describe("[insertRecord]", () => {
    let spyBuildInsertQueryParts;
    const insertedRow = { id: 1, ...insertData };

    beforeEach(() => {
      spyBuildInsertQueryParts = jest.spyOn(
        CommonUtils,
        "buildInsertQueryParts",
      );
    });

    test("inserts data into the specified table and returns inserted row", async () => {
      pool.query.mockResolvedValueOnce({ rows: [insertedRow] });

      const result = await CommonUtils.insertRecord({
        tableName,
        data: insertData,
      });

      expect(spyBuildInsertQueryParts).toHaveBeenCalledWith({
        data: insertData,
      });
      expect(pool.query).toHaveBeenCalled();
      const [queryText, values] = pool.query.mock.calls[0];
      expect(queryText).toContain(`INSERT INTO ${tableName}`);
      expect(queryText).toContain("VALUES ($1, $2::timestamp)");
      expect(values).toEqual(Object.values(insertData));
      expect(result).toEqual(insertedRow);
    });
  });

  describe("[updateRecord]", () => {
    let spyCreateSetClausesAndValuesForUpdate;
    const updatedRows = [data];

    beforeEach(() => {
      spyCreateSetClausesAndValuesForUpdate = jest.spyOn(
        CommonUtils,
        "createSetClausesAndValuesForUpdate",
      );
    });

    test("updates data using generated set clauses and returns updated rows", async () => {
      pool.query.mockResolvedValueOnce({ rows: updatedRows });

      const result = await CommonUtils.updateRecord({ tableName, data });

      expect(spyCreateSetClausesAndValuesForUpdate).toHaveBeenCalledWith({
        updateWhereClauseValue: id,
        data,
      });
      expect(pool.query).toHaveBeenCalled();
      const [queryText, values] = pool.query.mock.calls[0];
      expect(queryText).toContain(`UPDATE ${tableName}`);
      expect(queryText).toContain("SET id = $2");
      expect(queryText).toContain("register_date = $4::timestamp");
      expect(values).toEqual([id, id, firstName, registerDate]);
      expect(result).toEqual(updatedRows);
    });
  });

  describe("[removeRecord]", () => {
    const removedRows = [data];

    test("returns removed rows when deletion is successful", async () => {
      pool.query.mockResolvedValueOnce({ rows: removedRows });

      const result = await CommonUtils.removeRecord({ tableName, id });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(`DELETE FROM ${tableName}`),
        [id],
      );
      expect(result).toEqual(removedRows);
    });

    test("throws a 404 error when the record does not exist", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        CommonUtils.removeRecord({ tableName, id: 999 }),
      ).rejects.toMatchObject({
        status: 404,
        message: `${MAP_TABLE_NAME_TO_ERROR_NAME[tableName]} not found`,
      });
    });
  });

  describe("[findRecordById]", () => {
    test("returns the first matched row by default", async () => {
      pool.query.mockResolvedValueOnce({ rows: [data] });

      const result = await CommonUtils.findRecordById({ tableName, id });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(`SELECT`),
        [id],
      );
      expect(result).toEqual(data);
    });

    test("returns all rows when shouldReturnMultipleRows is true", async () => {
      const rows = [data, { ...data, id: id + 1 }];

      pool.query.mockResolvedValueOnce({ rows });

      const result = await CommonUtils.findRecordById({
        tableName,
        id,
        shouldReturnMultipleRows: true,
      });

      expect(result).toEqual(rows);
    });

    test("throws 409 when a goal already exists and 'isUserGoalPosting' is true", async () => {
      pool.query.mockResolvedValueOnce({ rows: [data] });

      await expect(
        CommonUtils.findRecordById({
          tableName,
          id,
          isUserGoalPosting: true,
        }),
      ).rejects.toMatchObject({
        status: 409,
        message: "A goal already exists for this user",
      });
    });

    test("throws 404 when no record is found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        CommonUtils.findRecordById({ tableName, id }),
      ).rejects.toMatchObject({
        status: 404,
        message: `${MAP_TABLE_NAME_TO_ERROR_NAME[tableName]} not found`,
      });
    });
  });

  describe("[parseInteger]", () => {
    test("parses valid integer strings", () => {
      expect(CommonUtils.parseInteger("42")).toEqual(42);
    });

    test("returns undefined for invalid integers", () => {
      expect(CommonUtils.parseInteger("not-int")).toBeUndefined();
    });

    test("returns undefined for null or undefined", () => {
      expect(CommonUtils.parseInteger(null)).toBeUndefined();
      expect(CommonUtils.parseInteger(undefined)).toBeUndefined();
    });
  });

  describe("[parseDecimal]", () => {
    test("parses valid decimal strings", () => {
      expect(CommonUtils.parseDecimal("3.14")).toBeCloseTo(3.14);
    });

    test("returns undefined for invalid decimals", () => {
      expect(CommonUtils.parseDecimal("not-decimal")).toBeUndefined();
    });

    test("returns undefined for null or undefined", () => {
      expect(CommonUtils.parseDecimal(null)).toBeUndefined();
      expect(CommonUtils.parseDecimal(undefined)).toBeUndefined();
    });
  });

  describe("[buildErrorStatusAndMessage]", () => {
    test("returns provided status and message when status is not 500", () => {
      const error = { status: 400, message: "Bad request" };

      const result = CommonUtils.buildErrorStatusAndMessage(error);

      expect(result).toEqual(error);
    });

    test("converts status to 500 and uses internal server error message", () => {
      const error = { message: "Unexpected" };

      const result = CommonUtils.buildErrorStatusAndMessage(error);

      expect(result).toEqual({
        status: 500,
        message: INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe("[buildInsertQueryParts]", () => {
    test("builds parameterized insert query parts and casts date fields", () => {
      const { fields, valueParameterazition, values } =
        CommonUtils.buildInsertQueryParts({ data: insertData });

      expect(fields).toEqual(["first_name", "register_date"]);
      expect(valueParameterazition).toEqual(["$1", "$2::timestamp"]);
      expect(values).toEqual([firstName, registerDate]);
    });
  });

  describe("[createSetClausesAndValuesForUpdate]", () => {
    test("builds set clauses and values and casts date fields", () => {
      const result = CommonUtils.createSetClausesAndValuesForUpdate({
        updateWhereClauseValue: id,
        data,
      });

      expect(result.setClauses).toEqual([
        "id = $2",
        "first_name = $3",
        "register_date = $4::timestamp",
      ]);
      expect(result.values).toEqual([id, id, firstName, registerDate]);
    });
  });

  describe("[getAPIKey]", () => {
    const apiKey = "test-api-key";
    const apiKeyName = "FIREBASE_API_KEY";
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      delete process.env;
    });

    test("returns the API key when the environment variable is set", () => {
      process.env[apiKeyName] = apiKey;

      const result = CommonUtils.getAPIKey(apiKeyName);

      expect(result).toEqual(apiKey);
    });

    test("throws an error with status 500 when the environment variable is missing", async () => {
      await expect(async () =>
        CommonUtils.getAPIKey(apiKeyName),
      ).rejects.toMatchObject({
        message: `${apiKeyName} environment variable is not set`,
        status: 500,
      });
    });
  });

  describe("[handleFetchResponseErrorsAndData]", () => {
    test("returns parsed JSON when the response is ok", async () => {
      const payload = { success: true };
      const response = {
        ok: true,
        json: jest.fn().mockResolvedValue(payload),
      };

      const result =
        await CommonUtils.handleFetchResponseErrorsAndData(response);

      expect(response.json).toHaveBeenCalled();
      expect(result).toEqual(payload);
    });

    test("throws an error with the API error message when the response is not ok", async () => {
      const payload = { error: "Something went wrong" };
      const response = {
        ok: false,
        json: jest.fn().mockResolvedValue(payload),
      };

      await expect(
        CommonUtils.handleFetchResponseErrorsAndData(response),
      ).rejects.toThrow(payload.error);
      expect(response.json).toHaveBeenCalled();
    });

    test("throws a default error message when the API error is missing", async () => {
      const response = {
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      };

      await expect(
        CommonUtils.handleFetchResponseErrorsAndData(response),
      ).rejects.toThrow("An error occured");
      expect(response.json).toHaveBeenCalled();
    });
  });
});
