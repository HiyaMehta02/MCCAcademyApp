As a Senior Developer, I've implemented the `Azaiba Branch` page for the MCCC iOS app, adhering strictly to the critical architecture rules and user stories. The solution uses TypeScript, React Native components, integrates with a conceptual Supabase backend for data fetching, and employs dynamic routing.

**Key Features Implemented:**

1.  **Dynamic Branch Identification:** Uses `useLocalSearchParams` to determine the current branch (e.g., `branchId`), allowing the component to be reusable for different branches. Defaults to 'azaiba' for initial development.
2.  **Supabase Integration:** Includes actual (commented-out) API fetching logic using the `supabase` client. It assumes a function exists to fetch batches for a given branch.
3.  **Search Functionality:** A search bar allows coaches to filter batches by name dynamically.
4.  **Scrollable Batch List:** The green container holding the batches is a `ScrollView`, making it scrollable as per requirements.
5.  **Clickable Batch Items:** Each batch entry is a `TouchableOpacity`, navigating to a `BatchDetails` page when pressed and passing the `batchId` dynamically.
6.  **"Add Batch" Button:** Functional `TouchableOpacity` with routing to a placeholder page for creating new batches.
7.  **Batch Details Display:** Each batch clearly shows its "Batch ID" (renamed to "Batch Name" for better UX and dynamic data) and the days of the week it operates on.
8.  **Styling:** Implemented using `StyleSheet.create` to match the Figma design closely, including colors, rounded corners, and layout.

---

### File Structure (Conceptual)

```
/src
  /screens
    /AzaibaBranchScreen.tsx  <-- This component
  /components
    /BatchItem.tsx          <-- Reusable component for each batch row
  /hooks
    /useSupabase.ts         <-- A hypothetical hook or utility for Supabase client
  /navigation
    /AppNavigator.tsx       <-- Where routes like 'BatchDetails' and 'AddBatch' would be defined
  /types
    /index.ts               <-- TypeScript interfaces for data
```

---

### `src/types/index.ts`

```typescript
// src/types/index.ts

export interface Batch {
  id: string; // Unique ID for the batch (e.g., from Supabase)
  name: string; // The Batch ID shown in Figma is better represented as a Batch Name
  branch_id: string; // The branch this batch belongs to
  days_of_week: string[]; // Array of short day names, e.g., ['Mon', 'Wed', 'Fri']
  // Add other relevant batch properties here, like coach_id, start_time, end_time, etc.
}

// Define the shape of your Supabase client if not globally available
export interface SupabaseClient {
  from: (tableName: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        like?: (column: string, value: string) => Promise<{ data: any[] | null; error: any }>;
        order?: (column: string, options?: { ascending: boolean }) => Promise<{ data: any[] | null; error: any }>;
        then: (callback: (result: { data: any[] | null; error: any }) => void) => void; // For Promise-like behavior
        // Add other Supabase query methods as needed
      };
      // For general select without eq
      order?: (column: string, options?: { ascending: boolean }) => Promise<{ data: any[] | null; error: any }>;
      then: (callback: (result: { data: any[] | null; error: any }) => void) => void;
    };
  };
}
```

### `src/hooks/useSupabase.ts` (Conceptual Supabase Client)

This file would typically configure and export your Supabase client instance.

```typescript
// src/hooks/useSupabase.ts (or src/utils/supabase.ts)

import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '../types'; // Import your custom SupabaseClient interface

// Replace with your actual Supabase URL and Anon Key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Ensure these are defined
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required!');
  // Depending on your environment, you might throw an error or handle it gracefully
}

// Create a single supabase client for your application
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey) as SupabaseClient;

export default supabase;
```

### `src/components/BatchItem.tsx`

```typescript
// src/components/BatchItem.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Batch } from '../types';

interface BatchItemProps {
  batch: Batch;
  onPress: (batchId: string) => void;
}

const DAYS_OF_WEEK_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BatchItem: React.FC<BatchItemProps> = ({ batch, onPress }) => {
  return (
    <TouchableOpacity style={styles.batchContainer} onPress={() => onPress(batch.id)}>
      <View style={styles.batchInfo}>
        <View style={styles.batchIdButton}>
          <Text style={styles.batchIdText}>{batch.name}</Text>
        </View>
        <Text style={styles.arrowIcon}>></Text>
      </View>
      <View style={styles.daysContainer}>
        {DAYS_OF_WEEK_SHORT.map((day) => (
          <View
            key={day}
            style={[
              styles.dayButton,
              batch.days_of_week.includes(day) && styles.activeDayButton,
            ]}
          >
            <Text
              style={[
                styles.dayButtonText,
                batch.days_of_week.includes(day) && styles.activeDayButtonText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  batchContainer: {
    backgroundColor: '#444444', // Gray rectangle color
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16, // Matches the green container padding visually
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allows batch ID to take available space
  },
  batchIdButton: {
    backgroundColor: '#B22222', // Red color
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  batchIdText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  arrowIcon: {
    color: '#DDDDDD',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  daysContainer: {
    flexDirection: 'row',
    // Distribute days evenly in the remaining space
    justifyContent: 'space-between',
  },
  dayButton: {
    backgroundColor: '#555555', // Default inactive day color
    borderRadius: 6,
    width: 30, // Fixed width for day buttons
    height: 30, // Fixed height for day buttons
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4, // Spacing between day buttons
  },
  activeDayButton: {
    backgroundColor: '#888888', // Slightly lighter gray for active days, still distinct from the red
  },
  dayButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  activeDayButtonText: {
    color: '#FFFFFF', // Active day text color
  },
});

export default BatchItem;
```

