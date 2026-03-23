import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Feather, Ionicons } from '@expo/vector-icons';

interface Batch {
  id: string;
  name: string;
}

const DAYS = ['Mon', 'Tue', 'Wen', 'Thu', 'Fri', 'Sat', 'Sun'];

const BatchRow: React.FC<{ batch: Batch }> = ({ batch }) => {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.batchButton}>
        <Text style={styles.batchButtonText}>{batch.name}</Text>
      </TouchableOpacity>

      <Feather name="chevron-right" size={20} color="#666" />

      <View style={styles.daysGrid}>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayBox}>
            <Text style={styles.dayText}>{day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function Batch_Screen() {
  const [searchTerm, setSearchTerm] = useState('');
  const batches = Array(6).fill({ id: '1', name: 'Batch ID' });

  return (
    // Add edges to tell it which sides to protect (usually top)
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <View style={styles.logoGroup}> 
        <Image 
          source={require("../../images/Logo.png")}
          style={styles.logoImage} 
        />
        <View style={styles.logoContainer}>
          <Text style={styles.logoTopText}>MUSCAT BRANCH</Text>
        </View>
      </View>

      <View style={styles.greenCard}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {batches.map((batch, index) => (
            <BatchRow key={index} batch={batch} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#181818',
    paddingHorizontal: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginVertical: 30,
  },
  logoContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#BD1F14',
    paddingLeft: 10, 
    marginLeft: 10,  
  },
  logoGroup: {
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  logoImage: {
    height: 100,
    resizeMode: 'contain',
  },
  logoTopText: {
    color: 'white',
    fontSize: 40,
    fontWeight: '300',
    letterSpacing: 2,
    paddingLeft: 6, 
  },
  logoBottomText: { color: 'white', fontSize: 22, fontWeight: '300', letterSpacing: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 12,
    width: 220,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, color: 'black', fontSize: 14 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plusIconBorder: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 2 },
  addBtnText: { color: '#ccc', fontSize: 14 },
  greenCard: {
    flex: 1,
    backgroundColor: '#00703c',
    borderRadius: 40,
    padding: 25,
    marginBottom: 50,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    height: 80, 
  },
  batchButton: {
    backgroundColor: '#8b2323',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    minWidth: 130,
    alignItems: 'center',
    height: '75%', 
  },
  batchButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  daysGrid: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dayBox: {
    backgroundColor: '#444',
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  dayText: { color: '#ccc', fontSize: 10 },
});