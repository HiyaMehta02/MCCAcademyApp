Okay, Senior Developer hat here! I've reviewed the requirements, the Figma link, the user story, and the tech stack constraints. This looks like a standard branch overview page.

Here's the plan:

1.  **Structure:** Create a main `AzaibaBranchPage` component that handles data fetching, search, and rendering. We'll also have a smaller `BatchCard` component for each individual batch entry.
2.  **Data:** Define a TypeScript interface for a `Batch`. We'll simulate fetching this data from Supabase.
3.  **State Management:** Use `useState` for batches, search term, loading, and error states.
4.  **Supabase Integration:** Provide a placeholder for the Supabase call to fetch batches, as requested.
5.  **Search Functionality:** Filter the displayed batches based on the search input.
6.  **Styling:** Use a `styles.css` file to match the Figma design closely, including colors, layout, and scrollability.
7.  **Interactivity:**
    *   Make the entire `BatchCard` clickable for viewing batch details.
    *   Make the "Add Batch" button clickable with a routing placeholder.
    *   Implement the search input with a clear button.
8.  **Acceptance Criteria Check:**
    *   **Scrollable green box:** Achieved with `overflow-y: auto;`.
    *   **Clickable gray rectangles:** Each `BatchCard` will have an `onClick` handler.
    *   **Search bar:** Implemented with `searchTerm` state and filtering.
    *   **Add batch button:** Clickable with routing comment.
    *   **Name of branch:** Displayed.
    *   **Display (Batch ID and Days of the week):** Implemented in `BatchCard`.
    *   **Remove data filter:** No calendar/date filter implemented, per request.
    *   **Edit spelling:** Will ensure correct spelling.
    *   **Reducing green (optional):** The green container size is based on the Figma. I'll stick to it for now but note it's adjustable via CSS.

Let's get this done.

---

```typescript
// src/interfaces/Batch.ts
// Defines the structure for a batch object.
export interface Batch {
  id: string; // Unique ID for the batch, could be a UUID from Supabase
  name: string; // The name of the batch, e.g., "Morning Legends", "Evening Stars"
  days: string[]; // Days of the week this batch is active, e.g., ['Mon', 'Wed', 'Fri']
  // You might add more fields like coachId, startTime, endTime, capacity, etc.
}

// In a real application, you might have a dedicated Supabase client setup:
// src/supabaseClient.ts
// import { createClient } from '@supabase/supabase-js';
// export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

```

```typescript
// src/components/BatchCard.tsx
import React from 'react';
import { Batch } from '../interfaces/Batch';
import '../styles/BatchCard.css'; // Import the specific CSS for BatchCard

interface BatchCardProps {
  batch: Batch;
  onClick: (batchId: string) => void;
}

const BatchCard: React.FC<BatchCardProps> = ({ batch, onClick }) => {
  const handleCardClick = () => {
    onClick(batch.id);
  };

  return (
    <div className="batch-card-container" onClick={handleCardClick}>
      <div className="batch-id-section">
        <button className="batch-id-button">
          {batch.name} {/* Display the batch name here */}
        </button>
        <span className="batch-arrow-icon">&gt;</span> {/* Simple arrow icon */}
      </div>
      <div className="batch-days-section">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <button
            key={day}
            className={`day-button ${batch.days.includes(day) ? 'active' : 'inactive'}`}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BatchCard;

```

