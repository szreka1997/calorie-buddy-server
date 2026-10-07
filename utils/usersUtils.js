const { pool } = require("../db");
const {
  FIREBASE_BASE_URL,
  FIREBASE_BASE_REFRESH_URL,
  SIGN_IN_MODE,
  SIGN_UP_MODE,
  JSON_HEADERS,
} = require("../constants/commonConstants");
const { getAPIKey } = require("./commonUtils");

// FIREBASE
async function authenticateFirebaseUser({ email, password, isLogin = false }) {
  const apiKey = module.exports.getFirebaseApiKey();

  const response = await fetch(
    `${FIREBASE_BASE_URL}:${isLogin ? SIGN_IN_MODE : SIGN_UP_MODE}?key=${apiKey}`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message ||
        `Firebase ${isLogin ? "login" : "sign up"} failed`,
    );
    error.status = 400;
    error.details = data?.error;
    throw error;
  }

  return data;
}

async function refreshFirebaseUser({ apiKey, refreshToken }) {
  const response = await fetch(`${FIREBASE_BASE_REFRESH_URL}?key=${apiKey}`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || "Firebase token refresh failed",
    );
    error.status = 400;
    error.details = data?.error;

    throw error;
  }

  return data;
}

async function deleteFirebaseUser({ apiKey, idToken }) {
  const firebaseResponse = await fetch(
    `${FIREBASE_BASE_URL}:delete?key=${apiKey}`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ idToken }),
    },
  );

  const firebaseData = await firebaseResponse.json();

  if (!firebaseResponse.ok) {
    const error = new Error(
      firebaseData?.error?.message || "Failed to delete user from Firebase",
    );
    error.status =
      firebaseResponse.status === 200 ? 400 : firebaseResponse.status;
    error.details = firebaseData?.error;

    throw error;
  }

  return firebaseData;
}

// DB
async function updateUserTokens({ userId, idToken, refreshToken }) {
  await pool.query(
    `UPDATE users SET firebase_id_token = $2, firebase_refresh_token = $3 WHERE id = $1`,
    [userId, idToken, refreshToken],
  );
}

// HELPERS
function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function getFirebaseApiKey() {
  return getAPIKey("FIREBASE_API_KEY");
}

module.exports = {
  authenticateFirebaseUser,
  refreshFirebaseUser,
  deleteFirebaseUser,
  updateUserTokens,
  extractBearerToken,
  getFirebaseApiKey,
};
