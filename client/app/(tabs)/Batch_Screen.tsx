import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

// 1. Update the interface to include the schedule list
interface BatchSchedule {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface Batch {
  batch_id: string;
  batch_name: string;
  batch_schedule: BatchSchedule[];
}

function normalizeTime(t: string | null | undefined): string {
  if (t == null) return '';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

const BatchRow: React.FC<{ batch: Batch }> = ({ batch }) => {
  return (
  <TouchableOpacity 
        style={styles.row} 
        activeOpacity={0.7}
        onPress={() => {
          console.log("Opening directory for batch:", batch.batch_id);
          // Navigate to your new directory page
          router.push({
            pathname: '/Batch', 
            params: { 
              batch_id: batch.batch_id, 
              batch_name: batch.batch_name 
            }
          });
        }}
      >      
      <View style={styles.batchButton}>
        <Text style={styles.batchButtonText}>{batch.batch_name}</Text>
      </View>

      <Feather name="chevron-right" size={20} color="#666" />

      {/* 2. Map through the dynamic schedule instead of the static DAYS array */}
      <View style={styles.daysGrid}>
        {batch.batch_schedule && batch.batch_schedule.length > 0 ? (
          batch.batch_schedule.map((item, index) => (
            <View key={index} style={styles.dayBox}>
              {/* Slice(0,3) turns "Monday" into "Mon" */}
              <Text style={styles.dayText}>{(item.day_of_week ?? '').slice(0, 3)}</Text>
              <Text style={styles.timeText}>{normalizeTime(item.start_time)}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: '#666', fontSize: 12 }}>No schedule set</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function Batch_Screen() {
  const { branch_id, branch_name } = useLocalSearchParams();
  const branchId = Array.isArray(branch_id) ? branch_id[0] : branch_id;
  const [searchTerm, setSearchTerm] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBatches() {
      if (!branchId) return;
      setLoading(true);
      setLoadError(null);
      try {
        const { data, error } = await supabase
          .from('batches')
          .select(`
            batch_id,
            batch_name,
            batch_schedule (
              day_of_week,
              start_time,
              end_time
            )
          `)
          .eq('branch_id', branchId)
          .or('status.eq.active,status.is.null')
          .order('batch_name');

        if (error) throw error;

        const rows = (data ?? []).map((row: any) => ({
          batch_id: row.batch_id,
          batch_name: row.batch_name,
          batch_schedule: Array.isArray(row.batch_schedule) ? row.batch_schedule : [],
        })) as Batch[];

        if (rows.length > 0) {
          setBatches(rows);
          return;
        }
        setBatches([]);
      } catch (error: unknown) {
        console.error('Error fetching batches:', error);
        const msg =
          error instanceof Error
            ? error.message
            : 'Could not load batches.';
        setLoadError(msg);
        setBatches([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBatches();
  }, [branchId]);

  const filteredBatches = batches.filter(b => 
    b.batch_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.logoGroup}> 
          <Image 
            source={require("../../images/Logo.png")}
            style={styles.logoImage} 
          />
          <View style={styles.logoContainer}>
            <Text style={styles.logoTopText}>
              {branch_name ? branch_name : "SELECT BRANCH"}
            </Text>
          </View>
        </View>

        <View style={styles.searchWrapper}>
          <Feather name="search" size={18} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search batches..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <View style={styles.greenCard}>
        {loading ? (
          <ActivityIndicator size="large" color="white" style={{ marginTop: 50 }} />
        ) : loadError ? (
          <Text style={{ color: 'white', textAlign: 'center', marginTop: 24, paddingHorizontal: 16 }}>
            {loadError}
          </Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredBatches.map((batch) => (
              <BatchRow key={batch.batch_id} batch={batch} />
            ))}
            {filteredBatches.length === 0 && (
               <Text style={{color: 'white', textAlign: 'center', marginTop: 20}}>No batches found.</Text>
            )}
          </ScrollView>
        )}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/Coach_Requests")}>
          <Ionicons name="shield-checkmark-outline" size={20} color="white" />
          <Text style={styles.footerBtnText}>Coach Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-undo-sharp" size={20} color="white" />
          <Text style={styles.footerBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181818', paddingHorizontal: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 30 },
  logoContainer: { borderLeftWidth: 3, borderLeftColor: '#BD1F14', paddingLeft: 10, marginLeft: 10 },
  logoGroup: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { height: 80, width: 60, resizeMode: 'contain' },
  logoTopText: { color: 'white', fontSize: 45, fontWeight: '300', letterSpacing: 2 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 25, paddingHorizontal: 12, width: 250, height: 45 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, color: 'black', fontSize: 16 },
  greenCard: { flex: 1, backgroundColor: '#00703c', borderRadius: 40, padding: 25 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f1f1f', padding: 12, borderRadius: 12, marginBottom: 10, gap: 12, height: 90 },
  batchButton: { backgroundColor: '#8b2323', paddingVertical: 23, paddingHorizontal: 15, borderRadius: 10, minWidth: 150, alignItems: 'center', justifyContent: 'center', marginHorizontal: 15 },
  batchButtonText: { color: 'white', fontSize:15, fontWeight: '600', textAlign: 'center' },
  daysGrid: { flex: 1, flexDirection: 'row', justifyContent: 'flex-start' },
  dayBox: {
    backgroundColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 6,
    marginRight: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  timeText: { color: '#aaa', fontSize: 12 }, 
  footer: {
    flexDirection: 'row',
    paddingVertical: 30,
    gap: 20,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4d1212', 
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