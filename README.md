# Rust + Node.js Auth Demo

A small demo showing **Rust** handling authentication and **Node.js** serving the web UI.

## Architecture

```
Browser  →  Node.js (port 3000)  →  Rust auth API (port 8080)
              login page                 JWT login + verify
              hello world page
```

- **Rust (`auth-api/`)**: Axum REST API with `/api/login` and `/api/verify`
- **Node.js (`web/`)**: Express app with login form and protected Hello World page

## Demo credentials

| Username | Password   |
|----------|------------|
| `demo`   | `hello123` |

## Run locally

Open two terminals from this folder.

### 1. Start the Rust auth API

```powershell
cd auth-api
cargo run
```

### 2. Start the Node.js web app

```powershell
cd web
npm install
npm start
```

### 3. Open the app

Visit [http://127.0.0.1:3000](http://127.0.0.1:3000), log in, and you'll see the Hello World page.

## CI

Unit tests run automatically on GitHub Actions for every push and pull request to `main` (Rust + Node.js).

## Run tests locally

### Rust auth API

```powershell
cd auth-api
cargo test
```

### Node.js web app

```powershell
cd web
npm install
npm test
```

## Quick start (Windows)

From the project root:

```powershell
.\start.ps1
```

This starts both servers in separate windows.
