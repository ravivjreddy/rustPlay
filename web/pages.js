function loginPage(error = "") {
  const alert = error ? `<p class="error">${error}</p>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login — Rust + Node Demo</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: #e2e8f0;
    }
    .card {
      width: min(420px, 92vw);
      padding: 2rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
    }
    h1 { margin-top: 0; font-size: 1.5rem; }
    p { color: #94a3b8; line-height: 1.5; }
    label { display: block; margin-bottom: 0.35rem; font-size: 0.9rem; }
    input {
      width: 100%;
      padding: 0.75rem 0.85rem;
      margin-bottom: 1rem;
      border-radius: 10px;
      border: 1px solid #334155;
      background: #0f172a;
      color: #f8fafc;
    }
    button {
      width: 100%;
      padding: 0.85rem;
      border: none;
      border-radius: 10px;
      background: #38bdf8;
      color: #0f172a;
      font-weight: 700;
      cursor: pointer;
    }
    button:hover { background: #7dd3fc; }
    .hint {
      margin-top: 1rem;
      font-size: 0.85rem;
      color: #64748b;
    }
    .error {
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.12);
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Sign in</h1>
    <p>Log in to reach the Hello World page. Authentication is handled by the Rust API.</p>
    ${alert}
    <form method="POST" action="/login">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Log in</button>
    </form>
    <p class="hint">Demo credentials: <strong>demo</strong> / <strong>hello123</strong></p>
  </div>
</body>
</html>`;
}

function helloPage(username) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hello World</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Georgia, serif;
      background: radial-gradient(circle at top, #fef3c7, #fde68a 45%, #f59e0b);
      color: #78350f;
    }
    .card {
      text-align: center;
      padding: 3rem 4rem;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.75);
      box-shadow: 0 24px 60px rgba(120, 53, 15, 0.25);
    }
    h1 {
      font-size: clamp(2.5rem, 8vw, 4rem);
      margin: 0 0 0.5rem;
    }
    p { font-size: 1.1rem; margin: 0 0 1.5rem; }
    a {
      color: #92400e;
      text-decoration: none;
      font-family: system-ui, sans-serif;
      font-weight: 600;
    }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello, World!</h1>
    <p>Welcome, ${username}. You are signed in via Rust + Node.js.</p>
    <a href="/logout">Log out</a>
  </div>
</body>
</html>`;
}

module.exports = { loginPage, helloPage };
