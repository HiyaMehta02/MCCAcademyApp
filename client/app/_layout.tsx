import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)"         
        options={{ headerTitle: "Home", headerShown: false }}
     />
    </Stack>
  );
}