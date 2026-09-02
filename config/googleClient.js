const { google } = require("googleapis");

/*
==================================================
GOOGLE OAUTH2 CLIENT FACTORY

Reads credentials from environment variables.
See .env.example for how to obtain these values.
==================================================
*/

const REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
];

function assertConfigured() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(
      `Missing required Google OAuth environment variables: ${missing.join(
        ", ",
      )}. See .env.example for setup instructions.`,
    );
  }
}

/*
    Scopes requested during login.

    - openid / email / profile  -> identify the user
    - spreadsheets              -> create + edit the user's own Google Sheet
    - drive.file                -> access ONLY files this app creates/opens
                                    (does not grant access to the user's
                                    whole Drive, just an app-created folder
                                    and the files inside it)
*/
const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

function createOAuth2Client() {
  assertConfigured();

  console.log("GOOGLE CONFIG:", {
  clientId: process.env.GOOGLE_CLIENT_ID,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  secretLoaded: Boolean(process.env.GOOGLE_CLIENT_SECRET),
});


  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

module.exports = {
  createOAuth2Client,
  SCOPES,
};