```typescript
// src/styles/BatchCard.css
/* --- Batch Card Styling --- */
.batch-card-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #666666; /* Gray rectangle background */
  border-radius: 10px;
  padding: 15px 20px;
  margin-bottom: 20px; /* Space between batch cards */
  cursor: pointer; /* Indicate it's clickable */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
}

.batch-card-container:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.batch-id-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-basis: 30%; /* Take up some space, but allow days to take more */
  min-width: 150px; /* Minimum width to prevent squishing */
}

.batch-id-button {
  background-color: #bb1e1e; /* Red color for Batch ID button */
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 15px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer; /* The button itself is clickable, but the whole card is too */
  white-space: nowrap; /* Prevent text wrapping */
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px; /* Limit width */
}

.batch-arrow-icon {
  color: #ffffff;
  font-size: 1.2em;
  font-weight: bold;
}

.batch-days-section {
  display: flex;
  gap: 8px; /* Space between day buttons */
  flex-grow: 1; /* Allow days section to take up remaining space */
  justify-content: flex-end; /* Align days to the right */
  flex-wrap: wrap; /* Allow day buttons to wrap */
  max-width: 60%; /* Ensure it doesn't take too much space if batch ID is long */
}

.day-button {
  background-color: #333333; /* Darker gray for inactive/background days */
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.85em;
  font-weight: normal;
  cursor: default; /* Days themselves are not clickable interactive elements */
  min-width: 40px; /* Ensure consistent width for day buttons */
  text-align: center;
}

.day-button.active {
  background-color: #4CAF50; /* A slightly different color if a day is active, purely for visual distinction, not in Figma but good practice */
  /* Reverting to Figma's gray as per design. If active/inactive state needs visual distinction, this should be adjusted. */
  background-color: #666666; /* Figma's gray for active days too */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .batch-card-container {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 15px;
  }

  .batch-id-section {
    margin-bottom: 10px;
    flex-basis: auto;
    width: 100%;
    justify-content: flex-start;
  }

  .batch-days-section {
    width: 100%;
    justify-content: flex-start;
    max-width: 100%;
  }

  .batch-id-button {
    max-width: none;
  }
}
```

```typescript
// src/pages/AzaibaBranchPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming react-router-dom for navigation
import { Batch } from '../interfaces/Batch';
import BatchCard from '../components/BatchCard';
import '../styles/AzaibaBranchPage.css'; // Main page CSS
// import { supabase } from '../supabaseClient'; // Uncomment and configure if you have a supabase client

const MCCC_LOGO_URL = "https://via.placeholder.com/40x40/FFFFFF/000000?text=MCCC"; // Placeholder logo

const AzaibaBranchPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize navigate for routing
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      setError(null);
      try {
        // --- SUPABASE INTEGRATION POINT ---
        // Replace this mock data with your actual Supabase call.
        // Example: const { data, error } = await supabase.from('batches').select('*');
        // Make sure your Supabase function 'getBatchesForBranch' exists and returns Batch[].
        // If your Supabase table is named 'batches', you might query it like this:
        // const { data, error } = await supabase.from('batches').select('*').eq('branch_id', 'azaiba');

        // For now, using mock data:
        const mockData: Batch[] = [
          { id: 'B001', name: 'Morning Legends', days: ['Mon', 'Wed', 'Fri'] },
          { id: 'B002', name: 'Evening Warriors', days: ['Tue', 'Thu', 'Sat'] },
          { id: 'B003', name: 'Weekend Strikers', days: ['Sat', 'Sun'] },
          { id: 'B004', name: 'Junior Stars', days: ['Mon', 'Tue', 'Wed', 'Thu'] },
          { id: 'B005', name: 'Senior Pros', days: ['Sun', 'Mon', 'Tue'] },
          { id: 'B006', name: 'Afternoon Aces', days: ['Wed', 'Fri'] },
          { id: 'B007', name: 'Youth Champions', days: ['Tue', 'Thu', 'Sat'] },
          { id: 'B008', name: 'Development Squad', days: ['Mon', 'Wed', 'Fri', 'Sun'] },
        ];
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // If you were using Supabase:
        // if (error) {
        //   throw new Error(error.message);
        // }
        // if (data) {
        //   setBatches(data as Batch[]); // Type assertion if necessary
        // }
        setBatches(mockData);

      } catch (err: any) {
        console.error("Failed to fetch batches:", err);
        setError(`Failed to load batches: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []); // Empty dependency array means this runs once on mount

  // Filter batches based on search term
  const filteredBatches = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return batches;
    }
    return batches.filter(batch =>
      batch.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [batches, searchTerm]);

  const handleBatchClick = (batchId: string) => {
    console.log(`Clicked on batch: ${batchId}`);
    // --- ROUTING POINT ---
    // You would typically navigate to a batch detail page here.
    // Example: navigate(`/batch/${batchId}`);
    alert(`Navigating to details for Batch ID: ${batchId}`);
  };

  const handleAddBatchClick = () => {
    console.log("Add Batch button clicked");
    // --- ROUTING POINT ---
    // Navigate to the 'Add Batch' page.
    // Example: navigate('/create-batch'); // Replace with your actual route
    navigate('/add-new-batch-page'); // Placeholder route
    alert("Navigating to the 'Add New Batch' page.");
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="azaiba-branch-page">
      <header className="app-header">
        <div className="branch-info">
          <img src={MCCC_LOGO_URL} alt="MCCC Logo" className="mccc-logo" />
          <h1 className="branch-name">AZAIBA BRANCH</h1>
        </div>

        <div className="search-and-add-section">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Enter batch name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search-button" onClick={handleClearSearch}>
                &times;
              </button>
            )}
          </div>
          <button className="add-batch-button" onClick={handleAddBatchClick}>
            <span className="add-icon">+</span> Add Batch
          </button>
        </div>
      </header>

      <main className="batches-container-wrapper">
        <div className="batches-container">
          {loading && <p className="loading-message">Loading batches...</p>}
          {error && <p className="error-message">Error: {error}</p>}
          {!loading && !error && filteredBatches.length === 0 && (
            <p className="no-batches-message">No batches found matching "{searchTerm}"</p>
          )}
          {!loading && !error && filteredBatches.length > 0 && (
            <div className="batch-list">
              {filteredBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} onClick={handleBatchClick} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AzaibaBranchPage;

```

```typescript
// src/styles/AzaibaBranchPage.css
/* --- General Page Styling --- */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #1a1a1a; /* Dark background matching Figma */
  color: #ffffff;
}

.azaiba-branch-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box; /* Include padding in element's total width and height */
}

