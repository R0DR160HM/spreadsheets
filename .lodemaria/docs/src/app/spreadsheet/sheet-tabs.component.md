# Sheet Tabs Component

The **SheetTabsComponent** in the project is a bottom bar component that provides access to sheet tabs. It includes buttons for renaming, adding, and removing sheets based on their current state.

### Purpose and Functionality

1. **Bottom Bar**: The component displays buttons for each sheet (represented by buttons) and provides options for renaming, adding, or removing sheets.

2. **Active Sheet Management**: The `activeSheetIndex` signal keeps track of the currently active sheet's index, which is used to determine whether rename, add, or remove operations are available.

3. **Rename Button**: Users can select a new name for the selected sheet by typing it in the input field.

4. **Add Button**: The user can add a new sheet by clicking the "Add" button.

5. **Remove Button**: The user can remove a specific sheet by clicking the corresponding button, confirming their action with a message prompt.

6. **Confirmation Dialog**: Before removing a sheet, a confirmation dialog is shown to prevent accidental removal.

### Internal Logic

- **Signal Management**: The `renaming` signal is used to manage changes in active sheet state.
- **Event Handling**: The component listens for the `keydown.enter`, `keydown.escape`, and `blur` events on the rename input field and the "Add" button, respectively. These events trigger the `commitRename` method to update the state of active sheets.

### Notable Internal Logic

1. **Active Sheet Tracking**: The `activeSheetIndex` signal is used to keep track of the index of the currently selected sheet.
2. **Event Listeners**: The component listens for specific keypresses and blur events, updating the state of active sheets.
3. **Confirmation Dialog**: Before removing a sheet, a confirmation dialog is shown to prevent accidental removal.

### Side Effects

- **User Interaction**: Users can interact with the component using keyboard shortcuts and buttons, leading to updates in the state of the application.
- **State Updates**: The `activeSheetIndex` signal ensures that only active sheets can be modified or added.

By providing a simple yet effective way to manage sheet tabs, the **SheetTabsComponent** helps ensure users have a reliable and intuitive interface for interacting with their workbooks.
