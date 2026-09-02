require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const authRoutes = require("./routes/authRoutes");
const workbookRoutes = require("./routes/workbookRoutes");
const tableRoutes = require("./routes/tableRoutes");
const columnRoutes = require("./routes/columnRoutes");
const rowRoutes = require("./routes/rowRoutes");
const queryRoutes = require("./routes/queryRoutes");
const exportRoutes = require("./routes/exportRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());


const PORT = process.env.PORT || 3000;

// Only local persistence left is the users.json "table" of app accounts
// (name/email/Google tokens/spreadsheetId). Table data itself now lives
// in each user's own Google Sheet, and uploaded files live in Google Drive.
const DATA_DIR = path.join(__dirname, "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

const usersFile = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, "[]");
}

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "change-this-secret-before-production",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/workbook", workbookRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/rows", rowRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});



app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.listen(PORT, () => {
  console.log(`MyExcelDB running on port ${PORT}`);
});
