# TaskFlow ⚡

A premium, highly-responsive personal productivity application built to help you track tasks, manage upcoming milestones, schedule events, and organize essential documents. Designed originally to track a Master's degree application workflow, it's easily customizable for any high-level tracking system.

![TaskFlow Status](https://img.shields.io/badge/Status-Active-brightgreen) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)

## Features

- **Secure Authentication:** Mandatory Google Sign-In via Firebase Auth. Your data is isolated and safely locked to your user account.
- **Dynamic Dashboard:** A rich visual overview featuring upcoming milestones, overdue task warnings, deadlines over the next 7 days, and interactive countdown widgets.
- **Robust Task Management:** Create, edit, and organize tasks across custom categories. Easily mark tasks as complete, moving them smoothly out of the way. Persistent sorting and filtering.
- **Interactive Calendar:** Seamlessly toggle between Month and Week views. Click on any date to quick-add tasks.
- **Document Hub (Google Drive Integration):** Track and manage application documents. Seamlessly link Google Drive URLs, view file status (Missing, In Progress, Uploaded), and monitor your overall documentation readiness via an automated progress ring.

## Quick Start & Setup

The application is built purely on Vanilla JavaScript, HTML5, and CSS3. There are no heavy build tools like Webpack or Vite to deal with—you can run it straight in your browser! However, you must connect it to a Firebase backend.

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd task-manager
```

### 2. Configure Firebase Backend

1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. In the console, go to **Project Settings → General → Your Apps** and register a Web App `</>`.
3. Open `js/firebase-config.js` and paste your Firebase configuration object over the existing template:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

### 3. Enable Firebase Services
1. **Authentication:** Go to **Build → Authentication**, click **Get Started**, and enable the **Google** sign-in provider.
2. **Firestore Database:** Go to **Build → Firestore Database** and click **Create Database**.

### 4. Deploy Security Rules
In the Firebase Console, go to your Firestore Database rules, and replace the default rules with the `firestore.rules` file found in this repository. 

*Note: The rules ensure that users can only read and write data associated with their own `userId`.*

### 5. Run Locally
Because there is no build step, you can simply open `index.html` in your favorite browser, or use a local live server extension:
```bash
npx serve .
```

## Deployment

Since the app relies entirely on client-side technology, it can be deployed for free on any static host such as **GitHub Pages**, **Vercel**, **Netlify**, or **Firebase Hosting**.

### Deploying to GitHub Pages
1. Push the code to a GitHub repository.
2. Go to your repository's **Settings → Pages**.
3. Set the source to **"Deploy from a branch"**.
4. Select your **main** branch and save.
5. Your app will automatically deploy! (Make sure to add your new domain to the authorized domains in Firebase Authentication settings).

## Project Architecture

```
├── index.html              # Core application shell & UI views
├── firestore.rules         # Security rules for the database
├── css/
│   ├── base.css            # Base resets and animations
│   ├── variables.css       # Design tokens (Colors, Typography)
│   ├── layout.css          # Responsive grids & navigation
│   └── components.css      # Reusable UI widgets
├── js/
│   ├── app.js              # Routing & Application Initialization
│   ├── auth.js             # Google Sign-In & Auth State management
│   ├── db.js               # Firestore CRUD wrapper
│   ├── dashboard.js        # Dashboard widgets logic
│   ├── tasks.js            # Task filtering & creation
│   ├── calendar.js         # Calendar rendering & navigation
│   ├── documents.js        # Document tracker (G-Drive integration)
│   └── utils.js            # General helper functions
```

## Customization

### Changing the Countdown Goal
If you are tracking a different milestone, edit `js/dashboard.js` and update the `INTAKE_DATE` constant.

### Styling and Themes
The app is entirely tokenized via CSS variables. You can easily tweak the color scheme (backgrounds, accents, text) by editing `css/variables.css`.

## License

MIT - Feel free to fork, modify, and utilize this project for your own personal management needs!
