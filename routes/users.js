const express = require("express");

const { pool } = require("../db");
const { INTERNAL_SERVER_ERROR } = require("../constants/commonConstants");
const {
  USERS_TABLE_NAME,
  USERS_SELECT_FIELDS_SQL,
} = require("../constants/usersConstants");
const {
  validateUserPayload,
  validateResourceAccess,
} = require("../utils/validationUtils");
const {
  insertRecord,
  updateRecord,
  removeRecord,
  buildErrorStatusAndMessage,
  findRecordById,
} = require("../utils/commonUtils");
const {
  authenticateFirebaseUser,
  refreshFirebaseUser,
  deleteFirebaseUser,
  updateUserTokens,
  getFirebaseApiKey,
} = require("../utils/usersUtils");

const router = express.Router();
const tableName = USERS_TABLE_NAME;

async function signUpUser(req, res) {
  const { email, password, user } = req.body || {};

  if (!email || !password || !user) {
    return res.status(400).json({
      error: "email, password, and user payload are required",
    });
  }

  try {
    const validatedUser = validateUserPayload({ user });
    const firebaseAccount = await authenticateFirebaseUser({ email, password });

    const row = await insertRecord({
      tableName,
      data: {
        ...validatedUser,
        id: firebaseAccount.localId,
        email_address: email,
        firebase_id_token: firebaseAccount.idToken,
        firebase_refresh_token: firebaseAccount.refreshToken,
      },
    });

    res.status(201).json({
      message: "User signed up successfully",
      user: row,
    });
  } catch (error) {
    console.error("Failed to create user during signup", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function loginUser(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: "email and password are required",
    });
  }

  try {
    const firebaseAccount = await authenticateFirebaseUser({
      email,
      password,
      isLogin: true,
    });
    const user = await findRecordById({
      tableName,
      id: firebaseAccount.localId,
    });

    await updateUserTokens({
      userId: firebaseAccount.localId,
      idToken: firebaseAccount.idToken,
      refreshToken: firebaseAccount.refreshToken,
    });

    res.json({
      message: "User logged in successfully",
      user: {
        ...user,
        firebase_id_token: firebaseAccount.idToken,
        firebase_refresh_token: firebaseAccount.refreshToken,
      },
    });
  } catch (error) {
    console.error("Failed to login user", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function refreshFirebaseTokenById(req, res) {
  const userId = req.params.id;
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  try {
    const apiKey = getFirebaseApiKey();
    const user = await findRecordById({
      tableName,
      id: userId,
    });

    if (user.firebase_refresh_token !== refreshToken) {
      return res.status(403).json({ error: "Refresh token mismatch" });
    }

    const data = await refreshFirebaseUser({ apiKey, refreshToken });

    await updateUserTokens({
      userId: data.user_id,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
    });

    res.json({
      message: "Token refreshed successfully",
      firebaseTokens: data,
    });
  } catch (error) {
    console.error("Failed to update Firebase data", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function getUsers(_, res) {
  try {
    const { rows } = await pool.query(
      `SELECT ${USERS_SELECT_FIELDS_SQL} FROM users ORDER BY id`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve users", error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR });
  }
}

async function getUserById(req, res) {
  try {
    const user = await validateResourceAccess({
      userId: req.params.id,
      authorizationHeader: req?.headers?.authorization,
    });

    res.json(user);
  } catch (error) {
    console.error("Failed to retrieve users", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function patchUserById(req, res) {
  const userId = req.params.id;
  const updateUserData = req.body || {};

  try {
    const validatedUser = validateUserPayload({
      user: updateUserData,
      isUpdate: true,
    });
    await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });

    const rows = await updateRecord({
      tableName,
      data: {
        ...validatedUser,
        id: userId,
      },
    });

    res.json({
      message: "User updated",
      user: rows[0],
    });
  } catch (error) {
    console.error("Failed to update user", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

async function deleteUserById(req, res) {
  const userId = req.params.id;

  try {
    const resource = await validateResourceAccess({
      userId,
      authorizationHeader: req?.headers?.authorization,
    });
    const apiKey = getFirebaseApiKey();

    await deleteFirebaseUser({
      apiKey,
      idToken: resource.firebase_id_token,
    });

    const rows = await removeRecord({
      tableName,
      id: userId,
    });

    res.json({
      message: "User deleted",
      user: rows[0],
    });
  } catch (error) {
    console.error("Failed to delete user", error);
    const err = buildErrorStatusAndMessage(error);
    return res.status(err.status).json({ error: err.message });
  }
}

router.post("/signup", signUpUser);
router.post("/login", loginUser);
router.post("/refresh/:id", refreshFirebaseTokenById);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", patchUserById);
router.delete("/:id", deleteUserById);

module.exports = router;
