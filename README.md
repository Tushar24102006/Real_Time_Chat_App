# PrepPulse — Campus Placement Prep Real-Time Chat Platform

PrepPulse is a high-performance, real-time community chat platform crafted specifically for college students preparing for campus placements. It provides dedicated rooms for **DSA LeetCode Grind**, **Core Java & Spring Framework**, and **HR / Behavioral Prep**, as well as private 1-to-1 mentorship messaging.

---

## Architecture Overview

```
                      ┌───────────────────────────────┐
                      │    React + Vite Single Page   │
                      │  Tokens.css / DM Sans / Mono  │
                      └──────────────┬────────────────┘
                                     │
                     HTTP REST / JWT │ WebSocket (STOMP + SockJS)
                                     ▼
                      ┌───────────────────────────────┐
                      │  Spring Boot 3.3.4 (Java 17)  │
                      │  Spring Security + JPA + WS   │
                      └───────┬───────────────┬───────┘
                              │               │
                              ▼               ▼
                      ┌──────────────┐ ┌──────────────┐
                      │  PostgreSQL  │ │    Redis     │
                      │ (Persistent) │ │  (Presence)  │
                      └──────────────┘ └──────────────┘
```

---

## Tech Stack

### Backend
- **Java 17** & **Spring Boot 3.3.4**
- **Spring Security** + **JWT (JJWT 0.12.6)** for stateless token authentication
- **Spring WebSocket (STOMP + SockJS)** for bidirectional low-latency messaging
- **Spring Data JPA** with **PostgreSQL** & **Flyway Database Migrations**
- **Redis (Lettuce)** for atomic multi-tab session presence tracking
- **Springdoc OpenAPI (Swagger UI)** at `/swagger-ui.html`

### Frontend
- **React 18** with **Vite**
- **Vanilla CSS Tokens (`tokens.css`)** with 4px grid and accessible light/dark themes
- **@stomp/stompjs** + **SockJS-client** for real-time STOMP subscriptions
- **Lucide React** icons

---

## Key Features Across All Phases

1. **Authentication & Security (Phase 1)**:
   - Register & Login with BCrypt hashed passwords and 1-hour JWT tokens.
   - Comprehensive validation and `GlobalExceptionHandler`.
2. **Rooms & Groups (Phase 2)**:
   - Topic-based study groups (`DSA Grind`, `Java Core`, `HR Prep`).
   - Private 1-to-1 direct messaging (same schema path with 2 members).
   - Roles (`ADMIN`, `MEMBER`), member management, and leave group capability.
3. **Real-Time STOMP Messaging (Phase 3)**:
   - Low-latency message broadcast over `/topic/room.{roomId}`.
   - Membership authorization checks before persistence.
   - 2-minute message grouping and optimistic UI updates.
4. **Pagination & Read Receipts (Phase 4)**:
   - Infinite scroll upward with viewport preservation.
   - Dynamic unread count badges per room.
   - Delivery status ticks (`SENT` $\rightarrow$ `DELIVERED` $\rightarrow$ `SEEN`).
5. **Redis Presence & Typing (Phase 5)**:
   - Multi-tab tracking with Redis atomic counters (`INCR`/`DECR`).
   - "Last seen" timestamps saved in PostgreSQL on final tab close.
   - Debounced typing indicator (`"Priya is typing..."`).
6. **Collaboration Extras (Phase 6)**:
   - In-room message search with instant highlights.
   - File and image attachment uploads (up to 10MB).
   - Soft-delete messages (`"This message was deleted"`).
   - Hover action bar for quick copying and deletion.

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new student account |
| `POST` | `/api/auth/login` | Authenticate student and get JWT |
| `GET` | `/api/users/me` | Fetch authenticated student profile |
| `GET` | `/api/users/search?q=` | Search classmates by username or name |
| `GET` | `/api/rooms` | Fetch user rooms with last message & unread count |
| `POST` | `/api/rooms` | Create a new study group room |
| `POST` | `/api/rooms/private/{userId}` | Get or create 1-to-1 conversation |
| `POST` | `/api/rooms/{id}/members` | Add classmate to group (Admin only) |
| `DELETE` | `/api/rooms/{id}/members/{userId}` | Remove member or leave group |
| `POST` | `/api/rooms/{id}/read` | Mark all room messages as read |
| `GET` | `/api/rooms/{id}/messages?page=0&size=25` | Fetch message history (newest first) |
| `POST` | `/api/rooms/{id}/messages` | Send message via REST fallback |
| `DELETE` | `/api/rooms/{id}/messages/{msgId}` | Soft-delete a message |
| `GET` | `/api/rooms/{id}/messages/search?q=` | Search messages within a room |
| `POST` | `/api/uploads` | Upload image or document note |
| `GET` | `/api/presence` | Fetch online presence map |

---

## Quickstart & Local Deployment

### 1. Start Database & Redis
```bash
docker-compose up -d postgres redis
```

### 2. Run Backend
```bash
cd backend
mvn spring-boot:run
# Server runs on http://localhost:8082
# Swagger UI available at http://localhost:8082/swagger-ui.html
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## Cross-Device & Local Network Mode

PrepPulse supports cross-device real-time messaging across laptops, tablets, and Android/iOS smartphones on the same Wi-Fi network without requiring page reloads.

- **Host Binding**: Vite and Spring Boot both bind to `0.0.0.0`
- **Frontend URL**: `http://<YOUR_LAN_IP>:5173`
- **Backend URL**: `http://<YOUR_LAN_IP>:8082`
- **Setup Guide**: See [NETWORK_SETUP.md](file:///c:/Users/Tushar/Desktop/chat/NETWORK_SETUP.md) for Windows Defender Firewall configuration and step-by-step mobile connection.
- **Production Cloud Deployment**: See [DEPLOYMENT.md](file:///c:/Users/Tushar/Desktop/chat/DEPLOYMENT.md) for deploying to Railway, Render, Vercel, HTTPS, and WSS.

---

## Deployment Guidelines

### Backend (Render / Railway)
1. Link GitHub repository to Render/Railway.
2. Add a managed PostgreSQL instance and a managed Redis instance.
3. Configure Environment Variables:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `REDIS_HOST`, `REDIS_PORT`
   - `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`
4. Build Command: `mvn clean package -DskipTests`
5. Start Command: `java -jar target/chatapp-1.0.0-SNAPSHOT.jar`

### Frontend (Vercel / Netlify)
1. Import `frontend/` directory into Vercel/Netlify.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set up proxy or `VITE_API_BASE_URL` pointing to the deployed backend domain.

