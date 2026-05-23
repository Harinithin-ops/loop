#!/bin/bash

# Gorgeous Terminal Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0;0m' # No Color

# Clear terminal screen
clear

echo -e "${BLUE}========================================================================${NC}"
echo -e "${BLUE}                   🔄 LOOP MOBILE APK BUILD AUTOMATION 🔄               ${NC}"
echo -e "${BLUE}========================================================================${NC}"
echo ""

echo -e "Choose your preferred build method:"
echo -e "  [1] ${GREEN}EAS Cloud Build (EAS CLI)${NC} - *RECOMMENDED*"
echo -e "      (Compiles online in the Expo cloud. No Android Studio/SDK required locally.)"
echo ""
echo -e "  [2] ${YELLOW}EAS Local Build (EAS CLI)${NC}"
echo -e "      (Uses EAS CLI to compile locally on your system using local Android tools.)"
echo ""
echo -e "  [3] ${YELLOW}Standard Expo Prebuild & Gradle Build${NC}"
echo -e "      (Runs 'npx expo prebuild' and compiles using local Gradle assembleRelease.)"
echo ""
read -p "Select build method [1, 2, or 3]: " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}------------------------------------------------------------------------${NC}"
        echo -e "${GREEN}🚀 Option 1: EAS Cloud Build Selected${NC}"
        echo -e "${BLUE}------------------------------------------------------------------------${NC}"
        
        # Check if eas-cli is installed
        if ! command -v eas &> /dev/null; then
            echo -e "${YELLOW}Eas CLI is not installed. Installing globally...${NC}"
            npm install -g eas-cli
        fi

        echo -e "${BLUE}Logging into Expo account (if not already logged in)...${NC}"
        eas login

        echo -e "${GREEN}Starting EAS Cloud Build for APK format...${NC}"
        eas build --platform android --profile preview
        ;;

    2)
        echo ""
        echo -e "${BLUE}------------------------------------------------------------------------${NC}"
        echo -e "${YELLOW}🚀 Option 2: EAS Local Build Selected${NC}"
        echo -e "${BLUE}------------------------------------------------------------------------${NC}"

        if ! command -v eas &> /dev/null; then
            echo -e "${YELLOW}Eas CLI is not installed. Installing globally...${NC}"
            npm install -g eas-cli
        fi

        echo -e "${GREEN}Starting EAS Local Build for APK format...${NC}"
        eas build --platform android --profile preview --local
        ;;

    3)
        echo ""
        echo -e "${BLUE}------------------------------------------------------------------------${NC}"
        echo -e "${YELLOW}🚀 Option 3: Local Expo Prebuild & Gradle compilation${NC}"
        echo -e "${BLUE}------------------------------------------------------------------------${NC}"

        # 1. Clean previous build artifacts
        echo -e "${BLUE}[1/5] Cleaning previous build folders...${NC}"
        rm -rf android
        rm -rf build

        # 2. Run prebuild
        echo -e "${BLUE}[2/5] Running 'npx expo prebuild' to generate Android project...${NC}"
        npx expo prebuild --platform android --no-install
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error: Expo prebuild failed. Please check dependencies.${NC}"
            exit 1
        fi

        # 3. Enter Android folder and compile
        echo -e "${BLUE}[3/5] Compiling APK using Gradle assembleRelease...${NC}"
        cd android
        
        if [ -f "./gradlew" ]; then
            chmod +x gradlew
            ./gradlew assembleRelease
            if [ $? -ne 0 ]; then
                echo -e "${RED}Error: Gradle build failed. Ensure Android SDK & JDK are properly configured.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}Error: gradlew executable not found inside android directory.${NC}"
            exit 1
        fi

        # 4. Copying built APK to root directory
        echo -e "${BLUE}[4/5] Retrieving compiled APK...${NC}"
        cd ..
        APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
        if [ -f "$APK_PATH" ]; then
            cp "$APK_PATH" ./loop-app.apk
            echo -e "${GREEN}[5/5] Success! APK created at: $(pwd)/loop-app.apk${NC}"
        else
            echo -e "${RED}Error: Could not locate built APK at $APK_PATH${NC}"
            exit 1
        fi
        ;;

    *)
        echo -e "${RED}Invalid selection. Exiting build process.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}========================================================================${NC}"
echo -e "${GREEN}                     🎉 APK BUILD COMPLETED! 🎉                         ${NC}"
echo -e "${GREEN}========================================================================${NC}"
