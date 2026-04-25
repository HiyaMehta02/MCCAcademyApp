import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ActivityIndicator, Alert, TextInput, 
  TouchableOpacity, FlatList, Image, Dimensions, Animated, PanResponder, Button 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const COLUMN_COUNT = 4;
const CARD_MARGIN = 8;
const GRID_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - (CARD_MARGIN * COLUMN_COUNT * 2)) / COLUMN_COUNT;

const apiIp = process.env.EXPO_PUBLIC_IP_ADDRESS;
const SERVER_URL = `http://${apiIp}:8000`;

interface Student {
  student_id: string; 
  students: {
    first_name: string;
    last_name: string;
    status: string; 
  };
}

export default function AddStudent() {
  const { batch_id, batch_name } = useLocalSearchParams();
  const router = useRouter();
  
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Track which student we are currently "Initializing"
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const START_HEIGHT = SCREEN_HEIGHT * 0.75; 
  const OPEN_HEIGHT = SCREEN_HEIGHT * 0.20; 

  const translateY = useRef(new Animated.Value(START_HEIGHT)).current;
  const lastScrollY = useRef(START_HEIGHT);

  useEffect(() => {
    async function fetchStudents() {
      if (!batch_id) return;
      try {
        setFetching(true);
        const response = await fetch(`${SERVER_URL}/students/${batch_id}`);
        const data = await response.json();
        setStudents(data.students || []);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setFetching(false);
      }
    }
    fetchStudents();
  }, [batch_id]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (e, gestureState) => {
        const newValue = lastScrollY.current + gestureState.dy;
        if (newValue > OPEN_HEIGHT && newValue < SCREEN_HEIGHT * 0.95) {
          translateY.setValue(newValue);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy < -50) { 
          Animated.spring(translateY, { toValue: OPEN_HEIGHT, useNativeDriver: true }).start();
          lastScrollY.current = OPEN_HEIGHT;
        } else { 
          Animated.spring(translateY, { toValue: START_HEIGHT, useNativeDriver: true }).start();
          lastScrollY.current = START_HEIGHT;
        }
      },
    })
  ).current;

  // INITIALIZATION LOGIC (Calls /enroll)
    const handleEnrollment = async () => {
    if (!selectedStudent) {
        Alert.alert("No Student Selected", "Please select a student from the list.");
        return;
    }
    if (!cameraRef.current) return;

    try {
        setIsLoading(true);
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        
        const formData = new FormData();
        // We ONLY need to send the student_id now
        formData.append('student_id', selectedStudent.student_id); 
        formData.append('file', {
        uri: photo.uri,
        name: 'initialization.jpg',
        type: 'image/jpeg',
        } as any);

        const response = await fetch(`${SERVER_URL}/enroll`, {
        method: 'POST',
        body: formData,
        });

        const result = await response.json();
        if (response.ok) {
        Alert.alert("Success", "Face initialized!");
        router.back();
        } else {
        Alert.alert("Error", result.error || "Failed.");
        }
    } catch (error) {
        Alert.alert("Error", "Network issue.");
    } finally {
        setIsLoading(false);
    }
    };

  const filteredStudents = students.filter(s => 
    `${s.students?.first_name} ${s.students?.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera access needed</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="front" ref={cameraRef} />

      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-undo-sharp" size={18} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        
        {selectedStudent && (
          <View style={styles.activeLabel}>
            <Text style={styles.activeText}>Initializing: {selectedStudent.students.first_name}</Text>
          </View>
        )}

        <View style={styles.cameraTriggerContainer}>
            <TouchableOpacity 
              style={[styles.captureCircle, isLoading && { opacity: 0.5 }]} 
              onPress={handleEnrollment}
              disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator color="black" /> : <View style={styles.captureInner} />}
            </TouchableOpacity>
        </View>
      </View>

      <Animated.View 
        style={[styles.bottomSheet, { transform: [{ translateY: translateY }] }]}
      >
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.handle} />
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#666" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search Students to Initialize...`}
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {fetching ? (
          <ActivityIndicator size="large" color="#116C1B" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={filteredStudents}
            numColumns={COLUMN_COUNT}
            keyExtractor={(item) => item.student_id}
            renderItem={({ item }) => {
              const isSelected = selectedStudent?.student_id === item.student_id;
              return (
                <TouchableOpacity 
                  style={[styles.card, isSelected && styles.selectedCard]} 
                  onPress={() => setSelectedStudent(item)}
                >
                  <Image 
                    source={require("../../images/student_image.jpg")} 
                    style={styles.studentImage}
                  />
                  <View style={[styles.nameLabel, isSelected && { backgroundColor: '#4CAF50' }]}>
                    <Text style={[styles.nameText, isSelected && { color: 'white' }]} numberOfLines={1}>
                      {item.students?.first_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  topHeader: { position: 'absolute', top: 50, left: 40, right: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4d1212', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 10 },
  backBtnText: { color: 'white', fontSize: 16 },
  activeLabel: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#4CAF50' },
  activeText: { color: '#4CAF50', fontWeight: 'bold' },
  cameraTriggerContainer: { width: 65, height: 65, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  captureCircle: { width: 55, height: 55, borderRadius: 30, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#ccc' },
  bottomSheet: { position: 'absolute', width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#1c1c1c', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: GRID_PADDING },
  dragArea: { alignItems: 'center', paddingVertical: 15 },
  handle: { width: 40, height: 5, backgroundColor: '#444', borderRadius: 3, marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 15, width: '90%', height: 40 },
  searchInput: { flex: 1, color: 'black', fontSize: 14 },
  listContent: { paddingBottom: 250 },
  card: { width: CARD_WIDTH, height: CARD_WIDTH * 1.3, margin: CARD_MARGIN, backgroundColor: '#333', borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  selectedCard: { borderColor: '#4CAF50' },
  studentImage: { flex: 1, width: '100%', height: '100%', resizeMode: 'cover' },
  nameLabel: { backgroundColor: '#e0e0e0', paddingVertical: 6, alignItems: 'center' },
  nameText: { color: '#1c1c1c', fontSize: 11, fontWeight: 'bold' },
  permissionText: { color: 'white', textAlign: 'center', marginTop: 100 }
});