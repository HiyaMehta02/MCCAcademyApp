As a Senior Developer, I've analyzed the Figma design and the provided image for the "Muscat Branch" page. The request specifies using React and TypeScript, and includes several design and information requirements.

I've structured the application into several components to ensure modularity, reusability, and maintainability. Styling is primarily done using CSS modules for scoped styles, with a `GlobalStyles.css` for overall page defaults.

---

### Implementation Notes:

1.  **React/TypeScript:** The entire solution is built with React functional components and TypeScript for type safety.
2.  **Design Adherence:**
    *   **Colors & Typography:** I've extracted the main colors from the Figma design and applied them. Font styles are based on visual cues (sans-serif, various weights/sizes).
    *   **Layout & Spacing:** Flexbox and grid are used to replicate the layout, including the header and the batch list.
    *   **Icons:** Simple SVG icons are used for search, clear, add, and the chevron. The MCCC logo is a placeholder SVG.
3.  **Search Bar:** Implemented with state for the input value and dynamic rendering of the clear button.
4.  **Calendar (Select a date):** This component is *not* visually present in the provided Figma node (`0-1`) or the screenshot. I've added a comment in `MuscatBranchPage.tsx` indicating where a date picker component would typically be integrated, likely as a filter alongside the search bar, but have not implemented a full UI for it.
5.  **Add a batch:** An "Add Batch" button is present in the header. Clicking it adds a new dummy batch to the list.
6.  **Name of branch:** "MUSCAT BRANCH" is prominently displayed in the header next to the logo.
7.  **Display (Batch ID and Days of the week):**
    *   The `BatchRow` component handles the display of each batch.
    *   "Batch ID" is a clickable button.
    *   Days of the week are individual clickable buttons. For demonstration, I've made them toggle their "active" state, though the Figma only shows a single grey state. I've added a visual cue (lighter vs. darker grey) for the active state.
8.  **Data Management:** Dummy batch data is managed in the `MuscatBranchPage` component's state. Filtering by search term and toggling day states are implemented.

---

### File Structure:

```
src/
├── components/
│   ├── BatchList.tsx
│   ├── BatchRow.tsx
│   ├── DayButton.tsx
│   ├── Header.tsx
│   └── MuscatBranchPage.tsx
├── types/
│   └── index.ts
├── styles/
│   └── GlobalStyles.css
├── App.tsx
├── index.tsx
└── react-app-env.d.ts
```

---

### Code Generation:

First, ensure you have a React project set up (e.g., using Create React App or Vite):
`npx create-react-app muscat-branch-app --template typescript`
or
`npm create vite@latest muscat-branch-app -- --template react-ts`

Then, replace the contents of the files as follows:

**1. `src/types/index.ts`**
```typescript
// src/types/index.ts

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface BatchDay {
  label: DayOfWeek;
  isActive: boolean; // Indicates if the day is active for this specific batch
}

export interface Batch {
  id: string; // Unique identifier for the batch (e.g., "B001", "B002")
  name: string; // Display name for the batch (e.g., "Batch ID 001")
  days: BatchDay[];
}
```

**2. `src/styles/GlobalStyles.css`**
```css
/* src/styles/GlobalStyles.css */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --background-dark: #262626;
  --header-text: #FFFFFF;
  --primary-green: #368D53;
  --batch-id-red: #9D3534;
  --day-button-dark-gray: #4D4D4D;
  --day-button-light-gray: #757575; /* For active state differentiation */
  --search-border-color: #555;
  --text-white: #FFFFFF;
  --icon-color: #FFFFFF;
  --logo-yellow: #FFD700; /* Placeholder for logo accent */
  --chevron-color: #757575;
}

body {
  margin: 0;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--background-dark);
  color: var(--text-white);
  height: 100vh;
  overflow: hidden; /* Prevent body scroll, content will scroll if needed */
}

#root {
  display: flex;
  flex-direction: column;
  height: 100%;
}

button {
  border: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  outline: none;
}
```

