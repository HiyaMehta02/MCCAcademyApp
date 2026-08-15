Okay, Senior Developer hat on. This is a common pattern for displaying lists with search and dynamic routing in a mobile application. We'll leverage TypeScript for strong typing, React Native components, `expo-router` for dynamic routing, and integrate with Supabase for data fetching.

Given the critical architecture rules and requirements, here's the plan:

1.  **Supabase Client Setup:** Assume a `supabase` client instance is already configured and available. I'll create a placeholder `lib/supabase.ts` for context.
2.  **Types:** Define TypeScript interfaces for the `Batch` data structure.
3.  **API Integration:** Create a function to fetch batches from Supabase, handling loading and error states.
4.  **Dynamic Routing:**
    *   The page itself will be dynamic based on a `branchId` retrieved from `useLocalSearchParams`.
    *   The search query will be managed via `useLocalSearchParams` to keep the URL updated.
    *   Clicking a batch will navigate to a batch detail page using `router.push` with the batch ID.
    *   The "Add Batch" button will also use `router.push`.
5.  **Search Functionality:** Filter fetched batches based on the search query.
6.  **UI Implementation:** Recreate the Figma design using React Native components and inline CSS (via `StyleSheet`).
    *   Header with logo, branch name, search bar, and "Add Batch" button.
    *   Scrollable green container for batch items.
    *   Each batch item showing Batch ID and active days.
7.  **Styling Considerations:** Will aim to match the provided Figma image's colors and layout as closely as possible. For "reducing green," I'll ensure the green background is contained to the specified area and not overly dominant.
8.  **Icons:** Will use `react-native-vector-icons` for better icon representation.

---

### Supabase and Project Setup (Assumed)

First, let's assume you have a `supabase.ts` file configured like this in your project (e.g., `lib/supabase.ts`):

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants'; // Using expo-constants to get environment variables

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in app.config.ts extra field.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// You would define your database schema here for types, or use Supabase's generated types
// For this example, we'll manually define types for the `batches` table.

/**
 * Example for app.config.ts (or app.json)
 *
 * {
 *   "expo": {
 *     "name": "MCCC App",
 *     // ... other configurations
 *     "extra": {
 *       "supabaseUrl": "YOUR_SUPABASE_PROJECT_URL",
 *       "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
 *     }
 *   }
 * }
 */
