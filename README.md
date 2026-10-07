# Calorie Buddy — Server

This repository contains the **backend REST API** for Calorie Buddy, a full-stack mobile calorie and nutrition tracking application developed as my **Bachelor's thesis**.

The backend is responsible for handling application data, business logic, database communication and communication with external services. It is built with Node.js and Express and uses PostgreSQL for persistent data storage.

## Features

- 🔐 User and account management
- 🎯 Personalized user goals
- ⚖️ Body weight history management
- 🍎 Food management
- 🍽️ Meal management
- 🔗 Food-to-meal relationship management
- 📋 Daily food history tracking
- 📊 Calorie deficit tracking
- 🤖 OpenAI API integration for automatically assigning Nutri-Score ratings to food items
- 🔑 Firebase-based authentication integration
- 🗄️ PostgreSQL database
- 🐳 Docker-based development environment
- 🧪 Automated API testing with Jest and Supertest

## Tech Stack

- **Node.js**
- **Express.js**
- **PostgreSQL**
- **Docker**
- **Docker Compose**
- **Adminer**
- **Firebase Authentication**
- **OpenAI API**
- **Jest**
- **Supertest**

The server uses the `pg` package to communicate with PostgreSQL.

## Architecture

```text
┌──────────────────────────────┐
│      React Native Client     │
│        Expo / JavaScript     │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│     Node.js / Express API    │
│          Port 3500           │
└───────┬───────────────┬──────┘
        │               │
        │               │
        ▼               ▼
┌───────────────┐  ┌───────────────┐
│  PostgreSQL   │  │ External APIs │
│   Database    │  │ Firebase /    │
│               │  │ OpenAI        │
└───────────────┘  └───────────────┘
```

The backend is containerized with Docker. The Docker Compose configuration starts the PostgreSQL database, the application server and an Adminer instance for database administration.

## API Routes

The server exposes REST endpoints for the main application entities:

| Route                  | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `/users`               | User management and authentication-related operations |
| `/user-goals`          | User nutrition goals                                  |
| `/weight-histories`    | Body weight history                                   |
| `/foods`               | Food management                                       |
| `/meals`               | Meal management                                       |
| `/meal-food-relations` | Relationships between meals and foods                 |
| `/food-histories`      | Daily food tracking                                   |
| `/calories-deficits`   | Calorie deficit tracking                              |

These routes are registered directly in the Express application.

## Project Structure

```text
calorie-buddy-server/
├── constants/           # Server-side constants
├── db/                  # PostgreSQL connection and database utilities
├── docker/
│   └── postgres/        # Database initialization and seed data
├── routes/              # REST API route handlers
├── tests/               # Backend tests
├── utils/               # Utility functions
├── .env.example         # Environment variable template
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── server.js             # Express application entry point
```

## Getting Started

### Prerequisites

Install the following before starting the server:

- Node.js
- npm
- Docker Desktop
- Git Bash

Docker Desktop must be running before starting the application.

### 1. Clone the Repository

Clone the server repository and navigate into the project directory.

```bash
cd calorie-buddy-server
```

### 2. Configure Environment Variables

Create a local `.env` file based on `.env.example`.

The project uses environment variables for:

- Server configuration
- PostgreSQL connection
- Firebase Authentication
- OpenAI API access

Example:

```text
PORT=3500

PGHOST=localhost
PGPORT=5432
PGDATABASE=app_db
PGUSER=app_user
PGPASSWORD=your_local_password
PGSSLMODE=disable

FIREBASE_API_KEY=your_firebase_api_key
OPEN_AI_API_KEY=your_openai_api_key
```

Never commit real API keys or other secrets to the repository.

### 3. Install Dependencies

Open Git Bash in the project directory and run:

```bash
npm install
```

### 4. Start the Application

Start the PostgreSQL database and backend server using Docker Compose:

```bash
docker compose up --build
```

Docker Compose starts:

- PostgreSQL on port `5432`
- the backend server on port `3500`
- Adminer on port `8080`

The backend waits for PostgreSQL to become healthy before starting.

The API is available at:

```text
http://localhost:3500
```

### 5. Start the Client

After the server has started successfully, configure the server IP address in the client application:

```text
calorie-buddy-client-app/constants/urlConstants.js
```

Then follow the client repository's setup instructions to start the Expo application.

**The server must be started before the client application.**

## Docker

The backend uses a multi-service Docker Compose environment.

The PostgreSQL service uses PostgreSQL 16 and persists its data using a Docker volume. Database initialization scripts and seed data are mounted from the repository.

The server itself is built from the project's `Dockerfile` using Node.js 20 Alpine and exposes port `3500`.

### Useful Docker Commands

Start the complete environment:

```bash
docker compose up --build
```

Start in detached mode:

```bash
docker compose up --build -d
```

Stop the containers:

```bash
docker compose down
```

Stop the containers and remove the persisted database volume:

```bash
docker compose down -v
```

> Removing the volume deletes the PostgreSQL data stored by the Docker environment.

## Database Administration

The project includes **Adminer** as a lightweight database administration interface.

When the Docker environment is running, Adminer is available at:

```text
http://localhost:8080
```

The Docker Compose configuration automatically connects Adminer to the PostgreSQL service.

## Testing

The project uses **Jest** and **Supertest** for backend testing.

Run the test suite with:

```bash
npm run test
```

The configured test command also collects test coverage.

For development, the server can be started directly with:

```bash
npm run dev
```

which uses Nodemon for automatic restarts.

## Environment Variables

The repository contains an `.env.example` file documenting the required configuration.

The main environment variables include:

| Variable           | Purpose                         |
| ------------------ | ------------------------------- |
| `PORT`             | Backend server port             |
| `PGHOST`           | PostgreSQL host                 |
| `PGPORT`           | PostgreSQL port                 |
| `PGDATABASE`       | Database name                   |
| `PGUSER`           | Database user                   |
| `PGPASSWORD`       | Database password               |
| `PGSSLMODE`        | PostgreSQL SSL configuration    |
| `FIREBASE_API_KEY` | Firebase Authentication API key |
| `OPEN_AI_API_KEY`  | OpenAI API key                  |

The project explicitly provides placeholders for the Firebase and OpenAI credentials in `.env.example`.

## AI Integration

The backend integrates with the **OpenAI API** to automatically assign a **Nutri-Score rating** to food items added to the application.

This functionality allows the client application to provide additional nutritional feedback without requiring the user to manually calculate or enter the rating.

The OpenAI API key is configured through an environment variable and should never be committed to the repository.

## Related Repository

The React Native mobile client is maintained separately in the `calorie-buddy-client-app` repository.

The complete application therefore consists of:

```text
Calorie Buddy
│
├── calorie-buddy-client-app
│   └── React Native / Expo mobile application
│
└── calorie-buddy-server
    └── Node.js / Express REST API
        └── PostgreSQL database
```

## Bachelor's Thesis

This backend was developed as part of my **Bachelor's thesis**, together with the React Native mobile client.

The project demonstrates full-stack application development, including:

- REST API development
- Relational database design and integration
- Authentication
- CRUD operations
- Docker containerization
- Automated testing
- External API integration
- AI API integration
- Mobile-to-server communication

## License

This project is licensed under the MIT License.
