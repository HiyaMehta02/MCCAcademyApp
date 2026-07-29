import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerTitle: "Home", headerShown: false }} />
      <Stack.Screen name="Batch_Screen" options={{ headerTitle: "Batches", headerShown: false }} />
      <Stack.Screen name="Batch" options={{ headerTitle: "Batch", headerShown: false }} />
      <Stack.Screen name="Fees" options={{ headerTitle: "Fees", headerShown: false }} />
      <Stack.Screen name="Import_Data" options={{ headerTitle: "Import Data", headerShown: false }} />
      <Stack.Screen name="Sheet_Sync" options={{ headerTitle: "Google Sheet Sync", headerShown: false }} />
      <Stack.Screen
        name="Coach_Attendance"
        options={{ headerTitle: "Coach Attendance", headerShown: false }}
      />
      <Stack.Screen name="Coach_Requests" options={{ headerTitle: "Coach Requests", headerShown: false }} />
      <Stack.Screen name="Manage_Coaches" options={{ headerTitle: "Manage Coaches", headerShown: false }} />
      <Stack.Screen name="Student_Profile" options={{ headerTitle: "Student Profile", headerShown: false }} />
      <Stack.Screen name="Register_Student" options={{ headerTitle: "Register Student", headerShown: false }} />
      <Stack.Screen
        name="Student_Payment_History"
        options={{ headerTitle: "Payment History", headerShown: false }}
      />
      <Stack.Screen
        name="Student_Attendance_History"
        options={{ headerTitle: "Attendance History", headerShown: false }}
      />
      <Stack.Screen name="Add_Student" options={{ headerTitle: "Add Student", headerShown: false }} />
      <Stack.Screen name="Take_Attendance" options={{ headerTitle: "Take Attendance", headerShown: false }} />
    </Stack>
  );
}
