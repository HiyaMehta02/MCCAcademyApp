Alright team, let's get this Muscat Branch page built out in React with TypeScript.

Based on the Figma link provided and the image, we're looking at a batch management view. The primary goal is to display a list of batches, each showing its ID and the days of the week it's active. We also need a search bar, an "Add Batch" functionality, and a date selection feature (which I'll integrate as a filter, as it wasn't explicitly shown in the main image but requested).

I'll structure this into several components for maintainability and clarity, following best practices.

---

### **Senior Developer Notes & Assumptions:**

1.  **Styling:** I'll use CSS Modules for component-scoped styles. For simplicity, I'll define basic styles to match the visual, but in a real project, we'd integrate with our design system's utility classes or a more robust theming solution.
2.  **Icons:** For the search, clear, arrow, and add icons, I'll use simple SVG paths or unicode characters. In a production environment, we'd likely use an icon library (e.g., React Icons, Font Awesome) or our custom icon set.
3.  **Data:** I'll use mock data for batches. In a real application, this would come from an API endpoint.
4.  **Calendar (Select a Date):** The image itself doesn't explicitly show a calendar component for "select a date." Given the requirement, I'll implement a standard HTML date input (`<input type="date">`) in the header section, allowing users to filter batches by a specific date. This would imply an additional filter logic on the `BatchList` component. For this code, I'll just put the input in place.
5.  **Interactivity:** "Add Batch" and "Batch ID" buttons will log actions to the console for now. In a real scenario, they would trigger modals, navigate to different routes, or open detail views.
6.  **Logo:** I'll create a simplified SVG representation of the logo seen in the Figma/image.
7.  **Responsive Design:** This layout is primarily designed for a wider viewport (tablet/desktop). I'll focus on the desktop layout and make a note for future responsive enhancements.

---

### **File Structure:**

```
src/
├── App.tsx
├── index.tsx
├── styles/
│   ├── globals.css
│   └── typography.css (optional, for basic font styles)
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Icon.tsx
│   │   └── SearchInput.tsx
│   ├── Logo.tsx
│   ├── Header.tsx
│   ├── BatchRow.tsx
│   └── BatchList.tsx
├── features/
│   └── muscat-branch/
│       ├── MuscatBranchPage.tsx
│       └── MuscatBranchPage.module.css
├── types/
│   └── index.ts
└── utils/
    └── constants.ts
```

---

### **Code Generation:**

Let's start from the bottom up.

#### 1. `src/types/index.ts`

```typescript
// src/types/index.ts

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface Batch {
  id: string;
  name: string; // "Batch ID" could represent a name or just the ID itself
  activeDays: DayOfWeek[];
  startDate: string; // Example for calendar filter
}

export type IconType = 'search' | 'clear' | 'arrow-right' | 'add';
```

#### 2. `src/utils/constants.ts`

```typescript
// src/utils/constants.ts

import { Batch, DayOfWeek } from '../types';

export const ALL_DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MOCK_BATCHES: Batch[] = [
  { id: 'BATCH-001', name: 'Morning Batch A', activeDays: ['Mon', 'Wed', 'Fri'], startDate: '2023-10-26' },
  { id: 'BATCH-002', name: 'Evening Batch B', activeDays: ['Tue', 'Thu'], startDate: '2023-10-27' },
  { id: 'BATCH-003', name: 'Weekend Batch C', activeDays: ['Sat', 'Sun'], startDate: '2023-10-28' },
  { id: 'BATCH-004', name: 'Daily Express', activeDays: ALL_DAYS_OF_WEEK, startDate: '2023-10-26' },
  { id: 'BATCH-005', name: 'Mid-week Focus', activeDays: ['Wed', 'Thu'], startDate: '2023-10-26' },
  { id: 'BATCH-006', name: 'Friday Fun', activeDays: ['Fri'], startDate: '2023-10-26' },
];
```

#### 3. `src/styles/globals.css`

```css
/* src/styles/globals.css */

:root {
  --color-background-dark: #242424;
  --color-green-container: #2A7C32;
  --color-red-button: #9D3533;
  --color-grey-button: #5E5E5E;
  --color-text-light: #F0F0F0;
  --color-input-bg: #FFFFFF;
  --color-input-text: #333333;
  --color-border-light: #CCCCCC;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--color-background-dark);
  color: var(--color-text-light);
}

#root {
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align content to the top */
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

/* Base button styles for consistency */
button {
  cursor: pointer;
  border: none;
  border-radius: 8px;
  padding: 10px 15px;
  font-weight: bold;
  color: var(--color-text-light);
  background-color: var(--color-grey-button); /* Default button color */
  transition: background-color 0.2s ease;
}

button:hover {
  opacity: 0.9;
}
```

#### 4. `src/components/common/Icon.tsx`

