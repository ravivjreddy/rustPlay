const { createApp } = require("./app");

const AUTH_API = process.env.AUTH_API || "http://127.0.0.1:8080";
const PORT = process.env.PORT || 3000;

const app = createApp({ authApi: AUTH_API });

app.listen(PORT, () => {
  console.log(`Node.js web app listening on http://127.0.0.1:${PORT}`);
  console.log(`Proxying auth to ${AUTH_API}`);
});
