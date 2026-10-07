const WeightHistoriesUtils = require("../../utils/weightHistoriesUtils");

const { pool } = require("../../db");
const {
  WEIGHT_HISTORIES_TABLE_NAME,
} = require("../../constants/weightHistoryConstants");
const { findRecordById } = require("../../utils/commonUtils");

jest.mock("../../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../../utils/commonUtils", () => ({
  findRecordById: jest.fn(),
}));

describe("WeightHistories Utils", () => {
  const userId = "user-id";
  const date = "2024-01-01";
  const entryId = "weight-entry-id";
  const tableName = WEIGHT_HISTORIES_TABLE_NAME;

  const weightHistory = {
    id: "weight-history-id",
    user_id: userId,
    date,
    weight: 70.5,
  };

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe("[findLast7WeightHistoriesByUserId]", () => {
    test("returns up to seven entries in chronological order", async () => {
      const rows = [
        { id: "entry-10", user_id: userId, date: "2024-01-10", weight: 80 },
        { id: "entry-9", user_id: userId, date: "2024-01-09", weight: 79.5 },
        { id: "entry-8", user_id: userId, date: "2024-01-08", weight: 79 },
        { id: "entry-7", user_id: userId, date: "2024-01-07", weight: 78.5 },
        { id: "entry-6", user_id: userId, date: "2024-01-06", weight: 78 },
        { id: "entry-5", user_id: userId, date: "2024-01-05", weight: 77.5 },
        { id: "entry-4", user_id: userId, date: "2024-01-04", weight: 77 },
        { id: "entry-3", user_id: userId, date: "2024-01-03", weight: 76.5 },
      ];
      findRecordById.mockResolvedValueOnce(rows);

      const result =
        await WeightHistoriesUtils.findLast7WeightHistoriesByUserId({
          userId,
        });

      expect(findRecordById).toHaveBeenCalledWith({
        tableName,
        id: userId,
        idName: "user_id",
        orderBy: "ORDER BY date DESC",
        shouldReturnMultipleRows: true,
      });
      expect(result).toHaveLength(7);
      expect(result[0].id).toEqual("entry-4");
      expect(result[6].id).toEqual("entry-10");
      expect(result.find((item) => item.id === "entry-3")).toBeUndefined();
    });

    test("returns an empty array when no entries are found", async () => {
      findRecordById.mockResolvedValueOnce([]);

      const result =
        await WeightHistoriesUtils.findLast7WeightHistoriesByUserId({
          userId,
        });

      expect(result).toEqual([]);
    });
  });

  describe("[findWeightHistoryByUserIdAndDate]", () => {
    test("queries the database and returns the first matching row", async () => {
      pool.query.mockResolvedValue({ rows: [weightHistory] });

      const result =
        await WeightHistoriesUtils.findWeightHistoryByUserIdAndDate({
          userId,
          date,
        });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM weight_histories"),
        [userId, date],
      );
      expect(result).toEqual(weightHistory);
    });

    test("returns undefined when no matching row is found", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result =
        await WeightHistoriesUtils.findWeightHistoryByUserIdAndDate({
          userId,
          date,
        });

      expect(result).toBeUndefined();
    });

    test("throws a conflict error when posting and a weight history already exists", async () => {
      pool.query.mockResolvedValue({ rows: [weightHistory] });

      await expect(
        WeightHistoriesUtils.findWeightHistoryByUserIdAndDate({
          userId,
          date,
          isPosting: true,
        }),
      ).rejects.toMatchObject({
        message: "Weight already recorded for this day",
        status: 409,
      });
    });
  });

  describe("[checkForConflictingEntry]", () => {
    test("returns the rows when no conflicting entry exists", async () => {
      const rows = [];
      pool.query.mockResolvedValue({ rows });

      const result = await WeightHistoriesUtils.checkForConflictingEntry({
        userId,
        date,
        entryId,
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM weight_histories"),
        [userId, date, entryId],
      );
      expect(result).toEqual(rows);
    });

    test("throws a conflict error when a conflicting entry exists", async () => {
      const rows = [weightHistory];
      pool.query.mockResolvedValue({ rows });

      await expect(
        WeightHistoriesUtils.checkForConflictingEntry({
          userId,
          date,
          entryId,
        }),
      ).rejects.toMatchObject({
        message: "Weight already recorded for this day",
        status: 409,
      });
    });
  });
});