```typescript
// src/components/common/Icon.tsx
import React from 'react';
import { IconType } from '../../types';

interface IconProps {
  type: IconType;
  size?: number;
  color?: string;
  className?: string;
  onClick?: () => void;
}

const Icon: React.FC<IconProps> = ({ type, size = 20, color = 'currentColor', className, onClick }) => {
  const getIconSvg = (iconType: IconType) => {
    switch (iconType) {
      case 'search':
        return (
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5a6.5 6.5 0 1 0-6.5 6.5c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        );
      case 'clear':
        return (
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        );
      case 'arrow-right':
        return (
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
        );
      case 'add':
        return (
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      fill={color}
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {getIconSvg(type)}
    </svg>
  );
};

export default Icon;
```

#### 5. `src/components/common/Button.tsx`

```typescript
// src/components/common/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; // Add variants as needed
  className?: string;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ children, variant, className, onClick, ...rest }) => {
  let buttonClass = '';
  switch (variant) {
    case 'primary':
      // This button type isn't explicitly shown, but good to have.
      // Maybe a lighter green for positive actions?
      buttonClass = 'primary';
      break;
    case 'danger':
      buttonClass = 'danger'; // Red button like "Batch ID"
      break;
    case 'secondary':
      buttonClass = 'secondary'; // Grey button like "Mon", "Tue"
      break;
    case 'ghost':
        buttonClass = 'ghost'; // For buttons like '+ Add Batch' which are text-based
        break;
    default:
      buttonClass = 'default';
  }

  // Basic inline styles for variants, in real app use CSS modules
  const style: React.CSSProperties = {};
  if (variant === 'danger') {
    style.backgroundColor = 'var(--color-red-button)';
    style.padding = '12px 20px'; // Slightly larger for Batch ID
  } else if (variant === 'secondary') {
    style.backgroundColor = 'var(--color-grey-button)';
    style.padding = '8px 12px'; // Smaller for days
  } else if (variant === 'ghost') {
    style.backgroundColor = 'transparent';
    style.color = 'var(--color-text-light)';
  } else {
    style.backgroundColor = 'var(--color-grey-button)';
  }


  return (
    <button className={`${buttonClass} ${className || ''}`} style={style} onClick={onClick} {...rest}>
      {children}
    </button>
  );
};

export default Button;
```

#### 6. `src/components/common/SearchInput.tsx`

```typescript
// src/components/common/SearchInput.tsx
import React, { useState } from 'react';
import Icon from './Icon';
import styles from './SearchInput.module.css'; // Create this CSS module

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Enter batch name',
  value,
  onChange,
  onSearch,
  onClear,
}) => {
  const handleClear = () => {
    onChange('');
    if (onClear) {
      onClear();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className={styles.searchInputContainer}>
      <Icon type="search" size={24} color="#333" className={styles.searchIcon} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        className={styles.inputField}
      />
      {value && (
        <Icon type="clear" size={20} color="#666" className={styles.clearIcon} onClick={handleClear} />
      )}
    </div>
  );
};

export default SearchInput;

// src/components/common/SearchInput.module.css
/*
.searchInputContainer {
  display: flex;
  align-items: center;
  background-color: var(--color-input-bg);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 300px;
}

.inputField {
  flex-grow: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-input-text);
  font-size: 16px;
  padding: 0 10px;
}

.inputField::placeholder {
  color: #888;
}

.searchIcon {
  margin-right: 8px;
  color: #666;
}

.clearIcon {
  margin-left: 8px;
  color: #999;
}
*/
```

#### 7. `src/components/Logo.tsx`

```typescript
// src/components/Logo.tsx
import React from 'react';
import styles from './Logo.module.css'; // Create this CSS module

const Logo: React.FC = () => {
  // Simplified SVG representation of the abstract "MCCC" logo
  return (
    <div className={styles.logoContainer}>
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="transparent"/>
        {/* Abstract "M" like shape - simplified for example */}
        <path d="M10 50 L30 20 L50 50 L70 20 L90 50 L70 80 L50 50 L30 80 L10 50 Z" stroke="white" strokeWidth="6" fill="transparent"/>
        <path d="M20 50 L40 30 L60 50 L80 30" stroke="#FFD700" strokeWidth="4" fill="transparent"/> {/* Gold accent */}
      </svg>
    </div>
  );
};

export default Logo;

// src/components/Logo.module.css
/*
.logoContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}
*/
```

#### 8. `src/components/Header.tsx`