/* --- Header Styling --- */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  margin-bottom: 30px;
  flex-wrap: wrap; /* Allow elements to wrap on smaller screens */
  gap: 20px; /* Space between header sections */
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.mccc-logo {
  width: 50px; /* Adjust size as needed */
  height: 50px;
  border-radius: 50%; /* If the logo is round */
  object-fit: contain; /* Ensure logo fits */
}

.branch-name {
  font-size: 1.8em;
  font-weight: bold;
  margin: 0;
  color: #ffffff;
}

.search-and-add-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-grow: 1; /* Allow this section to grow */
  justify-content: flex-end; /* Push content to the right */
  flex-wrap: wrap; /* Allow wrapping */
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: #333333; /* Dark gray for search background */
  border-radius: 10px;
  padding: 8px 15px;
  flex-grow: 1; /* Allow search bar to grow */
  max-width: 400px; /* Max width for search bar */
}

.search-icon {
  color: #cccccc;
  margin-right: 10px;
  font-size: 1.2em;
}

.search-input {
  background: none;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 1em;
  flex-grow: 1;
  padding: 5px 0;
}

.search-input::placeholder {
  color: #aaaaaa;
  opacity: 0.7;
}

.clear-search-button {
  background: none;
  border: none;
  color: #cccccc;
  font-size: 1.5em;
  cursor: pointer;
  margin-left: 10px;
  padding: 0 5px;
  line-height: 1;
}

.add-batch-button {
  background-color: transparent; /* Transparent background */
  border: 1px solid #666666; /* Light gray border for distinction */
  color: #ffffff;
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap; /* Prevent text wrapping */
}

.add-batch-button:hover {
  background-color: #333333; /* Slightly darker on hover */
  border-color: #ffffff;
}

.add-icon {
  font-size: 1.2em;
}

/* --- Batches Container Styling --- */
.batches-container-wrapper {
  flex-grow: 1;
  background-color: #268038; /* Green box background */
  border-radius: 15px;
  padding: 30px; /* Internal padding */
  overflow: hidden; /* Ensure content inside respects border-radius */
  display: flex; /* Use flex to center content if needed, or manage its height */
  flex-direction: column;
}

.batches-container {
  flex-grow: 1; /* Allow the content area to expand */
  overflow-y: auto; /* Make content scrollable */
  padding-right: 10px; /* Add some padding for the scrollbar */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: #4CAF50 #333333; /* Thumb color, Track color */
}

/* Webkit browsers (Chrome, Safari) scrollbar */
.batches-container::-webkit-scrollbar {
  width: 8px;
}

.batches-container::-webkit-scrollbar-track {
  background: #333333;
  border-radius: 10px;
}

.batches-container::-webkit-scrollbar-thumb {
  background-color: #4CAF50;
  border-radius: 10px;
  border: 2px solid #333333;
}


.batch-list {
  display: flex;
  flex-direction: column;
  gap: 20px; /* Space between batch cards, handled by BatchCard margin-bottom instead */
  padding-bottom: 10px; /* Ensure space at the bottom when scrolling */
}

.loading-message,
.error-message,
.no-batches-message {
  text-align: center;
  font-size: 1.1em;
  color: #cccccc;
  margin-top: 50px;
}

