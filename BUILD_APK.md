# 🤖 Deploying Loop as an APK Using Android Studio

This guide explains how to configure, generate, and build your Loop mobile app into a production Android APK. 

---

## ⚡ 1. Prerequisites & Configurations

### A. Production Backend Configuration
We have updated the mobile app configuration so that it automatically connects to your production Vercel deployment when running in a production build:
* **Production Vercel Host:** `https://loop-hariraj1389-9205s-projects.vercel.app`
* **Development Fallback:** Automatically reverts to the local IP address/localhost on port `3005` when running in React Native development mode (`__DEV__`).

The files updated:
1. `loop/mobile/src/utils/dbService.ts`
2. `loop/mobile/app/ai-studio.tsx`

### B. Android SDK & Environment Setup
Before building locally, ensure your system has:
1. **Android Studio** installed.
2. **Android SDK** configured, with the environment variable `ANDROID_HOME` pointing to your SDK path (e.g., `%LOCALAPPDATA%\Android\Sdk`).
3. **Java Development Kit (JDK)** version 17 or higher installed, and `JAVA_HOME` environment variable configured.

---

## 🛠️ 2. Step 1: Generate the Native Android Project
Since the native `/android` folder is gitignored (to keep the repository clean), you need to generate it locally using Expo CLI before opening it in Android Studio.

Run the following command in your terminal from the `loop/mobile` folder:
```powershell
cd mobile
npx expo prebuild --platform android --clean
```
> **Note:**
> This command reads the configuration in `app.json` and generates a fully-configured native Android project inside `loop/mobile/android` with the correct package name (`com.loop.mobile`), assets, splash screen, and permissions.

---

## 🎨 3. Step 2: Build the APK Using Android Studio

1. **Open Android Studio**.
2. Click **File > Open...** (or select **Open an existing project** on the welcome screen).
3. Navigate to and select the **`loop/mobile/android`** directory.
4. **Wait for Gradle Sync:** Android Studio will automatically download build tools, dependencies, and index the project. This may take a few minutes the first time.
5. **Set Build Variant:**
   * Open the **Build Variants** tool window (usually on the bottom left margin, or via **View > Tool Windows > Build Variants**).
   * For the `:app` module, change the **Active Build Variant** from `debug` to **`release`** (or `preview` to build a local production-ready variant).
6. **Compile the APK:**
   * Go to the top menu and select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   * Android Studio will run the compiler tasks.
7. **Retrieve the Built APK:**
   * Once complete, a notification popup will appear in the bottom-right corner. Click **locate** to open the folder containing your APK.
   * Path: `loop/mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## 🚀 4. Alternative: One-Click Automated Script Build
We also included an automated PowerShell build script in the `mobile` folder. You can use it to build the APK completely from the command line without opening Android Studio.

1. Open PowerShell inside the `loop/mobile` folder.
2. Run:
   ```powershell
   .\build_apk.ps1
   ```
3. Type `3` and press Enter to select **Standard Expo Prebuild & Gradle Build**.
4. The script will clean up old builds, run `expo prebuild`, compile the APK using local Gradle build tools, and output the compiled file as **`loop/mobile/loop-app.apk`**.

---

## 📦 5. Git Status Update
The changes have been successfully committed and pushed to the remote repository on the `main` branch. 
* **Branch:** `main`
* **Status:** Clean & Pushed to `origin/main`