**3. `src/components/Header.tsx`**
```typescript
// src/components/Header.tsx
import React, { useState } from 'react';
import './Header.module.css'; // Assuming Header.module.css exists

interface HeaderProps {
  onSearchChange: (searchTerm: string) => void;
  onAddBatch: () => void;
  branchName: string;
}

const Header: React.FC<HeaderProps> = ({ onSearchChange, onAddBatch, branchName }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onSearchChange('');
  };

  return (
    <header className="header">
      <div className="logo-section">
        {/* Placeholder SVG for the MCCC Logo */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="logo-icon"
        >
          <path d="M12 2L2 22H22L12 2Z" fill="white"/>
          <path d="M12 5L4.5 20H19.5L12 5Z" fill="var(--logo-yellow)"/>
          <circle cx="12" cy="12" r="2" fill="white"/>
          {/* More complex path for the actual MCCC logo can go here */}
        </svg>
        <div className="branch-name">
          <span>{branchName.split(' ')[0]}</span>
          <span className="branch-name-bold">{branchName.split(' ').slice(1).join(' ')}</span>
        </div>
      </div>

      <div className="search-add-section">
        <div className="search-bar">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Enter batch name"
            value={searchTerm}
            onChange={handleSearchInputChange}
          />
          {searchTerm && (
            <button className="clear-button" onClick={handleClearSearch}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        <button className="add-batch-button" onClick={onAddBatch}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Batch
        </button>
      </div>
    </header>
  );
};

export default Header;
```

**4. `src/components/Header.module.css`**
```css
/* src/components/Header.module.css */

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background-color: var(--background-dark);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  /* More specific styling for the MCCC logo if it was an actual SVG */
}

.branch-name {
  font-size: 24px;
  font-weight: 500;
  color: var(--header-text);
  display: flex;
  align-items: center;
  gap: 8px; /* Gap between 'MUSCAT' and 'BRANCH' */
}

.branch-name span:first-child {
  /* For 'MUSCAT' */
  font-weight: 400;
  letter-spacing: 0.5px;
}

.branch-name-bold {
  /* For 'BRANCH' */
  font-weight: 700;
  letter-spacing: 0.5px;
  border-left: 2px solid var(--text-white); /* Visual separator */
  padding-left: 8px;
  margin-left: -2px; /* Adjust for border */
}


.search-add-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background-color: #3D3D3D; /* Slightly lighter gray for input background */
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid var(--search-border-color);
  width: 300px;
  height: 40px;
}

.search-bar .search-icon {
  width: 20px;
  height: 20px;
  color: var(--icon-color);
  margin-right: 10px;
}

.search-bar input {
  flex-grow: 1;
  border: none;
  background: transparent;
  color: var(--text-white);
  font-size: 16px;
  padding: 0;
}

.search-bar input::placeholder {
  color: #A0A0A0;
}

.search-bar input:focus {
  outline: none;
}

.search-bar .clear-button {
  background: none;
  border: none;
  color: var(--icon-color);
  cursor: pointer;
  padding: 0;
  margin-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.search-bar .clear-button svg {
  width: 16px;
  height: 16px;
  stroke: #A0A0A0;
}


.add-batch-button {
  background-color: var(--primary-green);
  color: var(--text-white);
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease;
}

.add-batch-button:hover {
  background-color: #4CAF6C; /* Slightly lighter green on hover */
}

.add-batch-button svg {
  width: 18px;
  height: 18px;
  stroke: var(--text-white);
}
```

**5. `src/components/DayButton.tsx`**
```typescript
// src/components/DayButton.tsx
import React from 'react';
import { DayOfWeek } from '../types';
import './DayButton.module.css';

interface DayButtonProps {
  day: DayOfWeek;
  isActive: boolean;
  onClick: (day: DayOfWeek) => void;
}

const DayButton: React.FC<DayButtonProps> = ({ day, isActive, onClick }) => {
  return (
    <button
      className={`day-button ${isActive ? 'active' : ''}`}
      onClick={() => onClick(day)}
    >
      {day}
    </button>
  );
};

export default DayButton;
```

**6. `src/components/DayButton.module.css`**
```css
/* src/components/DayButton.module.css */

.day-button {
  background-color: var(--day-button-dark-gray);
  color: var(--text-white);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  min-width: 45px; /* Ensures consistent width for all days */
  text-align: center;
  transition: background-color 0.2s ease;
}

.day-button.active {
  background-color: var(--day-button-light-gray); /* Lighter gray for active state */
  /* Or could use a primary color like green:
  background-color: var(--primary-green); */
}

.day-button:hover {
  opacity: 0.9;
}
```

