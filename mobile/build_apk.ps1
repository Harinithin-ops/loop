# Windows PowerShell APK Build Automation Script
Clear-Host

Write-Host "========================================================================" -ForegroundColor Blue
Write-Host "                   🔄 LOOP MOBILE APK BUILD AUTOMATION 🔄               " -ForegroundColor Blue
Write-Host "========================================================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Choose your preferred build method:"
Write-Host "  [1] EAS Cloud Build (EAS CLI) - *RECOMMENDED*" -ForegroundColor Green
Write-Host "      (Compiles online in the Expo cloud. No Android Studio/SDK required locally.)"
Write-Host ""
Write-Host "  [2] EAS Local Build (EAS CLI)" -ForegroundColor Yellow
Write-Host "      (Uses EAS CLI to compile locally on your system using local Android tools.)"
Write-Host ""
Write-Host "  [3] Standard Expo Prebuild & Gradle Build" -ForegroundColor Yellow
Write-Host "      (Runs 'npx expo prebuild' and compiles using local Gradle assembleRelease.)"
Write-Host ""

$choice = Read-Host "Select build method [1, 2, or 3]"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "------------------------------------------------------------------------" -ForegroundColor Blue
    Write-Host "🚀 Option 1: EAS Cloud Build Selected" -ForegroundColor Green
    Write-Host "------------------------------------------------------------------------" -ForegroundColor Blue
    
    # Check if EAS CLI is installed
    if (!(Get-Command eas -ErrorAction SilentlyContinue)) {
        Write-Host "Eas CLI is not installed. Installing globally..." -ForegroundColor Yellow
        npm install -g eas-cli
    }
    
    Write-Host "Logging into Expo account..." -ForegroundColor Blue
    eas login
    
    Write-Host "Starting EAS Cloud Build for APK format..." -ForegroundColor Green
    eas build --platform android --profile preview
}
elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "------------------------------------------------------------------------" -ForegroundColor Blue
    Write-Host "🚀 Option 2: EAS Local Build Selected" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------------------" -ForegroundColor Blue
    
    if (!(Get-Command eas -ErrorAction SilentlyContinue)) {
        Write-Host "Eas CLI is not installed. Installing globally..." -ForegroundColor Yellow
        npm install -g eas-cli
    }
    
    Write-Host "Starting EAS Local Build for APK format..." -ForegroundColor Green
    eas build --platform android --profile preview --local
}
elseif ($choice -eq "3") {
    Write-Host ""
    Write-Host "------------------------------------------------------------------------" -ForegroundColor Blue
    Write-Host "🚀 Option 3: Local Expo Prebuild & Gradle compilation" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------------------" -ForegroundColor Blue
    
    # Clean previous build folders
    Write-Host "[1/5] Cleaning previous build folders..." -ForegroundColor Blue
    if (Test-Path android) { Remove-Item -Recurse -Force android }
    if (Test-Path build) { Remove-Item -Recurse -Force build }
    
    # Run prebuild
    Write-Host "[2/5] Running 'npx expo prebuild' to generate Android project..." -ForegroundColor Blue
    npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Expo prebuild failed." -ForegroundColor Red
        exit
    }
    
    # Compile APK using Gradle
    Write-Host "[3/5] Compiling APK using Gradle assembleRelease..." -ForegroundColor Blue
    Set-Location android
    
    if (Test-Path .\gradlew.bat) {
        .\gradlew.bat assembleRelease
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Gradle build failed. Check your Android SDK & JDK configuration." -ForegroundColor Red
            Set-Location ..
            exit
        }
    } else {
        Write-Host "Error: gradlew.bat executable not found." -ForegroundColor Red
        Set-Location ..
        exit
    }
    
    Set-Location ..
    
    # Retrieve APK
    Write-Host "[4/5] Retrieving compiled APK..." -ForegroundColor Blue
    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        Copy-Item $apkPath .\loop-app.apk
        Write-Host "[5/5] Success! APK created at: $(Get-Location)\loop-app.apk" -ForegroundColor Green
    } else {
        Write-Host "Error: Could not locate built APK at $apkPath" -ForegroundColor Red
    }
}
else {
    Write-Host "Invalid selection. Exiting build process." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "                     🎉 APK BUILD COMPLETED! 🎉                         " -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