.error-message {
  color: #ff6b6b;
}

/* --- Responsive Adjustments --- */
@media (max-width: 900px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-and-add-section {
    width: 100%;
    justify-content: flex-start;
    flex-direction: column; /* Stack search and add batch */
    align-items: flex-start;
    gap: 15px;
  }

  .search-bar {
    width: 100%;
    max-width: none; /* Allow search bar to take full width */
  }

  .add-batch-button {
    width: 100%; /* Make add batch button full width */
    justify-content: center;
  }

  .branch-name {
    font-size: 1.5em;
  }

  .batches-container-wrapper {
    padding: 20px;
  }
}

@media (max-width: 600px) {
  .azaiba-branch-page {
    padding: 10px;
  }

  .app-header {
    padding: 10px 0;
    margin-bottom: 20px;
  }

  .mccc-logo {
    width: 40px;
    height: 40px;
  }

  .branch-name {
    font-size: 1.2em;
  }

  .search-bar {
    padding: 6px 10px;
  }

  .search-input {
    font-size: 0.9em;
  }

  .add-batch-button {
    padding: 10px 15px;
    font-size: 0.9em;
  }

  .batches-container-wrapper {
    padding: 15px;
  }
}

```

### How to use this code:

1.  **Project Setup:**
    *   Make sure you have a React TypeScript project set up (e.g., using `create-react-app` or Vite).
    *   Install `react-router-dom`: `npm install react-router-dom` or `yarn add react-router-dom`.

2.  **File Structure:**
    *   Create a folder `src/interfaces` and put `Batch.ts` inside.
    *   Create a folder `src/components` and put `BatchCard.tsx` inside.
    *   Create a folder `src/pages` and put `AzaibaBranchPage.tsx` inside.
    *   Create a folder `src/styles` and put `BatchCard.css` and `AzaibaBranchPage.css` inside.

3.  **Integrate into your `App.tsx` (or main routing file):**
    ```typescript
    // src/App.tsx
    import React from 'react';
    import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
    import AzaibaBranchPage from './pages/AzaibaBranchPage';
    // Import other pages you might have
    // import AddNewBatchPage from './pages/AddNewBatchPage'; // Example
    // import BatchDetailsPage from './pages/BatchDetailsPage'; // Example

    function App() {
      return (
        <Router>
          <Routes>
            <Route path="/" element={<AzaibaBranchPage />} />
            {/* --- ROUTING POINTS for other pages --- */}
            {/* Example: Route to an Add Batch page */}
            {/* <Route path="/add-new-batch-page" element={<AddNewBatchPage />} /> */}
            {/* Example: Route to a Batch Details page */}
            {/* <Route path="/batch/:batchId" element={<BatchDetailsPage />} /> */}
            {/* Add more routes as needed */}
          </Routes>
        </Router>
      );
    }

    export default App;
    ```
4.  **Supabase Integration (Your Task):**
    *   Uncomment and configure `supabaseClient.ts` if you have one.
    *   In `AzaibaBranchPage.tsx`, within the `useEffect`'s `fetchBatches` function, replace the mock data with your actual Supabase calls. You'll likely want a function like `supabase.from('batches').select('*')` and possibly filter by a `branch_id` column.

5.  **Routing (Your Task):**
    *   In `AzaibaBranchPage.tsx`, update the `handleBatchClick` and `handleAddBatchClick` functions with your actual route paths (e.g., `/batch/${batchId}` and `/create-batch`).
    *   Create the target pages (e.g., `AddNewBatchPage.tsx`, `BatchDetailsPage.tsx`) and add their routes to `App.tsx`.

### Design Checklist Review:

*   **Search Bar:** Implemented.
*   **Calendar (Select a date):** Omitted as requested ("remove the data filter here").
*   **Add a batch:** Button implemented and clickable with routing placeholder.
*   **Name of branch:** "AZAIBA BRANCH" displayed.
*   **Display (Batch ID and Days of the week):** Implemented in `BatchCard`.
*   **Remove the data filter here:** Done, no date filter present.
*   **Edit spelling:** Reviewed and corrected.
*   **Try reducing green (optional):** The green box is sized per the Figma. If you wish to reduce its prominence, you can adjust the `padding` or `height` in `.batches-container-wrapper` in `AzaibaBranchPage.css`.

This setup provides a robust, modular, and styled foundation for your Azaiba Branch page, ready for your specific Supabase and routing integrations.