import { useEffect } from "react";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { supabase } from "../src/services/supabase";
import { useAuthStore } from "../src/stores/authStore";
import { getProfile } from "../src/services/auth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { initialize, signOut: authSignOut, setLoading } = useAuthStore();

  // Listen for Supabase auth state changes and populate the auth store
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const supaUser = session.user;
          const user = {
            id: supaUser.id,
            email: supaUser.email ?? '',
            displayName: supaUser.user_metadata?.display_name ?? null,
            avatarUrl: supaUser.user_metadata?.avatar_url ?? null,
          };

          // Fetch the full profile row
          const profileResult = await getProfile(supaUser.id);
          const profile = profileResult.data ?? {
            id: supaUser.id,
            email: supaUser.email ?? '',
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            subscriptionTier: 'free' as const,
            tokensUsedThisMonth: 0,
            tokenResetDate: new Date().toISOString(),
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          initialize(session, user, profile);
        } else {
          authSignOut();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, authSignOut, setLoading]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
