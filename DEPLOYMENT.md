# Deployment Guide

Follow these steps to deploy **Frenmio** to the web.

## Phase 1: Push to GitHub (Prerequisite)

You cannot deploy without your code being on GitHub.

1.  **Create a New Repository** on [GitHub](https://github.com/new). Name it `frenmio`.
2.  **Link and Push** your local code:
    Open your terminal in the project folder and run:
    ```bash
    # Replace <YOUR_REPO_URL> with the actual URL (e.g., https://github.com/swapnilnegi/frenmio.git)
    git remote add origin <YOUR_REPO_URL>
    git push -u origin main
    ```

## Phase 2: Deploy Backend (Render)

We use **Render** because it allows the server to stay running (essential for Socket.io).

1.  **Sign Up/Login** at [render.com](https://render.com).
2.  Click **"New +"** -> **"Blueprints"**.
3.  Connect your GitHub account and select the `frenmio` repository.
4.  Render will detect the `render.yaml` file I just created.
5.  Click **"Apply Blueprint"**.
    *   It will verify the inputs.
    *   For `ALLOW_ORIGIN`, just leave it as is or type `*` for now (we will secure it later).
6.  Click **"Create Service"**.
7.  Wait for the deploy to finish.
8.  **Copy the Backend URL** (e.g., `https://frenmio-server.onrender.com`). *You will need this!*

## Phase 3: Deploy Frontend (Vercel)

1.  **Sign Up/Login** at [vercel.com](https://vercel.com).
2.  Click **"Add New..."** -> **"Project"**.
3.  Import the `frenmio` repository.
4.  In the **Configure Project** screen:
    *   **Framework Preset**: React / Create React App (should be auto-detected).
    *   **Root Directory**: `Frontend`.
    *   **Environment Variables**:
        *   **Name**: `REACT_APP_SOCKET_URL`
        *   **Value**: Paste your **Backend URL** from Phase 2 (e.g., `https://frenmio-server.onrender.com`).
        *   *Important*: Remove any trailing slash `/` from the URL.
5.  Click **"Deploy"**.
6.  Wait for it to complete. You now have a live website URL (e.g., `https://frenmio.vercel.app`).

## Phase 4: Connect Them

Now that the frontend is live, we need to tell the Backend to allow connections from it.

1.  Go back to your **Render Dashboard**.
2.  Select your `frenmio-server` service.
3.  Go to **"Environment"** tab.
4.  Edit the `ALLOW_ORIGIN` variable.
5.  Set the Value to your **Vercel Frontend URL** (e.g., `https://frenmio.vercel.app`).
    *   *Note*: The value expects a JSON string or just the string. The code handles JSON parsing. Ideally set it to: `["https://frenmio.vercel.app"]` including quotes and brackets.
6.  **Save Changes**. Render will automatically restart the server.

## Done!

Visit your Vercel URL. You can now create rooms and share the link with anyone in the world!
