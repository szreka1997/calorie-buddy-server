const { JSON_HEADERS } = require("../constants/commonConstants");
const {
  getAPIKey,
  handleFetchResponseErrorsAndData,
} = require("./commonUtils");

const OPEN_AI_RESPONSE = "https://api.openai.com/v1/responses";

async function getNutriScore(foodData) {
  console.log("NUTRISCORE-CHATGPT");

  // const apiKey = module.exports.getOpenAIApiKey();
  // const response = await fetch(OPEN_AI_RESPONSE, {
  //   method: "POST",
  //   headers: {
  //     ...JSON_HEADERS,
  //     Authorization: `Bearer ${apiKey}`,
  //   },
  //   body: JSON.stringify({
  //     model: "gpt-4.1-mini",
  //     input: `Given the following data about a food:
  //     name: ${foodData.name}
  //     calories per 100 g: ${foodData.kcal_per_100_g}
  //     carbs per 100 g: ${foodData.carbs_per_100_g}
  //     protein per 100 g: ${foodData.protein_per_100_g}
  //     fat per 100 g: ${foodData.fat_per_100_g}
  //     sugar per 100 g: ${foodData.sugar_per_100_g}
  //     added sugar per 100 g: ${foodData.added_sugar_per_100_g}.
  //     Based on these give a nutri-score, only give the nutriscore as answer.`,
  //   }),
  // });

  // const data = await handleFetchResponseErrorsAndData(response);
  // const answer = data.output[0].content[0].text;

  const answer = "E";

  console.log(answer);
  return answer;
}

async function getValidation(foodData) {
  console.log("ISVALID-CHATGPT");

  // const apiKey = module.exports.getOpenAIApiKey();
  // const response = await fetch(OPEN_AI_RESPONSE, {
  //   method: "POST",
  //   headers: {
  //     ...JSON_HEADERS,
  //     Authorization: `Bearer ${apiKey}`,
  //   },
  //   body: JSON.stringify({
  //     model: "gpt-4.1-mini",
  //     input: `Given the following data about a food:
  //     name: ${foodData.name}
  //     calories per 100 g: ${foodData.kcal_per_100_g}
  //     carbs per 100 g: ${foodData.carbs_per_100_g}
  //     protein per 100 g: ${foodData.protein_per_100_g}
  //     fat per 100 g: ${foodData.fat_per_100_g}
  //     sugar per 100 g: ${foodData.sugar_per_100_g}
  //     added sugar per 100 g: ${foodData.added_sugar_per_100_g}.
  //     Based on these validate the food data, only give answer as Valid or Not valid.`,
  //   }),
  // });

  // const data = await handleFetchResponseErrorsAndData(response);
  // const answer = data.output[0].content[0].text;

  const answer = "Not valid";

  console.log(answer);
  return answer;
}

// HELPERS
function getOpenAIApiKey() {
  return getAPIKey("OPEN_AI_API_KEY");
}

module.exports = {
  OPEN_AI_RESPONSE,
  getNutriScore,
  getValidation,
  getOpenAIApiKey,
};