**7. `src/components/BatchRow.tsx`**
```typescript
// src/components/BatchRow.tsx
import React from 'react';
import { Batch, DayOfWeek } from '../types';
import DayButton from './DayButton';
import './BatchRow.module.css';

interface BatchRowProps {
  batch: Batch;
  onDayToggle: (batchId: string, day: DayOfWeek) => void;
  onBatchClick: (batchId: string) => void; // For clicking the Batch ID button
}

const BatchRow: React.FC<BatchRowProps> = ({ batch, onDayToggle, onBatchClick }) => {
  return (
    <div className="batch-row-container">
      <button className="batch-id-button" onClick={() => onBatchClick(batch.id)}>
        {batch.name}
      </button>
      <span className="chevron-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </span>
      <div className="days-container">
        {batch.days.map((day) => (
          <DayButton
            key={day.label}
            day={day.label}
            isActive={day.isActive}
            onClick={() => onDayToggle(batch.id, day.label)}
          />
        ))}
      </div>
    </div>
  );
};

export default BatchRow;
```

**8. `src/components/BatchRow.module.css`**
```css
/* src/components/BatchRow.module.css */

.batch-row-container {
  display: flex;
  align-items: center;
  gap: 15px; /* Spacing between elements in the row */
  background-color: var(--primary-green);
  padding: 15px 20px;
  border-radius: 10px;
  margin-bottom: 15px; /* Spacing between rows */
}

.batch-id-button {
  background-color: var(--batch-id-red);
  color: var(--text-white);
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  min-width: 150px; /* Fixed width for Batch ID button */
  text-align: center;
  transition: background-color 0.2s ease;
}

.batch-id-button:hover {
  background-color: #B04544; /* Slightly lighter red on hover */
}

.chevron-icon {
  display: flex;
  align-items: center;
  color: var(--chevron-color);
}

.chevron-icon svg {
  width: 20px;
  height: 20px;
  stroke: var(--chevron-color);
}

.days-container {
  display: flex;
  gap: 10px; /* Spacing between day buttons */
  flex-grow: 1; /* Allows days to take up available space */
  justify-content: flex-end; /* Pushes day buttons to the right */
}
```

**9. `src/components/BatchList.tsx`**
```typescript
// src/components/BatchList.tsx
import React from 'react';
import { Batch, DayOfWeek } from '../types';
import BatchRow from './BatchRow';
import './BatchList.module.css';

interface BatchListProps {
  batches: Batch[];
  onDayToggle: (batchId: string, day: DayOfWeek) => void;
  onBatchClick: (batchId: string) => void;
}

const BatchList: React.FC<BatchListProps> = ({ batches, onDayToggle, onBatchClick }) => {
  return (
    <div className="batch-list-wrapper">
      <div className="batch-list-container">
        {batches.length === 0 ? (
          <p className="no-batches-message">No batches found. Try adding one!</p>
        ) : (
          batches.map((batch) => (
            <BatchRow
              key={batch.id}
              batch={batch}
              onDayToggle={onDayToggle}
              onBatchClick={onBatchClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BatchList;
```

**10. `src/components/BatchList.module.css`**
```css
/* src/components/BatchList.module.css */

.batch-list-wrapper {
  flex-grow: 1;
  padding: 40px; /* Padding around the entire green container */
  overflow-y: auto; /* Allows scrolling if many batches */
}

.batch-list-container {
  background-color: var(--primary-green);
  border-radius: 20px; /* Large rounded corners for the main container */
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.no-batches-message {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  padding: 50px 0;
}
```

