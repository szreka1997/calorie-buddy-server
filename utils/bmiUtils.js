const { ACTIVITY_LEVEL, SEX } = require("../constants/bmiConstants");

function getDayDiff(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  const diffTime = Math.abs(d2 - d1); // difference in milliseconds
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // convert to days

  return diffDays;
}

function getAge(birthday, today) {
  const parsedBirthday = new Date(birthday);

  today = new Date(today);
  let age = today.getFullYear() - parsedBirthday.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > parsedBirthday.getMonth() ||
    (today.getMonth() === parsedBirthday.getMonth() &&
      today.getDate() >= parsedBirthday.getDate());

  return hasHadBirthdayThisYear ? age : age - 1;
}

function getBMR({ sex, birthday, height, weight, today }) {
  const parsedBirthday = new Date(birthday);
  const parsedHeight = parseInt(height);
  const parsedWeight = parseFloat(weight);
  const age = getAge(parsedBirthday, today);

  const maleBMR = Math.round(
    10 * parsedWeight + 6.25 * parsedHeight - 5 * age + 5,
  );
  const femaleBMR = Math.round(
    10 * parsedWeight + 6.25 * parsedHeight - 5 * age - 161,
  );

  return sex === SEX.MALE ? maleBMR : femaleBMR;
}

function getCalorieNeeds({
  activityLevel,
  sex,
  birthday,
  height,
  weight,
  today,
}) {
  const parsedBMR = parseInt(getBMR({ sex, birthday, height, weight, today }));

  switch (activityLevel) {
    case ACTIVITY_LEVEL.NOT_VERY_ACTIVE.title:
      return Math.round(parsedBMR * 1.2);
    case ACTIVITY_LEVEL.LIGHTLY_ACTIVE.title:
      return Math.round(parsedBMR * 1.375);
    case ACTIVITY_LEVEL.ACTIVE.title:
      return Math.round(parsedBMR * 1.55);
    case ACTIVITY_LEVEL.VERY_ACTIVE.title:
      return Math.round(parsedBMR * 1.725);
    case ACTIVITY_LEVEL.EXTRA_ACTIVE.title:
      return Math.round(parsedBMR * 1.9);
    default:
      throw new Error("Invalid parameter: activity_level!");
  }
}

module.exports = {
  getDayDiff,
  getAge,
  getBMR,
  getCalorieNeeds,
};
