# MyExcelDB - Setup Guide (Google Sheets + Google Drive edition)

This app now stores each user's data in **their own Google Sheet** and
uploaded images in **their own Google Drive**. Users authenticate with
"Sign in with Google", which also grants the app permission to create
and edit that spreadsheet and folder.

Follow the steps below once, to get the credentials that go in `.env`.

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Google Cloud project

1. Go to https://console.cloud.google.com/
2. Click the project dropdown (top left) -> **New Project**.
3. Name it anything (e.g. "MyExcelDB") -> **Create**.
4. Make sure the new project is selected in the dropdown.

## 3. Enable the required APIs

1. In the left menu, go to **APIs & Services -> Library**.
2. Search for **Google Sheets API** -> click it -> **Enable**.
3. Search for **Google Drive API** -> click it -> **Enable**.

## 4. Configure the OAuth consent screen

1. Go to **APIs & Services -> OAuth consent screen**.
2. Choose **External** (unless you have a Google Workspace org and want
   **Internal**) -> **Create**.
3. Fill in:
   - App name: `MyExcelDB` (or anything you like)
   - User support email: your email
   - Developer contact email: your email
4. On the **Scopes** step, click **Add or remove scopes** and add:
   - `.../auth/spreadsheets`
   - `.../auth/drive.file`
   - (the default `openid`, `.../auth/userinfo.email`,
     `.../auth/userinfo.profile` scopes are fine to leave as-is)
5. On the **Test users** step (only needed while the app is in
   "Testing" publishing status), add the Google account(s) you'll use
   to log in.
6. Save through to the summary page.

> While the app is in "Testing" status, only the test users you added
> can log in. To let anyone log in, you'd submit the app for Google's
> verification review - not required for local development or
> internal use.

## 5. Create an OAuth client ID

1. Go to **APIs & Services -> Credentials**.
2. Click **+ Create Credentials -> OAuth client ID**.
3. Application type: **Web application**.
4. Name: anything (e.g. "MyExcelDB Web Client").
5. Under **Authorized redirect URIs**, click **+ Add URI** and enter
   the exact callback URL this app uses:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   (If you deploy this app somewhere else, add that URL too, e.g.
   `https://yourdomain.com/api/auth/google/callback`.)
6. Click **Create**. A popup shows your **Client ID** and
   **Client secret** - copy both.

## 6. Fill in your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in:

```
GOOGLE_CLIENT_ID=<the Client ID from step 5>
GOOGLE_CLIENT_SECRET=<the Client secret from step 5>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
JWT_SECRET=<a long random string>
SESSION_SECRET=<a different long random string>
PORT=3000
FRONTEND_URL=http://localhost:3000
```

Generate random strings for the two secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run it twice and paste one result into `JWT_SECRET` and the other into
`SESSION_SECRET`.

## 7. Run the app

```bash
npm run dev    # auto-restarts on changes (nodemon)
# or
npm start
```

Open http://localhost:3000, click **Continue with Google**, sign in
with one of the test users you added in step 4, and grant the
requested permissions. The app will automatically:

- Create a new Google Sheet named "MyExcelDB - <your name>" in your
  Google Drive (this becomes your database - each tab is a "table").
- Create a "MyExcelDB Uploads" folder in your Drive for uploaded
  images.

## Notes on scopes and privacy

This app requests the **`drive.file`** scope, not full Drive access.
That means it can only see and manage files/folders it creates itself
(the spreadsheet it makes, and the uploads folder) - it cannot browse,
read, or modify any of your other Drive files.

## Troubleshooting

- **"redirect_uri_mismatch"** - the URI in `.env` must match, character
  for character, one of the "Authorized redirect URIs" in step 5.
- **"Access blocked: this app's request is invalid"** - double-check
  the consent screen scopes (step 4) include Sheets and Drive.
- **"MyExcelDB has not completed the Google verification process"**
  with a "Go to MyExcelDB (unsafe)" link - this is expected while the
  app is in "Testing" mode with only test users added; click through
  it to continue.
