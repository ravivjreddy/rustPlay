const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp, verifyToken } = require("./app");
const { loginPage, helloPage } = require("./pages");

const VALID_TOKEN = "valid-token";

function createMockFetch(handlers) {
  return async (url, options = {}) => {
    const handler = handlers[url];
    if (!handler) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }
    return handler(options);
  };
}

test("loginPage renders sign-in form", () => {
  const html = loginPage();
  assert.match(html, /<h1>Sign in<\/h1>/);
  assert.match(html, /action="\/login"/);
  assert.match(html, /Demo credentials/);
});

test("loginPage renders error message when provided", () => {
  const html = loginPage("Invalid username or password.");
  assert.match(html, /Invalid username or password\./);
  assert.match(html, /class="error"/);
});

test("helloPage renders greeting with username", () => {
  const html = helloPage("demo");
  assert.match(html, /<h1>Hello, World!<\/h1>/);
  assert.match(html, /Welcome, demo\./);
  assert.match(html, /href="\/logout"/);
});

test("verifyToken returns username for valid token", async () => {
  const fetchFn = createMockFetch({
    "http://auth.test/api/verify": async () => ({
      ok: true,
      json: async () => ({ valid: true, username: "demo" }),
    }),
  });

  const username = await verifyToken(VALID_TOKEN, "http://auth.test", fetchFn);
  assert.equal(username, "demo");
});

test("verifyToken returns null for invalid token", async () => {
  const fetchFn = createMockFetch({
    "http://auth.test/api/verify": async () => ({
      ok: true,
      json: async () => ({ valid: false, username: null }),
    }),
  });

  const username = await verifyToken("bad-token", "http://auth.test", fetchFn);
  assert.equal(username, null);
});

test("verifyToken returns null when auth API responds with error", async () => {
  const fetchFn = createMockFetch({
    "http://auth.test/api/verify": async () => ({
      ok: false,
      json: async () => ({}),
    }),
  });

  const username = await verifyToken(VALID_TOKEN, "http://auth.test", fetchFn);
  assert.equal(username, null);
});

test("GET / shows login page when not authenticated", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: createMockFetch({}),
  });

  const response = await request(app).get("/");

  assert.equal(response.status, 200);
  assert.match(response.text, /<h1>Sign in<\/h1>/);
});

test("GET / redirects to /hello when cookie is present", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: createMockFetch({}),
  });

  const response = await request(app)
    .get("/")
    .set("Cookie", "token=existing");

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/hello");
});

test("POST /login redirects to /hello on success", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: createMockFetch({
      "http://auth.test/api/login": async () => ({
        ok: true,
        json: async () => ({ token: VALID_TOKEN, username: "demo" }),
      }),
    }),
  });

  const response = await request(app)
    .post("/login")
    .type("form")
    .send({ username: "demo", password: "hello123" });

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/hello");
  assert.match(response.headers["set-cookie"][0], /token=valid-token/);
});

test("POST /login returns 401 for invalid credentials", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: createMockFetch({
      "http://auth.test/api/login": async () => ({
        ok: false,
        json: async () => ({ error: "Invalid username or password" }),
      }),
    }),
  });

  const response = await request(app)
    .post("/login")
    .type("form")
    .send({ username: "demo", password: "wrong" });

  assert.equal(response.status, 401);
  assert.match(response.text, /Invalid username or password\./);
});

test("POST /login returns 503 when auth API is unavailable", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: async () => {
      throw new Error("connection refused");
    },
  });

  const response = await request(app)
    .post("/login")
    .type("form")
    .send({ username: "demo", password: "hello123" });

  assert.equal(response.status, 503);
  assert.match(response.text, /Auth service unavailable/);
});

test("GET /hello requires valid token", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: createMockFetch({
      "http://auth.test/api/verify": async () => ({
        ok: true,
        json: async () => ({ valid: true, username: "demo" }),
      }),
    }),
  });

  const response = await request(app)
    .get("/hello")
    .set("Cookie", `token=${VALID_TOKEN}`);

  assert.equal(response.status, 200);
  assert.match(response.text, /<h1>Hello, World!<\/h1>/);
  assert.match(response.text, /Welcome, demo\./);
});

test("GET /hello redirects home without token", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: createMockFetch({}),
  });

  const response = await request(app).get("/hello");

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/");
});

test("GET /hello redirects home when token verification fails", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: createMockFetch({
      "http://auth.test/api/verify": async () => ({
        ok: true,
        json: async () => ({ valid: false, username: null }),
      }),
    }),
  });

  const response = await request(app)
    .get("/hello")
    .set("Cookie", "token=expired");

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/");
});

test("GET /logout clears cookie and redirects home", async () => {
  const app = createApp({
    authApi: "http://auth.test",
    fetchFn: createMockFetch({}),
  });

  const response = await request(app)
    .get("/logout")
    .set("Cookie", `token=${VALID_TOKEN}`);

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/");
  assert.match(response.headers["set-cookie"][0], /token=;/);
});
