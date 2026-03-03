# Maker App - Project Index

This project is a React Native / Expo application designed to render dynamic "Mini Apps" generated via AI. It uses a custom rendering engine to map dynamic data to React Native components.

## 📁 Directory Structure

```text
/
├── app/                # Main navigation using Expo Router (auth, tabs, index)
├── assets/             # Static assets (images, fonts, animations)
├── src/                # Core application source code
│   ├── components/ui/  # Centralized library of atomic UI components
│   ├── hooks/          # Custom React hooks
│   ├── renderer/       # Custom Mini App rendering engine
│   ├── services/       # Integration logic (Supabase, AI, mini-apps)
│   ├── stores/         # State management using Zustand
│   ├── theme/          # Design tokens (colors, spacing, typography)
│   └── types/          # Shared TypeScript type definitions
├── supabase/           # Backend-as-a-Service and AI processing
│   └── functions/      # Edge functions (ai-generate, render-engine)
└── package.json        # Dependencies and scripts
```

## 🏗️ Key Architectural Pillars

### 1. Navigation (`app/`)
*   Uses `expo-router` for file-based routing.
*   Flows: `(auth)` for login/signup, `onboarding`, and `(main)` for the core app features.
*   Tabs (`(main)/(tabs)`): `home`, `create`, `settings`.

### 2. Rendering Engine (`src/renderer/`)
*   `MiniAppRenderer.tsx`: The primary entry point for rendering dynamic mini-apps.
*   `ComponentRegistry.ts`: Maps JSON component types to React Native components.
*   `RenderNode.tsx`: Recursively renders nodes in the mini-app's UI tree.

### 3. State Management (`src/stores/`)
*   Uses **Zustand** for lightweight, reactive global state.
*   `authStore.ts`: Handles authentication state.
*   `miniAppStore.ts`: Manages the state and loading of mini-apps.
*   `chatStore.ts`: Manages AI conversation context.

### 4. Backend & AI (`supabase/` & `src/services/`)
*   **Supabase** handles authentication, database, and edge functions.
*   `aiService.ts`: Communicates with AI edge functions for generation/refinement.
*   `renderEngine.ts`: Logic for interfacing with the remote rendering engine.

### 5. UI Layer (`src/components/ui/`)
*   A set of modular, atomic UI components like `Button`, `Input`, `Card`, and `Typography`.
*   These components are used both by the host Maker App and the dynamic renderer.

## 🚀 Development

### Scripts
*   `npm start`: Start the Expo server.
*   `npm run ios`: Start on iOS emulator.
*   `npm run android`: Start on Android emulator.
*   `npm run web`: Start on web browser.

### Key Technologies
*   **Framework:** Expo / React Native
*   **Language:** TypeScript
*   **State:** Zustand
*   **Styling:** Native styles (theme-driven)
*   **Backend:** Supabase
*   **AI:** Edge functions for generation
