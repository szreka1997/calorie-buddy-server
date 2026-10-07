require("dotenv").config();

const express = require("express");

const { assertDatabaseConnection, shutdownPool } = require("./db");
const usersRouter = require("./routes/users");
const userGoalsRouter = require("./routes/userGoals");
const weightHistoriesRouter = require("./routes/weightHistories");
const foodsRouter = require("./routes/foods");
const mealsRouter = require("./routes/meals");
const mealFoodRelationsRouter = require("./routes/mealFoodRelations");
const foodHistoriesRouter = require("./routes/foodHistories");
const caloriesDeficitsRouter = require("./routes/caloriesDeficits");

const PORT = Number(process.env.PORT) || 3500;

const app = express();

app.use(express.json());

app.use("/users", usersRouter);
app.use("/user-goals", userGoalsRouter);
app.use("/weight-histories", weightHistoriesRouter);
app.use("/foods", foodsRouter);
app.use("/meals", mealsRouter);
app.use("/meal-food-relations", mealFoodRelationsRouter);
app.use("/food-histories", foodHistoriesRouter);
app.use("/calories-deficits", caloriesDeficitsRouter);

let serverInstance;

async function startServer() {
  try {
    await assertDatabaseConnection();
    serverInstance = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL", error);
    process.exit(1);
  }
}

function shutdown() {
  console.log("Shutting down server...");

  const closePool = () =>
    shutdownPool()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Failed to close PostgreSQL connection pool", error);
        process.exit(1);
      });

  if (serverInstance) {
    serverInstance.close(closePool);
  } else {
    closePool();
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();

module.exports = app;
