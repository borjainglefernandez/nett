---
name: Improve Transaction Table with TanStack Table
overview: ""
todos: []
---

# Improve Transaction Table with TanStack Table

## Overview

Migrate the transaction table from Material-UI DataGrid to TanStack Table (React Table v8) for better performance, flexibility, and visual design. TanStack Table is headless, allowing us to use MUI components for styling while gaining more control over features and customization.

## Current State

- Using `@mui/x-data-grid` for the transaction table
- Features: inline editing, category/subcategory dropdowns, row selection, delete actions
- Styling: Custom MUI Paper with DataGrid styling
- `ag-grid-react` is installed but unused

## Benefits of TanStack Table

- **Performance**: Built-in virtualization for large datasets
- **Flexibility**: Headless design allows full UI control with MUI components
- **Features**: Better filtering, sorting, column management
- **Customization**: Easier to customize cell rendering and interactions
- **Bundle size**: Lighter than AG Grid, similar to MUI DataGrid

## Implementation Plan

### 1. Install Dependencies

- Add `@tanstack/react-table` package
- No need to remove MUI DataGrid initially (can be done later)

### 2. Create New Table Component Structure

- Create `TransactionTableV2.tsx` (or refactor existing)
- Set up TanStack Table with column definitions
- Implement row selection, sorting, and pagination

### 3. Migrate Features

- **Inline editing**: Transaction name editing (keep existing `EditableTransactionNameCell`)
- **Category/Subcategory dropdowns**: Convert to work with TanStack Table cell rendering
- **Row selection**: Implement checkbox selection with TanStack Table
- **Delete actions**: Maintain existing delete functionality
- **Color coding**: Keep amount color logic (red/green based on positive/negative)

### 4. Enhanced Visual Design

- **Better spacing**: More breathing room between rows and columns
- **Improved typography**: Better font weights and sizes
- **Enhanced hover states**: Smoother transitions
- **Better column headers**: More prominent, with sorting indicators
- **Sticky columns**: Keep date/name visible while scrolling
- **Row grouping**: Optional grouping by date or category

### 5. Additional Features

- **Column resizing**: Allow users to resize columns
- **Column visibility**: Toggle columns on/off
- **Advanced filtering**: Filter by amount range, date range, category
- **Export**: CSV export functionality
- **Virtual scrolling**: Better performance with large datasets

### 6. Styling Approach

- Use MUI `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell` components
- Maintain MUI theme consistency
- Add custom styling for better visual hierarchy
- Responsive design for mobile devices

## Files to Modify

1. **`frontend/src/Components/TransactionTable/TransactionTable.tsx`**

- Refactor to use TanStack Table
- Update column definitions
- Migrate all existing features

2. **`frontend/package.json`**

- Add `@tanstack/react-table` dependency

3. **`frontend/src/Components/TransactionTable/TransactionNameCell.tsx`**

- Keep as-is (works with any table framework)

## Migration Strategy

1. Build new component alongside existing one
2. Test all features work correctly
3. Replace old component once verified
4. Remove MUI DataGrid dependency if no longer needed elsewhere

## Testing Considerations

- Update existing tests in `TransactionTable.test.tsx`
- Test row selection, editing, deletion
- Test with large datasets (performance)
- Test responsive behavior