**11. `src/components/MuscatBranchPage.tsx`**
```typescript
// src/components/MuscatBranchPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import BatchList from './BatchList';
import { Batch, DayOfWeek } from '../types';
import '../styles/GlobalStyles.css'; // Import global styles here

const ALL_DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MuscatBranchPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial dummy data
  useEffect(() => {
    const initialBatches: Batch[] = Array.from({ length: 6 }).map((_, index) => ({
      id: `B${String(index + 1).padStart(3, '0')}`,
      name: `Batch ID ${String(index + 1).padStart(3, '0')}`,
      days: ALL_DAYS_OF_WEEK.map((day, dayIndex) => ({
        label: day,
        isActive: dayIndex % 2 === 0, // Example: Mon, Wed, Fri, Sun are active
      })),
    }));
    setBatches(initialBatches);
  }, []);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleAddBatch = () => {
    const newBatchId = `B${String(batches.length + 1).padStart(3, '0')}`;
    const newBatch: Batch = {
      id: newBatchId,
      name: `Batch ID ${newBatchId.slice(1)}`,
      days: ALL_DAYS_OF_WEEK.map((day) => ({ label: day, isActive: false })), // New batch starts with no active days
    };
    setBatches((prevBatches) => [...prevBatches, newBatch]);
  };

  const handleDayToggle = (batchId: string, dayToToggle: DayOfWeek) => {
    setBatches((prevBatches) =>
      prevBatches.map((batch) =>
        batch.id === batchId
          ? {
              ...batch,
              days: batch.days.map((day) =>
                day.label === dayToToggle ? { ...day, isActive: !day.isActive } : day
              ),
            }
          : batch
      )
    );
  };

  const handleBatchClick = (batchId: string) => {
    console.log(`Batch ID clicked: ${batchId}`);
    // In a real application, this would navigate to a batch detail page or open a modal
    alert(`Navigating to details for Batch ID: ${batchId}`);
  };

  const filteredBatches = useMemo(() => {
    if (!searchTerm) {
      return batches;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return batches.filter((batch) =>
      batch.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      batch.id.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [batches, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header
        onSearchChange={handleSearchChange}
        onAddBatch={handleAddBatch}
        branchName="MUSCAT BRANCH"
      />
      {/* 
        Requirement: Calendar (Select a date)
        
        This component is not shown in the provided Figma or image.
        Typically, a date picker would reside here, perhaps alongside the search bar,
        to filter batches by date.

        Example placeholder for future implementation:
        <div style={{ padding: '0 40px', marginTop: '20px', color: 'gray' }}>
          {/* <CalendarDatePicker onDateSelect={(date) => console.log('Selected date:', date)} /> * /}
          <p>Calendar component for date selection would go here (not shown in current design).</p>
        </div>
      */}
      <BatchList
        batches={filteredBatches}
        onDayToggle={handleDayToggle}
        onBatchClick={handleBatchClick}
      />
    </div>
  );
};

export default MuscatBranchPage;
```

**12. `src/App.tsx`**
```typescript
// src/App.tsx
import React from 'react';
import MuscatBranchPage from './components/MuscatBranchPage';

function App() {
  return (
    <div className="App">
      <MuscatBranchPage />
    </div>
  );
}

export default App;
```

**13. `src/index.tsx` (ensure it's rendering `App`)**
```typescript
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
```

---

### To Run the Application:

1.  Navigate to your project directory.
2.  Install dependencies: `npm install` or `yarn install`.
3.  Start the development server: `npm start` or `yarn start`.
4.  Open your browser to `http://localhost:3000` (or the port indicated by your console).

---

### Design Check & Feedback Process:

As a Senior Developer, I would now facilitate the design check process:

1.  **Send out for design check:**
    *   Deploy this code to a staging environment (e.g., using Netlify, Vercel, or a dev server).
    *   Share the live URL and the Figma link with the design team.
    *   Provide clear instructions on what to review (e.g., visual fidelity, responsiveness, interaction feel).
2.  **Get feedback:**
    *   Schedule a review meeting or set up a dedicated communication channel (e.g., Figma comments, Jira, Slack) for collecting detailed feedback from the design team.
    *   Encourage designers to be specific about discrepancies (e.g., "padding needs to be 24px instead of 20px," "font weight on 'Batch ID' looks lighter").
3.  **Implement feedback:**
    *   Prioritize feedback based on severity and impact.
    *   Create tasks/tickets for each item of feedback.
    *   Iteratively adjust the code (CSS, component logic, etc.) to align with the design specifications.
    *   After implementation, repeat the design check for the updated version to ensure all feedback has been addressed correctly.

This setup provides a solid foundation for the Muscat Branch page, ready for further iteration and integration with actual backend data.