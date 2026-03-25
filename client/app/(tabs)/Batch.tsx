import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Dummy data to match the 10 cards in your image
const STUDENTS = Array(10).fill({ id: '1', name: 'name' });

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 5;
const CARD_WIDTH = (width - 160) / COLUMN_COUNT; // Adjusting for screen padding

const StudentCard = ({ name }: { name: string }) => (
  <View style={styles.card}>
    <Image 
      source={require("../../images/student_image.jpg")} // Replace with your actual student image path
      style={styles.studentImage}
    />
    <View style={styles.nameLabel}>
      <Text style={styles.nameText}>{name}</Text>
    </View>
  </View>
);

export default function StudentDirectory() {
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* --- HEADER SECTION --- */}
      <View style={styles.header}>
        <View style={styles.logoSection}>
          <Image source={require("../../images/Logo.png")} style={styles.logo} />
          <View style={styles.branchDivider} />
          <View>
            <Text style={styles.branchText}>AZAIBA</Text>
            <Text style={styles.branchText}>BRANCH</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter Student Name"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerButtons}>
            <TouchableOpacity 
            style={styles.attendanceBtn}
            onPress={() => {
                // console.log("Starting attendance for batch:", batch_id);
                router.push({
                pathname: '/Take_Attendance',
                // params: { 
                //     batch_id: batch_id, 
                //     batch_name: batch_name 
                // }
                });
            }}
            >
            <Text style={styles.attendanceBtnText}>Take attendance</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.initBtn}>
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.initBtnText}>Initialization Student</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- STUDENT GRID --- */}
      <View style={styles.gridWrapper}>
        <FlatList
          data={STUDENTS}
          numColumns={COLUMN_COUNT}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => <StudentCard name={item.name} />}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* --- FOOTER BUTTONS --- */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-undo-sharp" size={20} color="white" />
          <Text style={styles.footerBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1c', // Match the dark grey background
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 50,
    resizeMode: 'contain',
  },
  branchDivider: {
    width: 2,
    height: 40,
    backgroundColor: '#BD1F14',
    marginHorizontal: 12,
  },
  branchText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '300',
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    width: '35%',
    height: 40,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: 'black',
    fontSize: 14,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  attendanceBtn: {
    backgroundColor: '#116C1B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  attendanceBtnText: {
    color: 'white',
    fontWeight: '500',
  },
  initBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  initBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
  },
  gridWrapper: {
    flex: 1,
    marginTop: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
    margin: 10,
    backgroundColor: '#333',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
  },
  studentImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  nameLabel: {
    backgroundColor: '#8B2323',
    paddingVertical: 8,
    alignItems: 'center',
  },
  nameText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: 30,
    gap: 20,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4d1212', // Slightly darker red for footer
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  footerBtnText: {
    color: 'white',
    fontSize: 16,
  },
});