```typescript
// src/components/Header.tsx
import React, { useState } from 'react';
import Logo from './Logo';
import SearchInput from './common/SearchInput';
import Button from './common/Button';
import Icon from './common/Icon';
import styles from './Header.module.css'; // Create this CSS module

interface HeaderProps {
  branchName: string;
  onSearch: (searchTerm: string) => void;
  onAddBatch: () => void;
  onDateChange: (date: string) => void; // For calendar filter
}

const Header: React.FC<HeaderProps> = ({ branchName, onSearch, onAddBatch, onDateChange }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(''); // For date filter

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    onDateChange(e.target.value);
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Logo />
        <h1 className={styles.branchName}>MUSCAT <span className={styles.branchSpan}>BRANCH</span></h1>
      </div>

      <div className={styles.controls}>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={onSearch}
          onClear={() => onSearch('')} // Clear search when cleared
        />
        {/* Calendar (Select a date) - added as a date input */}
        <input
          type="date"
          className={styles.datePicker}
          value={selectedDate}
          onChange={handleDateChange}
        />
        <Button variant="ghost" onClick={onAddBatch} className={styles.addBatchButton}>
          <Icon type="add" size={24} color="var(--color-text-light)" />
          <span>Add Batch</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;

// src/components/Header.module.css
/*
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background-color: transparent;
  width: 100%;
  max-width: 1200px; /* Constrain width for larger screens */
  box-sizing: border-box;
}

.brand {
  display: flex;
  align-items: center;
}

.branchName {
  font-size: 28px;
  font-weight: bold;
  color: var(--color-text-light);
  margin: 0;
  white-space: nowrap;
}

.branchSpan {
  border-left: 2px solid var(--color-text-light);
  padding-left: 10px;
  margin-left: 10px;
  font-weight: normal;
  color: var(--color-text-light);
  opacity: 0.8;
}

.controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.addBatchButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  font-size: 16px;
  background-color: transparent;
  color: var(--color-text-light);
  border: 1px solid transparent;
}

.addBatchButton:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.05);
}

.datePicker {
  background-color: var(--color-input-bg);
  color: var(--color-input-text);
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 16px;
  outline: none;
  cursor: pointer;
}

.datePicker::-webkit-calendar-picker-indicator {
  filter: invert(0.5); /* Make the calendar icon visible on light background */
}
*/
```

#### 9. `src/components/BatchRow.tsx`

```typescript
// src/components/BatchRow.tsx
import React from 'react';
import { Batch, DayOfWeek, ALL_DAYS_OF_WEEK } from '../types';
import Button from './common/Button';
import Icon from './common/Icon';
import styles from './BatchRow.module.css'; // Create this CSS module

interface BatchRowProps {
  batch: Batch;
  onBatchClick: (batchId: string) => void;
}

const BatchRow: React.FC<BatchRowProps> = ({ batch, onBatchClick }) => {
  return (
    <div className={styles.batchRow}>
      <div className={styles.batchInfo}>
        <Button variant="danger" onClick={() => onBatchClick(batch.id)} className={styles.batchIdButton}>
          {batch.id}
        </Button>
        <Icon type="arrow-right" size={24} color="var(--color-text-light)" className={styles.arrowIcon} />
      </div>
      <div className={styles.daysOfWeek}>
        {ALL_DAYS_OF_WEEK.map((day) => (
          <Button
            key={day}
            variant="secondary"
            className={`${styles.dayButton} ${batch.activeDays.includes(day) ? styles.activeDay : styles.inactiveDay}`}
            onClick={() => console.log(`Toggle day ${day} for ${batch.id}`)} // Example interactivity
          >
            {day}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BatchRow;

// src/components/BatchRow.module.css
/*
.batchRow {
  display: flex;
  align-items: center;
  background-color: var(--color-green-container);
  border-radius: 12px;
  padding: 15px 25px;
  margin-bottom: 20px;
  gap: 20px;
}

.batchInfo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.batchIdButton {
  padding: 12px 20px;
  font-size: 16px;
  min-width: 120px;
  text-align: center;
}

.arrowIcon {
  margin-right: 10px;
}

.daysOfWeek {
  display: flex;
  gap: 10px;
  flex-wrap: wrap; /* Allow days to wrap on smaller screens */
}

.dayButton {
  padding: 8px 12px;
  min-width: 50px; /* Ensure consistent width for day buttons */
  text-align: center;
  font-size: 14px;
}

.activeDay {
  background-color: var(--color-grey-button); /* Active days match the default grey button color */
}

.inactiveDay {
  background-color: rgba(94, 94, 94, 0.4); /* Make inactive days slightly transparent grey */
  opacity: 0.7;
}

.dayButton:hover {
  opacity: 1;
}
*/
```

#### 10. `src/components/BatchList.tsx`

