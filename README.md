# AskDb - Comprehensive Installation, Setup & Deployment Guide

Welcome to the setup guide for **AskDb**, an enterprise-grade AI-powered database assistant. 

Note:These project is made as part of AI Hackathon and there are no intensions in copying the content and distributing it outside the cgi.com domain.

---

## 📋 Prerequisites

Before installing the application, ensure the following software is installed on the target machine:

1. **Node.js (v18.19.0 or higher / v20 LTS recommended)**
   * Angular 20 requires Node.js v18.19+ or v20+.
   * Download and install from [nodejs.org](https://nodejs.org/).
   * Verify your installation:
     ```bash
     node -v
     npm -v
     ```
2. **Git** (for cloning the repository)
   * Download and install from [git-scm.com](https://git-scm.com/).
3. **IDE / Code Editor**
   * [Visual Studio Code (VS Code)](https://code.visualstudio.com/) is highly recommended.
   * Recommended Extensions: *Angular Language Service* and *Tailwind CSS IntelliSense*.

---

## 🚀 Step-by-Step Local Setup

Follow these commands in your terminal (PowerShell, Command Prompt, or terminal of choice) to spin up the application:

### Step 1: Clone the Repository(optional)
Clone the codebase to your local directory:
```bash
git clone <repository-url>
cd AskDb
```

### Step 2: Install Project Dependencies
Run `npm install` to download and install all required framework packages (including Angular Core, Router, Lucide Icons, and Tailwind CSS v4):
```bash
npm install
```
> [!NOTE]
> This command will construct a local `node_modules` folder and install package definitions specified in [package.json](file:///d:/ASK/AskDb/package.json).

### Step 3: Run the Development Server
Launch the compiler and server by running:
```bash
npm start
```
Alternatively, if you have the Angular CLI installed globally, you can run:
```bash
ng serve
```

### Step 4: Access the Application
Once compilation completes successfully, open your browser and navigate to:
```url
http://localhost:4200/
```
The application supports **Hot Module Replacement (HMR)**, meaning any changes you save to component files will trigger an automatic, fast browser reload.

---

## ⚙️ Backend Connectivity & Configuration

AskDb is built with a dual-mode service architecture. It compiles and tests against a real REST API backend, but automatically falls back to simulated mock workflows if no backend server is running.

You can explicitly control this behavior in the configuration file [api.config.ts](file:///d:/ASK/AskDb/src/app/config/api.config.ts):

```typescript
export const API_CONFIG = {
  useMock: false, // Set to 'true' to force client-side mock simulation; 'false' connects to real REST endpoints.
  apiUrl: 'http://localhost:3000/api' // URL where the backend REST API is hosted.
};
```

### Mock Users Lookup (For Local Testing)
When the application runs in mock mode, you can log in using these mock corporate credentials:

| Role | Email Address | Password | Environment Workspace Access |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@cgi.com` | `admin` *(or any)* | Access to the complete Admin Portal |
| **John Doe** (User) | `john.doe@cgi.com` | *(any)* | `Sales Analytics` & `Customer Feedback` |
| **Jane Smith** (User) | `jane.smith@cgi.com` | *(any)* | `Marketing Campaign` |
| **Alex Johnson** (User) | `alex.johnson@cgi.com` | *(any)* | `Billing Sandbox` & `Customer Feedback` |

---

## 🧪 Running Tests & Compiling Builds

To ensure code quality and build compilation correctness before pushing changes:

### Execute Unit Tests
To run unit tests using the [Karma](https://karma-runner.github.io) test runner:
```bash
npm test
```

### Generate Production Build Assets
To compile and optimize the application bundle for production:
```bash
npm run build
```
This compiles the Typescript files, processes the Tailwind CSS utility engine, and deposits minified static assets in the local `dist/` directory, ready to be hosted on web servers like Nginx, Apache, or AWS S3.

---

## 🛠️ Troubleshooting Common Issues

* **Port Conflict (`4200` is already in use)**:
  Run the server on a different port:
  ```bash
  npm start -- --port 4201
  ```
* **Node Version Mismatches**:
  If you encounter compilation errors relating to Node features, verify you are running a version >= `18.19.0`. Use `nvm` (Node Version Manager) if you need to switch between node instances.
* **Missing Tailwind styles**:
  Ensure that you run `npm install` to load `@tailwindcss/postcss` and dependencies, and check that the styling engine is processing files correctly.
