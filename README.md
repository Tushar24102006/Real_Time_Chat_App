# PrepPulse – Real-Time Student Chat Application

## 📌 About the Project

**PrepPulse** is a full-stack real-time chat application built to make communication and collaboration among students easier and more interactive.

The platform allows users to communicate through private and group chats, share files and images, track message delivery and read status, and see other users' online presence in real time.

The application uses **Spring Boot** for backend services, **React.js** for the frontend, **PostgreSQL** for persistent data storage, and **Redis** for real-time presence management.

The project focuses on secure authentication, scalable backend architecture, real-time communication, and a responsive user experience.

## ✨ Key Features

### 🔐 Authentication & Security
- User registration and login.
- JWT-based authentication.
- Password hashing using BCrypt.
- Protected API endpoints.
- Role-based room permissions.
- Secure WebSocket connection authentication.

### 💬 Real-Time Messaging
- Instant messaging using WebSocket and STOMP.
- Private one-to-one conversations.
- Group conversations.
- Message history with pagination.
- Optimistic message updates.
- Message grouping for a better chat experience.

### 👥 Group & Room Management
- Create and manage chat rooms.
- Add and remove room members.
- Admin and Member roles.
- Private and group room types.
- Conversation list with unread message counts.

### ✓ Message Status & Notifications
- Sent, Delivered, and Seen message indicators.
- Unread message tracking.
- Last-read message tracking.
- Real-time typing indicators.
- Online and offline status.
- Last seen information.

### 📎 File & Media Sharing
- Upload images and files.
- Maximum upload size: 10 MB.
- Copy messages.
- Soft-delete messages.

### 🔎 Search & User Experience
- Search messages within rooms.
- Dark theme.
- Responsive user interface.
- Reconnection status indicator.
- Accessibility-focused UI improvements.

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, JavaScript, Vite |
| Backend | Java 17, Spring Boot 3.3.4 |
| Security | Spring Security, JWT, BCrypt |
| Real-Time Communication | WebSocket, STOMP, SockJS |
| Database | PostgreSQL 16 |
| Cache & Presence | Redis 7 |
| Database Migration | Flyway |
| API Documentation | Swagger / OpenAPI |
| Build Tool | Maven |
| Testing | Spring Boot Test |
| Containerization | Docker, Docker Compose |
| Version Control | Git & GitHub |

## 🏗️ System Architecture

```text
                 PREPPULSE APPLICATION
                          |
              +-----------+-----------+
              |                       |
         React Frontend          Spring Boot Backend
           (Vite)                 (REST APIs)
              |                       |
              |                 Spring Security
              |                       |
              |                  JWT Auth
              |                       |
              +------ WebSocket ------+
                         |
               +---------+---------+
               |                   |
          PostgreSQL             Redis
          Database          Presence / Cache
```

### Communication Flow

1. A user logs into the application.
2. The backend validates credentials and generates a JWT.
3. The frontend uses the JWT to access protected APIs.
4. A WebSocket connection is authenticated during connection establishment.
5. Messages are stored in PostgreSQL.
6. Messages are broadcast to connected room members.
7. Redis manages real-time online presence and multi-tab connection tracking.

## 📂 Project Structure

```text
PrepPulse/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── ...
│   │   │   └── resources/
│   │   └── test/
│   ├── uploads/
│   ├── Dockerfile
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── README.md
├── NETWORK_SETUP.md
└── DEPLOYMENT.md
```

*Note: The structure above is a high-level overview. Actual package and component names may vary.*

## ⚙️ Prerequisites

Install the following tools before running the project:

- Java Development Kit (JDK) 17
- Apache Maven
- Node.js and npm
- Docker Desktop
- Git
- PostgreSQL 16 (if not using Docker)
- Redis 7 (if not using Docker)

## 🚀 Getting Started

Follow these steps to run PrepPulse locally.

### 1. Clone the Repository

```bash

git clone https://github.com/Tushar24102006/Real-Time-Chat-App.git

cd Real-Time-Chat-App
```


### 2. Start PostgreSQL and Redis

From the project root directory:

```bash
docker compose up -d
```

This starts the database and Redis services configured in Docker Compose.

Check running containers:

```bash
docker compose ps
```

### 3. Configure the Backend

Navigate to the backend:

```bash
cd backend
```

Configure your database connection, Redis connection, JWT secret, and other required settings using your local configuration or environment variables.

**Important:** Never commit actual passwords, database credentials, or JWT secrets to GitHub.

Run the backend:

```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8082"
```

Backend URL:

```text
http://localhost:8082
```

Swagger API documentation:

```text
http://localhost:8082/swagger-ui/index.html
```

### 4. Configure the Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### 5. Access the Application

Open the frontend URL in your browser:

```text
http://localhost:5173
```

Register a user or log in with an existing account to start using PrepPulse.

## 🔌 API & Real-Time Communication

PrepPulse uses two communication mechanisms:

**REST API**
- User authentication.
- Room management.
- Message history.
- File uploads.
- Message search and management.

**WebSocket**
- Real-time message delivery.
- Typing indicators.
- Presence updates.
- Message status updates.

WebSocket endpoint:

```text
/ws
```

The frontend communicates with backend services through the configured API and WebSocket proxy.

## 🧪 Testing

Run backend tests:

```bash
cd backend
mvn test
```

Build the frontend:

```bash
cd frontend
npm run build
```

These commands help verify backend tests and frontend production compilation.

## 🔒 Security Considerations

- JWT authentication for protected resources.
- BCrypt password hashing.
- Authenticated WebSocket connections.
- Role-based room access.
- Input validation and exception handling.
- Secrets managed outside version control.
- CORS configured for trusted application origins.

For production deployment, use HTTPS and secure WebSocket connections (WSS), restrict allowed origins, and configure persistent storage for uploaded files.

## 🌐 Deployment

PrepPulse is designed to support deployment of its frontend and backend as separate services.

A production deployment requires:

- Frontend hosting.
- Spring Boot backend hosting.
- PostgreSQL database.
- Redis service.
- Environment-based configuration.
- HTTPS and WSS.
- Persistent storage for uploaded files.

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment-related configuration.

## 🗺️ Future Enhancements

Potential improvements for future versions:

- Push notifications.
- Voice and video calling.
- Message reactions and replies.
- Advanced moderation tools.
- User profile customization.
- Improved media management.
- Production monitoring and analytics.

## 🎯 Learning Outcomes

This project provides practical experience with:

- Full-stack application development.
- REST API design using Spring Boot.
- JWT authentication and Spring Security.
- WebSocket and STOMP communication.
- PostgreSQL database integration.
- Redis-based real-time presence management.
- React frontend development.
- Docker-based local development.
- Testing, debugging, and deployment preparation.

## 👨‍💻 Author

**Tushar**

Information Technology Student | Java Backend Developer

- GitHub: [Tushar24102006](https://github.com/Tushar24102006)