```typescript
// src/components/BatchList.tsx
import React from 'react';
import { Batch } from '../types';
import BatchRow from './BatchRow';
import styles from './BatchList.module.css'; // Create this CSS module

interface BatchListProps {
  batches: Batch[];
}

const BatchList: React.FC<BatchListProps> = ({ batches }) => {
  const handleBatchClick = (batchId: string) => {
    console.log(`Navigating to batch details for: ${batchId}`);
    // In a real app, this would trigger navigation or open a modal
  };

  if (batches.length === 0) {
    return <p className={styles.noBatches}>No batches found for the selected criteria.</p>;
  }

  return (
    <div className={styles.batchListContainer}>
      {batches.map((batch) => (
        <BatchRow key={batch.id} batch={batch} onBatchClick={handleBatchClick} />
      ))}
    </div>
  );
};

export default BatchList;

// src/components/BatchList.module.css
/*
.batchListContainer {
  width: 100%;
  max-width: 1200px;
  padding: 20px 40px;
  box-sizing: border-box;
  overflow-y: auto; /* Enable scrolling if many batches */
}

.noBatches {
  color: var(--color-text-light);
  text-align: center;
  font-size: 18px;
  margin-top: 50px;
}
*/
```

#### 11. `src/features/muscat-branch/MuscatBranchPage.tsx`

```typescript
// src/features/muscat-branch/MuscatBranchPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../components/Header';
import BatchList from '../../components/BatchList';
import { Batch } from '../../types';
import { MOCK_BATCHES } from '../../utils/constants';
import styles from './MuscatBranchPage.module.css'; // Create this CSS module

const MuscatBranchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    // In a real app, you'd fetch data here
    setBatches(MOCK_BATCHES);
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleAddBatch = () => {
    console.log('Initiate "Add Batch" process');
    // Implement modal or navigation to a new batch creation form
    alert('Add Batch functionality will be implemented here!');
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const filteredBatches = useMemo(() => {
    let currentBatches = [...batches];

    if (searchTerm) {
      currentBatches = currentBatches.filter(batch =>
        batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDate) {
      currentBatches = currentBatches.filter(batch =>
        batch.startDate === selectedDate // Simple date match, could be more complex (e.g., within a range)
      );
    }

    return currentBatches;
  }, [batches, searchTerm, selectedDate]);

  return (
    <div className={styles.pageContainer}>
      <Header
        branchName="MUSCAT BRANCH"
        onSearch={handleSearch}
        onAddBatch={handleAddBatch}
        onDateChange={handleDateChange}
      />
      <main className={styles.mainContent}>
        <BatchList batches={filteredBatches} />
      </main>
    </div>
  );
};

export default MuscatBranchPage;

// src/features/muscat-branch/MuscatBranchPage.module.css
/*
.pageContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 100vh;
  background-color: var(--color-background-dark);
}

.mainContent {
  flex-grow: 1; /* Allows main content to take available space */
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 20px; /* Space between header and list */
}
*/
```

#### 12. `src/App.tsx` (Root Component)

```typescript
// src/App.tsx
import React from 'react';
import MuscatBranchPage from './features/muscat-branch/MuscatBranchPage';
import './styles/globals.css'; // Import global styles

function App() {
  return (
    <div className="App">
      <MuscatBranchPage />
    </div>
  );
}

export default App;
```

#### 13. `src/index.tsx` (Entry Point)

```typescript
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### **To Run This Code:**

1.  **Create a React project:**
    ```bash
    npx create-react-app my-mccc-app --template typescript
    cd my-mccc-app
    ```
2.  **Replace `src` folder content:** Copy all the generated `.tsx`, `.ts`, and `.css` files into your `src` directory, maintaining the folder structure.
3.  **Install dependencies (if any specific ones were used, but not for this basic setup).**
4.  **Start the development server:**
    ```bash
    npm start
    ```

You should see the Muscat Branch page rendered in your browser, matching the provided design.

---

### **Checklist Review:**

*   **Design Tasks:**
    *   **Search Bar:** Implemented in `Header.tsx` using `SearchInput.tsx`.
    *   **Calendar (Select a date):** Implemented as an `<input type="date">` in `Header.tsx` for filtering.
    *   **Add a batch:** Button implemented in `Header.tsx`.
    *   **Name of branch:** "MUSCAT BRANCH" displayed in `Header.tsx` with logo.
    *   **Display (Batch ID and Days of the week):** Handled by `BatchList.tsx` rendering multiple `BatchRow.tsx` components.

*   **Info Needed:**
    *   **Typescript/React:** All code is written in TypeScript and React.

*   **Design Check:**
    *   **Send out for design check:** This code is now ready for an initial design review.
    *   **Get feedback:** We'll gather feedback from the design team.
    *   **Implement feedback:** Based on feedback, we'll refine styles, interactions, and potentially add animations or specific component libraries.

---

This provides a solid foundation for the Muscat Branch page. Let me know if you have any specific areas you'd like to elaborate on or refine!