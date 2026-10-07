const ChatGptUtils = require("../../utils/chatGptUtils");

const { JSON_HEADERS } = require("../../constants/commonConstants");
const { OPEN_AI_RESPONSE } = require("../../utils/chatGptUtils");
const {
  getAPIKey,
  handleFetchResponseErrorsAndData,
} = require("../../utils/commonUtils");

jest.mock("../../utils/commonUtils", () => ({
  getAPIKey: jest.fn(),
  handleFetchResponseErrorsAndData: jest.fn(),
}));

describe("Chat Gpt Utils", () => {
  const apiKey = "test-openai-api-key";
  const mockResponse = "mock-response";
  const errorMessage = "API error";

  const foodData = {
    name: "Apple",
    kcal_per_100_g: 52,
    protein_per_100_g: 0.3,
    carbs_per_100_g: 14,
    fat_per_100_g: 0.2,
    sugar_per_100_g: 10,
    added_sugar_per_100_g: 0,
  };

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    delete global.fetch;
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  // describe("[getNutriScore]", () => {
  //   let spyGetOpenAIApiKey;

  //   const mockAnswer = "B";
  //   const mockResponseData = {
  //     output: [{ content: [{ text: mockAnswer }] }],
  //   };

  //   beforeEach(() => {
  //     spyGetOpenAIApiKey = jest
  //       .spyOn(ChatGptUtils, "getOpenAIApiKey")
  //       .mockReturnValue(apiKey);

  //     handleFetchResponseErrorsAndData.mockResolvedValue(mockResponseData);
  //   });

  //   test("sends a POST request to OpenAI and returns the nutri-score", async () => {
  //     const result = await ChatGptUtils.getNutriScore(foodData);

  //     expect(spyGetOpenAIApiKey).toHaveBeenCalled();
  //     expect(global.fetch).toHaveBeenCalledWith(OPEN_AI_RESPONSE, {
  //       method: "POST",
  //       headers: {
  //         ...JSON_HEADERS,
  //         Authorization: `Bearer ${apiKey}`,
  //       },
  //       body: expect.any(String),
  //     });

  //     const options = global.fetch.mock.calls[0][1];
  //     const body = JSON.parse(options.body);
  //     expect(body.model).toEqual("gpt-4.1-mini");
  //     expect(body.input).toContain(foodData.name);
  //     expect(body.input).toContain("nutri-score");

  //     expect(handleFetchResponseErrorsAndData).toHaveBeenCalledWith(
  //       mockResponse,
  //     );
  //     expect(result).toEqual(mockAnswer);
  //   });

  //   test("includes all food data fields in the prompt", async () => {
  //     await ChatGptUtils.getNutriScore(foodData);

  //     const options = global.fetch.mock.calls[0][1];
  //     const body = JSON.parse(options.body);

  //     expect(body.input).toContain(`${foodData.kcal_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.carbs_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.protein_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.fat_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.sugar_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.added_sugar_per_100_g}`);
  //   });

  //   test("propagates errors from handleFetchResponseErrorsAndData", async () => {
  //     handleFetchResponseErrorsAndData.mockRejectedValue(
  //       new Error(errorMessage),
  //     );

  //     await expect(ChatGptUtils.getNutriScore(foodData)).rejects.toThrow(
  //       errorMessage,
  //     );
  //   });
  // });

  // describe("[getValidation]", () => {
  //   let spyGetOpenAIApiKey;

  //   const mockAnswer = "Valid";
  //   const mockResponseData = {
  //     output: [{ content: [{ text: mockAnswer }] }],
  //   };

  //   beforeEach(() => {
  //     spyGetOpenAIApiKey = jest
  //       .spyOn(ChatGptUtils, "getOpenAIApiKey")
  //       .mockReturnValue(apiKey);

  //     handleFetchResponseErrorsAndData.mockResolvedValue(mockResponseData);
  //   });

  //   test("sends a POST request to OpenAI and returns the validation result", async () => {
  //     const result = await ChatGptUtils.getValidation(foodData);

  //     expect(spyGetOpenAIApiKey).toHaveBeenCalled();
  //     expect(global.fetch).toHaveBeenCalledWith(OPEN_AI_RESPONSE, {
  //       method: "POST",
  //       headers: {
  //         ...JSON_HEADERS,
  //         Authorization: `Bearer ${apiKey}`,
  //       },
  //       body: expect.any(String),
  //     });

  //     const options = global.fetch.mock.calls[0][1];
  //     const body = JSON.parse(options.body);
  //     expect(body.model).toEqual("gpt-4.1-mini");
  //     expect(body.input).toContain(foodData.name);
  //     expect(body.input).toContain("Valid or Not valid");

  //     expect(handleFetchResponseErrorsAndData).toHaveBeenCalledWith(
  //       mockResponse,
  //     );
  //     expect(result).toEqual(mockAnswer);
  //   });

  //   test("includes all food data fields in the prompt", async () => {
  //     await ChatGptUtils.getValidation(foodData);

  //     const options = global.fetch.mock.calls[0][1];
  //     const body = JSON.parse(options.body);

  //     expect(body.input).toContain(`${foodData.kcal_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.carbs_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.protein_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.fat_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.sugar_per_100_g}`);
  //     expect(body.input).toContain(`${foodData.added_sugar_per_100_g}`);
  //   });

  //   test("propagates errors from handleFetchResponseErrorsAndData", async () => {
  //     handleFetchResponseErrorsAndData.mockRejectedValue(
  //       new Error(errorMessage),
  //     );

  //     await expect(ChatGptUtils.getValidation(foodData)).rejects.toThrow(
  //       errorMessage,
  //     );
  //   });
  // });

  test("", async () => {
    await ChatGptUtils.getNutriScore(foodData);
    await ChatGptUtils.getValidation(foodData);
  });

  describe("[getOpenAIApiKey]", () => {
    test("delegates to common utils getAPIKey with OPEN_AI_API_KEY", () => {
      getAPIKey.mockReturnValue(apiKey);

      const result = ChatGptUtils.getOpenAIApiKey();

      expect(getAPIKey).toHaveBeenCalledWith("OPEN_AI_API_KEY");
      expect(result).toEqual(apiKey);
    });
  });
});
