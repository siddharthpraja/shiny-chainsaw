const { google } = require("googleapis");
const { Readable } = require("stream");

const userModel = require("../models/userModel");

const { getAuthorizedClient } = require("./googleAuthService");

const UPLOADS_FOLDER_NAME = "MyExcelDB Uploads";

async function getDriveClient(userId) {
  const user = userModel.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const auth = await getAuthorizedClient(user);

  return { drive: google.drive({ version: "v3", auth }), user };
}

/*
==================================================
FIND OR CREATE THE APP'S UPLOADS FOLDER

Uses the `drive.file` scope, so this app can only see/manage
files and folders that it itself creates - not the user's
whole Drive.
==================================================
*/
async function ensureUploadsFolder(userId) {
  const user = userModel.findById(userId);

  if (user && user.driveFolderId) {
    return user.driveFolderId;
  }

  const { drive } = await getDriveClient(userId);

  const { data } = await drive.files.create({
    requestBody: {
      name: UPLOADS_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  userModel.updateUser(userId, { driveFolderId: data.id });

  return data.id;
}

/*
==================================================
UPLOAD A FILE (replaces multer's local disk storage)
==================================================
*/
async function uploadFile(userId, buffer, originalName, mimeType) {
  const { drive } = await getDriveClient(userId);

  const folderId = await ensureUploadsFolder(userId);

  const { data } = await drive.files.create({
    requestBody: {
      name: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${originalName}`,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, name, size, mimeType, webViewLink",
  });

  // Make the file viewable via link so it can be embedded/shared.
  // Safe under drive.file scope: this only touches files the app created.
  await drive.permissions.create({
    fileId: data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    fileId: data.id,
    originalName,
    fileName: data.name,
    size: data.size,
    mimeType: data.mimeType,
    url: `https://drive.google.com/uc?id=${data.id}`,
    viewUrl: data.webViewLink,
  };
}

module.exports = {
  ensureUploadsFolder,
  uploadFile,
};
