const express = require("express");
const cookieParser = require("cookie-parser");
const { loginPage, helloPage } = require("./pages");

async function verifyToken(token, authApi, fetchFn) {
  const response = await fetchFn(`${authApi}/api/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.valid ? data.username : null;
}

function createApp({ authApi = "http://127.0.0.1:8080", fetchFn = fetch } = {}) {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(cookieParser());

  async function requireAuth(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
      return res.redirect("/");
    }

    try {
      const username = await verifyToken(token, authApi, fetchFn);
      if (!username) {
        res.clearCookie("token");
        return res.redirect("/");
      }
      req.username = username;
      next();
    } catch {
      res.clearCookie("token");
      return res.redirect("/");
    }
  }

  app.get("/", (req, res) => {
    if (req.cookies.token) {
      return res.redirect("/hello");
    }
    res.type("html").send(loginPage());
  });

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
      const response = await fetchFn(`${authApi}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        return res
          .status(401)
          .type("html")
          .send(loginPage("Invalid username or password."));
      }

      const data = await response.json();
      res.cookie("token", data.token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
      });
      return res.redirect("/hello");
    } catch {
      return res
        .status(503)
        .type("html")
        .send(
          loginPage(
            "Auth service unavailable. Is the Rust API running on port 8080?"
          )
        );
    }
  });

  app.get("/hello", requireAuth, (req, res) => {
    res.type("html").send(helloPage(req.username));
  });

  app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
  });

  return app;
}

module.exports = { createApp, verifyToken };