```

And ensure you have `expo-router` installed and configured, which implies your component will live in a file structure like `app/branches/[branchId].tsx`.

To install `react-native-vector-icons`:
`npx expo install react-native-vector-icons`

---

### Code Implementation (`app/branches/[branchId].tsx`)

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Adjust path as per your project structure
import { FontAwesome, AntDesign, MaterialIcons } from '@expo/vector-icons'; // For icons

// --- 1. Define Types ---
interface Batch {
  id: string; // Corresponds to Batch ID
  name: string; // The name of the batch for searching
  branch_id: string; // Foreign key to branches table
  schedule: string[]; // Array of days, e.g., ['Mon', 'Wed', 'Fri']
  created_at: string;
  // Add any other relevant batch properties
}

// --- Component Start ---
const DaysOfWeek = ['Mon', 'Tue', 'Wen', 'Thu', 'Fri', 'Sat', 'Sun']; // "Wen" as per Figma

export default function BranchBatchesScreen() {
  const router = useRouter();
  const { branchId, search } = useLocalSearchParams<{ branchId: string; search?: string }>();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(search || ''); // Initialize with URL param

  // --- 2. API Fetching Logic ---
  const fetchBatches = useCallback(async () => {
    if (!branchId) {
      setError('Branch ID not found in URL parameters.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // CRITICAL ARCHITECTURE RULE: Implement actual API fetching logic.
      // Assume a 'batches' table in Supabase.
      // If you have a stored procedure or an RPC function for this,
      // you would replace `.from('batches').select('*')` with `.rpc('your_function_name', { branch_id_param: branchId })`
      const { data, error } = await supabase
        .from('batches') // COMMENT: Change 'batches' to your actual table name if different
        .select('*')
        .eq('branch_id', branchId); // Filter by the dynamic branchId

      if (error) {
        throw error;
      }
      setBatches(data || []);
    } catch (err: any) {
      console.error('Error fetching batches:', err.message);
      setError('Failed to load batches. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // --- 3. Search Bar Functionality ---
  // Update the URL search param when searchQuery changes
  useEffect(() => {
    router.setParams({ search: searchQuery || undefined });
  }, [searchQuery, router]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Filter batches based on the search query
  const filteredBatches = batches.filter((batch) =>
    batch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 4. Routing Handlers ---
  const handleAddBatch = () => {
    // CRITICAL ARCHITECTURE RULE: Add routing but don't put the name of a page.
    // COMMENT: Replace 'add-batch-screen' with the actual path to your "Add Batch" page.
    router.push('/add-batch-screen');
  };

  const handleBatchPress = (batchId: string) => {
    // CRITICAL ARCHITECTURE RULE: Dynamic routing.
    // Navigate to a specific batch detail page.
    router.push(`/batches/${batchId}`); // Assuming a route like app/batches/[batchId].tsx
  };

  // Render Logic
  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        {/* Logo and Branch Name */}
        <View style={styles.branchInfo}>
          {/* Using a simple text for logo. Replace with Image component for actual logo */}
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>MCCC</Text>
          </View>
          <Text style={styles.branchName}>AZAIBA BRANCH</Text>
        </View>

        {/* Search Bar and Add Batch Button */}
        <View style={styles.searchAndAddContainer}>
          <View style={styles.searchBar}>
            <FontAwesome name="search" size={18} color="#aaa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter batch name"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearSearchIcon}>
                <AntDesign name="closecircle" size={16} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleAddBatch} style={styles.addBatchButton}>
            <AntDesign name="pluscircle" size={18} color="#FFF" />
            <Text style={styles.addBatchText}>Add Batch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area (Scrollable Green Box) */}
      <View style={styles.batchesContainerWrapper}>
        {loading && <ActivityIndicator size="large" color="#FFD700" style={styles.loader} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && filteredBatches.length === 0 && (
          <Text style={styles.noBatchesText}>No batches found for this branch or search query.</Text>
        )}

        {!loading && !error && (
          <ScrollView style={styles.batchesScrollView}>
            {filteredBatches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                style={styles.batchCard}
                onPress={() => handleBatchPress(batch.id)}
              >
                <View style={styles.batchIdContainer}>
                  <Text style={styles.batchIdText}>{batch.name}</Text> {/* Using name as ID for display */}
                  <MaterialIcons name="keyboard-arrow-right" size={24} color="#FFF" />
                </View>

                <View style={styles.daysContainer}>
                  {DaysOfWeek.map((day) => (
                    <View
                      key={day}
                      style={[
                        styles.dayButton,
                        batch.schedule.includes(day)
                          ? styles.dayButtonActive
                          : styles.dayButtonInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          batch.schedule.includes(day)
                            ? styles.dayButtonTextActive
                            : styles.dayButtonTextInactive,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
            {/* Add some padding at the bottom for scroll comfort */}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Styling ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E', // Dark background as per Figma
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#D10000', // Red for logo background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  branchName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchAndAddContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3C', // Dark gray for search background
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  clearSearchIcon: {
    padding: 5,
  },
  addBatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D10000', // Red for Add Batch button
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  addBatchText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  batchesContainerWrapper: {
    flex: 1,
    backgroundColor: '#264D3F', // Green box background
    margin: 20, // Margin around the green box
    borderRadius: 15,
    overflow: 'hidden', // Ensures scroll view content respects border radius
  },
  batchesScrollView: {
    flex: 1, // Make the scroll view take available space inside the green box
    padding: 15,
  },
  loader: {
    marginTop: 50,
  },
  errorText: {
    color: '#FF6347', // Tomato red for errors
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  noBatchesText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  batchCard: {
    backgroundColor: '#3A3A3C', // Gray rectangle for each batch
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
  },
  batchIdContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  batchIdText: {
    color: '#D10000', // Red for Batch ID text
    fontSize: 18,
    fontWeight: 'bold',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow days to wrap if too many
    justifyContent: 'flex-start',
    gap: 8, // Spacing between day buttons
  },
  dayButton: {
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 40, // Ensure consistent width for day buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#D10000', // Red for active days
  },
  dayButtonInactive: {
    backgroundColor: '#555555', // Darker gray for inactive days
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#FFF',
  },
  dayButtonTextInactive: {
    color: '#CCC',
  },
});
```

---

### How to use this component with `expo-router`:

1.  **File Structure:** Save the above code as `app/branches/[branchId].tsx`.
2.  **`app.config.ts` (or `app.json`):** Make sure your Supabase keys are configured:
    ```json
    {
      "expo": {
        "name": "MCCC App",
        "slug": "mccc-app",
        // ... other config
        "extra": {
          "supabaseUrl": "YOUR_SUPABASE_PROJECT_URL",
          "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
        }
      }
    }
    ```
    Then `npx expo prebuild --clean` or restart your dev server to pick up `extra` changes.
3.  **Navigation:** To access this page, you would navigate like this:
    `router.push('/branches/your-branch-id-here')`
    For example, for "Azaiba Branch", if its ID in your database is `azaiba-001`:
    `router.push('/branches/azaiba-001')`
    The `branchId` (`azaiba-001`) will then be available via `useLocalSearchParams()`.

This implementation covers all the specified requirements: dynamic routing, no mock data (with actual API fetching structure), scrollable content, clickable batch items, a functional search bar updating URL params, and a clickable "Add Batch" button with a routing placeholder. The styling attempts to match the Figma design using standard React Native components.