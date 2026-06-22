import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="index"         
        options={{ headerTitle: "Home", headerShown: false }}
     />
      <Stack.Screen name="Coach_Requests" options={{ headerTitle: "Coach Requests", headerShown: false }} />
      <Stack.Screen name="Manage_Coaches" options={{ headerTitle: "Manage Coaches", headerShown: false }} />
    </Stack>
  );
}