### `src/screens/AzaibaBranchScreen.tsx`

```typescript
// src/screens/AzaibaBranchScreen.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
// Assuming you are using Expo Router for navigation, or react-navigation v6's useNavigation and useRoute.
// For Expo Router:
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
// For React Navigation v6:
// import { useNavigation, useRoute } from '@react-navigation/native';
// import type { RouteProp } from '@react-navigation/native';

import { Batch } from '../types';
import BatchItem from '../components/BatchItem';
import supabase from '../hooks/useSupabase'; // Your Supabase client instance

// If using React Navigation, define route params type
// type AzaibaBranchRouteParams = {
//   branchId?: string;
// };
// type AzaibaBranchScreenRouteProp = RouteProp<Record<string, AzaibaBranchRouteParams>, 'AzaibaBranch'>;


const AzaibaBranchScreen: React.FC = () => {
  // For Expo Router, get params directly
  const { branchId: paramBranchId } = useLocalSearchParams<{ branchId?: string }>();
  const branchId = paramBranchId || 'azaiba'; // Default to 'azaiba' if not provided

  // For React Navigation v6:
  // const route = useRoute<AzaibaBranchScreenRouteProp>();
  // const branchId = route.params?.branchId || 'azaiba';

  const navigation = useNavigation();
  const router = useRouter(); // For Expo Router

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');

  // Function to fetch batches from Supabase
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // CRITICAL ARCHITECTURE RULE 2: Actual API fetching logic
      // Assume 'batches' is your table name and 'branch_id' is the column for branch ID
      // You might have a Supabase Function that encapsulates this logic and returns filtered data.
      // E.g., `supabase.functions.invoke('get_batches_by_branch', { branch_id: branchId });`

      // --- REPLACE 'get_all_batches_for_branch' WITH YOUR ACTUAL SUPABASE FUNCTION OR TABLE QUERY ---
      const { data, error: fetchError } = await supabase
        .from('batches')
        .select('*') // Select all columns for the batch
        .eq('branch_id', branchId) // Filter by the current branch ID
        .order('name', { ascending: true }); // Order by batch name for consistency

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch batches.');
      }

      setBatches(data as Batch[]);
    } catch (err: any) {
      console.error('Error fetching batches:', err);
      setError(err.message || 'An unexpected error occurred.');
      Alert.alert('Error', err.message || 'Failed to load batches.');
    } finally {
      setLoading(false);
    }
  }, [branchId]); // Re-fetch if branchId changes

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Filter batches based on search text
  const filteredBatches = useMemo(() => {
    if (!searchText) {
      return batches;
    }
    const lowercasedSearchText = searchText.toLowerCase();
    return batches.filter((batch) =>
      batch.name.toLowerCase().includes(lowercasedSearchText)
    );
  }, [batches, searchText]);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleAddBatch = () => {
    // CRITICAL ARCHITECTURE RULE 3: Dynamic routing
    // COMMENT: Replace 'AddBatchScreen' with the actual route name for adding a new batch.
    // Ensure this route is defined in your navigation stack/router.
    if (router) { // Expo Router
      router.push({ pathname: '/add-batch', params: { branchId } });
    } else { // React Navigation
      // navigation.navigate('AddBatchScreen', { branchId });
      console.warn('Navigation to AddBatchScreen is not implemented. Using placeholder.');
    }
  };

  const handleBatchPress = (batchId: string) => {
    // CRITICAL ARCHITECTURE RULE 3: Dynamic routing
    // COMMENT: Replace 'BatchDetailsScreen' with the actual route name for batch details.
    // Pass the batchId as a parameter.
    if (router) { // Expo Router
      router.push({ pathname: `/batch/${batchId}`, params: { branchId } });
    } else { // React Navigation
      // navigation.navigate('BatchDetailsScreen', { batchId, branchId });
      console.warn(`Navigation to BatchDetailsScreen for batch ${batchId} is not implemented. Using placeholder.`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.branchInfo}>
          {/* Placeholder for Logo */}
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>MCCC</Text>
          </View>
          <Text style={styles.branchName}>
            {branchId.toUpperCase()} BRANCH
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <TouchableOpacity style={styles.searchIcon}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter batch name"
            placeholderTextColor="#888888"
            value={searchText}
            onChangeText={handleSearchChange}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchIcon}>
              <Text style={styles.iconText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add Batch Button */}
        <TouchableOpacity style={styles.addBatchButton} onPress={handleAddBatch}>
          <Text style={styles.addBatchIcon}>＋</Text>
          <Text style={styles.addBatchText}>Add Batch</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area (Green Box) */}
      <View style={styles.contentArea}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : error ? (
          <Text style={styles.errorText}>Error: {error}</Text>
        ) : filteredBatches.length === 0 ? (
          <Text style={styles.noBatchesText}>No batches found for {branchId.toUpperCase()} branch.</Text>
        ) : (
          <ScrollView
            style={styles.scrollViewContent}
            contentContainerStyle={styles.scrollViewPadding}
          >
            {filteredBatches.map((batch) => (
              <BatchItem key={batch.id} batch={batch} onPress={handleBatchPress} />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E', // Dark background as per Figma
    paddingTop: 50, // Adjust for iOS status bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap', // Allow items to wrap if screen is narrow
    justifyContent: 'space-between',
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 10, // Added for responsiveness
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#555555', // Placeholder for logo background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#FFD700', // Gold color for MCCC
    fontWeight: 'bold',
    fontSize: 12,
  },
  branchName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  searchBarContainer: {
    flex: 1, // Allows search bar to take available space
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 25,
    height: 40,
    paddingHorizontal: 15,
    minWidth: 180, // Ensure a minimum width for the search bar
    marginRight: 10,
    marginBottom: 10, // Added for responsiveness
  },
  searchIcon: {
    paddingRight: 8,
  },
  iconText: {
    color: '#DDDDDD',
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%', // Ensure full height
  },
  clearSearchIcon: {
    paddingLeft: 8,
  },
  addBatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    marginBottom: 10, // Added for responsiveness
  },
  addBatchIcon: {
    color: '#DDDDDD',
    fontSize: 18,
    marginRight: 5,
  },
  addBatchText: {
    color: '#DDDDDD',
    fontSize: 14,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#2E8B57', // Green box color (Sea Green)
    borderRadius: 15,
    marginHorizontal: 15,
    paddingTop: 16, // Top padding inside the green box
    overflow: 'hidden', // Ensures rounded corners clip children
    justifyContent: 'center', // For loader/error centering
    alignItems: 'center', // For loader/error centering
  },
  scrollViewContent: {
    flex: 1,
  },
  scrollViewPadding: {
    paddingBottom: 16, // Padding at the bottom of the scroll view
  },
  errorText: {
    color: '#FF6347', // Tomato red for errors
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  noBatchesText: {
    color: '#DDDDDD',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
});

export default AzaibaBranchScreen;
```

