const userModel = require("../models/userModel");

const workbookModel = require("../models/workbookModel");

const { createToken, verifyToken } = require("../services/tokenService");

const googleAuthService = require("../services/googleAuthService");

const FRONTEND_URL = process.env.FRONTEND_URL || "";

/*
==================================================
STEP 1 - REDIRECT TO GOOGLE'S CONSENT SCREEN
==================================================
*/
function googleLogin(req, res) {
  try {
    const url = googleAuthService.getAuthUrl();

    res.redirect(url);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        "Google sign-in is not configured. See .env.example for setup steps.",
    });
  }
}

/*
==================================================
STEP 2 - GOOGLE REDIRECTS BACK WITH ?code=...

Exchanges the code for tokens, creates/updates the local
user record, provisions a spreadsheet + Drive folder for
first-time users, then hands the app back a JWT via a
redirect to a small static landing page.
==================================================
*/
async function googleCallback(req, res) {
  try {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(
        `/login.html?error=${encodeURIComponent("Google sign-in was cancelled")}`,
      );
    }

    if (!code) {
      return res.redirect(
        `/login.html?error=${encodeURIComponent("Missing authorization code")}`,
      );
    }

    const { tokens, profile } = await googleAuthService.handleCallback(code);

    if (!profile || !profile.id || !profile.email) {
      throw new Error("Unable to read Google profile");
    }

    let user = userModel.findByGoogleId(profile.id);

    const googleTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };

    if (user) {
      // Existing user - refresh stored tokens (keep old refresh_token if
      // Google didn't send a new one on this login).
      user = userModel.updateUser(user.id, {
        name: profile.name || user.name,
        google: {
          ...user.google,
          ...googleTokens,
          refreshToken: googleTokens.refreshToken || user.google.refreshToken,
        },
      });
    } else {
      // Also check by email in case an account already exists
      user = userModel.findByEmail(profile.email.toLowerCase());

      if (user) {
        user = userModel.updateUser(user.id, {
          googleId: profile.id,
          google: googleTokens,
        });
      } else {
        user = userModel.createUser({
          id: Date.now().toString(),
          name: profile.name || profile.email,
          email: profile.email.toLowerCase(),
          googleId: profile.id,
          google: googleTokens,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // First-time setup: create the user's Google Sheet database
    if (!user.spreadsheetId) {
      await workbookModel.initialize(user.id);
    }

    const token = createToken(user);

    const decoded = verifyToken(token);

    const params = new URLSearchParams({
      token,
      exp: new Date(decoded.exp * 1000).toISOString(),
      login: new Date().toISOString(),
    });

    res.redirect(`${FRONTEND_URL}/oauth-callback.html?${params.toString()}`);
  } catch (error) {
    console.error(error);

    res.redirect(
      `/login.html?error=${encodeURIComponent("Google sign-in failed. Please try again.")}`,
    );
  }
}

function me(req, res) {
  const user = userModel.findById(req.userId);

  if (!user) {
    return res.status(401).json({
      error: "User not found",
    });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    googleLinked: Boolean(user.googleId),
  });
}

function logout(req, res) {
  // JWT is stateless.
  // Frontend removes the token.

  res.json({
    success: true,
  });
}

module.exports = {
  googleLogin,
  googleCallback,
  me,
  logout,
};
