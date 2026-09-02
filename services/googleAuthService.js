const { google } = require("googleapis");

const { createOAuth2Client, SCOPES } = require("../config/googleClient");

const userModel = require("../models/userModel");

/*
==================================================
BUILD THE "LOGIN WITH GOOGLE" URL
==================================================
*/
function getAuthUrl(state) {
  const client = createOAuth2Client();

  return client.generateAuthUrl({
    access_type: "offline", // required to receive a refresh_token
    prompt: "consent", // forces refresh_token on every login
    scope: SCOPES,
    state,
  });
}

/*
==================================================
EXCHANGE ?code= FOR TOKENS + FETCH PROFILE
==================================================
*/
async function handleCallback(code) {
  const client = createOAuth2Client();

  console.log("OAuth callback:", {
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    clientId: process.env.GOOGLE_CLIENT_ID,
    codeReceived: Boolean(code),
  });

  const { tokens } = await client.getToken(code);

  client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: client,
    version: "v2",
  });

  const { data: profile } = await oauth2.userinfo.get();

  return {
    tokens,
    profile,
  };
}


/*
==================================================
BUILD AN AUTHORIZED OAUTH2 CLIENT FOR A STORED USER

Automatically refreshes + persists a new access token
when the stored one has expired.
==================================================
*/
async function getAuthorizedClient(user) {
  if (!user || !user.google || !user.google.refreshToken) {
    throw new Error(
      "This account is not linked to Google. Please sign in with Google.",
    );
  }

  const client = createOAuth2Client();

  client.setCredentials({
    access_token: user.google.accessToken,
    refresh_token: user.google.refreshToken,
    expiry_date: user.google.expiryDate,
  });

  // Refresh proactively if the access token is missing/expired
  const isExpired =
    !user.google.expiryDate || user.google.expiryDate <= Date.now() + 60000;

  if (isExpired) {
    const { credentials } = await client.refreshAccessToken();

    client.setCredentials(credentials);

    userModel.updateUser(user.id, {
      google: {
        ...user.google,
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date,
        // refresh_token is only sent the first time; keep the old one
        refreshToken:
          credentials.refresh_token || user.google.refreshToken,
      },
    });
  }

  // Persist any refreshed token automatically going forward
  client.on("tokens", (tokens) => {
    const patch = {
      accessToken: tokens.access_token || user.google.accessToken,
      expiryDate: tokens.expiry_date || user.google.expiryDate,
    };

    if (tokens.refresh_token) {
      patch.refreshToken = tokens.refresh_token;
    }

    userModel.updateUser(user.id, {
      google: {
        ...user.google,
        ...patch,
      },
    });
  });

  return client;
}

module.exports = {
  getAuthUrl,
  handleCallback,
  getAuthorizedClient,
};
