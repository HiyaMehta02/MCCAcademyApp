import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const apiIp = process.env.EXPO_PUBLIC_IP_ADDRESS; 
const SERVER_URL = `http://${apiIp}:8000`;

interface AttendanceResponse {
  message?: string;
  error?: string;
}

export default function AttendanceScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>('');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={styles.container} />; 
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const enrollStudent = async (): Promise<void> => {
    if (!studentName.trim()) {
      Alert.alert("Missing Name", "Please enter a student name.");
      return;
    }
    if (!cameraRef.current) return;
    
    try {
      setIsLoading(true);
      
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (!photo) throw new Error("Failed to capture photo.");

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri, 
        name: 'enroll_scan.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${SERVER_URL}/enroll?name=${encodeURIComponent(studentName)}`, {
        method: 'POST',
        body: formData,
      });

      const result: AttendanceResponse = await response.json();
      console.log("PYTHON SERVER SAID:", result);

      if (response.ok && !result.error) {
        Alert.alert("Success!", result.message || "Student enrolled.");
        setStudentName(''); 
      } else {
        Alert.alert("Server Error", result.error || "Could not save face.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Could not connect to the Python server.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkAttendance = async (): Promise<void> => {
    if (!cameraRef.current) return;
    
    try {
      setIsLoading(true);
      
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (!photo) throw new Error("Failed to capture photo.");

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri, 
        name: 'attendance_scan.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${SERVER_URL}/check-attendance`, {
        method: 'POST',
        body: formData,
      });

      const result: AttendanceResponse = await response.json();
      console.log("PYTHON SERVER SAID:", result);

      if (response.ok && !result.error) {
        Alert.alert("Match Found!", result.message || "Attendance logged.");
      } else {
        Alert.alert("No Match", result.error || "Could not recognize face");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Could not connect to the Python server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="front" ref={cameraRef} />
        
      <KeyboardAvoidingView 
        style={styles.floatingOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#ffffff" style={{ marginBottom: 20 }} />
        ) : (
          <View style={styles.controlsContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter new student name..."
              placeholderTextColor="#ccc"
              value={studentName}
              onChangeText={setStudentName}
            />
            <View style={styles.buttonRow}>
              <View style={styles.buttonWrapper}>
                <Button title="➕ ADD STUDENT" onPress={enrollStudent} color="#4CAF50" />
              </View>
              <View style={styles.buttonWrapper}>
                <Button title="✅ SCAN ATTENDANCE" onPress={checkAttendance} color="#2196F3" />
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  floatingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  controlsContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    paddingBottom: 40, 
    width: '100%',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  permissionText: {
    textAlign: 'center', 
    marginBottom: 20,
    color: 'white'
  }
});