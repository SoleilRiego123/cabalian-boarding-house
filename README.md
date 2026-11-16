# Cabalian Boarding House Management System

A React + Express + MongoDB starter implementation for the agreed requirements.

## Requirements
- Node.js 20+ and MongoDB (local or Atlas)
- Two terminals: one for the API and one for React

## Setup
1. Extract the ZIP.
2. Open the project folder in VS Code.
3. Backend:
   - `cd server`
   - Copy `.env.example` to `.env`
   - Set `MONGO_URI` and `JWT_SECRET`
   - `npm install`
   - `npm run dev`
4. Frontend (new terminal):
   - `cd client`
   - `npm install`
   - `npm run dev`
5. Open the Vite URL shown in the terminal.

The backend runs on `http://localhost:5000`; the frontend defaults to `http://localhost:5173`.

## Features included
- Owner registration, login, and logout
- Password hashing and JWT authentication
- Owner-scoped boarding house profile, rooms, students, payments, receipts, and reservations
- Public boarding-house listings and search/filter
- Public reservation request without visitor login
- Payment receipt generation and printable receipt view
- Boarding-house photo upload (stored in `server/uploads`; image path saved in MongoDB)
- Responsive React interface

## Notes
- This is a functional starter project. Configure MongoDB before running.
- For deployment, use HTTPS, secure environment secrets, persistent file storage, backups, and production-grade validation/rate limiting.
- Each owner account can manage one boarding-house profile in this version.
