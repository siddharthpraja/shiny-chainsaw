const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function findByEmail(email) {
  const users = getUsers();

  return users.find((user) => user.email === email.toLowerCase());
}

function findById(id) {
  const users = getUsers();

  return users.find((user) => user.id === id);
}

function findByGoogleId(googleId) {
  const users = getUsers();

  return users.find((user) => user.googleId === googleId);
}

function createUser(user) {
  const users = getUsers();

  users.push(user);

  saveUsers(users);

  return user;
}

/*
    Shallow-merge `updates` into the stored user record identified by `id`
    and persist. Used to store/refresh Google tokens, spreadsheetId,
    driveFolderId, etc.
*/
function updateUser(id, updates) {
  const users = getUsers();

  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    throw new Error("User not found");
  }

  users[index] = {
    ...users[index],
    ...updates,
  };

  saveUsers(users);

  return users[index];
}

module.exports = {
  getUsers,
  saveUsers,
  findByEmail,
  findById,
  findByGoogleId,
  createUser,
  updateUser,
};