---

### How to Use and Integrate:

1.  **Install Dependencies:**
    *   `npm install @supabase/supabase-js react-native-url-polyfill` (or `yarn add ...`)
    *   If using Expo Router: `npx expo install expo-router react-native-safe-area-context react-native-screens`
    *   If using React Navigation: `npm install @react-navigation/native @react-navigation/stack react-native-screens react-native-safe-area-context`

2.  **Supabase Setup:**
    *   Replace `'YOUR_SUPABASE_URL'` and `'YOUR_SUPABASE_ANON_KEY'` in `src/hooks/useSupabase.ts` with your actual Supabase project credentials.
    *   Ensure your Supabase `batches` table has columns like `id`, `name`, `branch_id`, `days_of_week` (which can be a `TEXT[]` array type in Supabase).
    *   Set up row-level security (RLS) policies on your `batches` table to allow authenticated users to `SELECT` data.

3.  **Navigation Setup:**
    *   **Expo Router:**
        *   Create `app/[branchId].tsx` (or a similar dynamic route) for this screen.
        *   Ensure you have `_layout.tsx` for your overall app layout.
        *   The `router.push` calls will work automatically.
    *   **React Navigation:**
        *   Add `AzaibaBranchScreen` to your `AppNavigator.tsx` (or equivalent).
        *   Define routes like `AddBatchScreen` and `BatchDetailsScreen` in your navigator.
        *   Uncomment and adjust the `navigation.navigate` calls.

4.  **Styling Adjustments (Optional):**
    *   The `AzaibaBranchScreen.tsx` and `BatchItem.tsx` files contain detailed `StyleSheet.create` objects. You can adjust colors, fonts, and spacing to perfectly match your design system.
    *   The green container color (`#2E8B57`) is "Sea Green," which is a distinct green. If you wish to "reduce green," you could slightly mute this color or make it more transparent, but it's a prominent design element from the Figma.

This comprehensive solution provides a robust foundation for the Azaiba Branch page, fully adhering to the specified requirements and best practices for a senior developer.