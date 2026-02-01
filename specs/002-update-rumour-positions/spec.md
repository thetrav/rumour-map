# Feature Specification: Update Rumour Positions to Google Sheets

**Feature Branch**: `002-update-rumour-positions`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: User description: "Extend the Google integration (001-google-sheets-integration) to allow for rumour values in the spreadsheet to be updated. To begin with, only X, Y values are able to be updated, based on where the individual rumours have been moved to. Updates are provided by a button (\"push updates\")."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Push Position Updates to Google Sheets (Priority: P1)

Users can update rumour positions on the map by dragging markers to new locations, then click a "Push Updates" button to save the new X,Y coordinates back to the Google Sheets document. This enables users to organize and reposition rumours directly from the map interface.

**Why this priority**: This is the core functionality that enables bidirectional synchronization between the map and Google Sheets. It delivers immediate value by allowing users to visually organize rumours without manually editing spreadsheet cells.

**Independent Test**: Can be fully tested by dragging a rumour marker to a new position on the map, clicking the "Push Updates" button, and verifying that the X,Y values in the Google Sheets document are updated to match the new pixel coordinates.

**Acceptance Scenarios**:

1. **Given** a rumour marker is displayed on the map, **When** the user drags it to a new position and clicks "Push Updates", **Then** the X and Y coordinate values for that rumour are updated in Google Sheets to reflect the new pixel position
2. **Given** multiple rumours have been moved to new positions, **When** the user clicks "Push Updates", **Then** all modified rumours' X,Y values are updated in Google Sheets in a single batch operation
3. **Given** the user has moved rumours, **When** the "Push Updates" operation completes successfully, **Then** a confirmation message is displayed (e.g., "3 rumour positions updated successfully")
4. **Given** no rumours have been moved since the last update, **When** the user clicks "Push Updates", **Then** a message indicates no changes need to be saved (e.g., "No position changes to update")

---

### User Story 2 - Track Local Changes Before Push (Priority: P2)

Users can see which rumours have been moved locally but not yet pushed to Google Sheets. This provides visual feedback about pending changes and helps users understand the state of their data.

**Why this priority**: Improves user experience by making the sync state transparent. Less critical than the core push functionality but important for avoiding user confusion about whether changes are saved.

**Independent Test**: Can be tested by moving a rumour marker and verifying that it displays a visual indicator (e.g., different color, icon, or border) showing it has unpushed changes, which disappears after clicking "Push Updates".

**Acceptance Scenarios**:

1. **Given** a rumour marker is moved to a new position, **When** the move completes, **Then** the marker displays a visual indicator showing it has unpushed changes
2. **Given** multiple rumours have been moved, **When** viewing the map, **Then** all moved rumours show the pending change indicator
3. **Given** rumours have pending changes, **When** "Push Updates" completes successfully, **Then** the visual indicators are removed from all updated rumours
4. **Given** rumours have pending changes, **When** data is refreshed from Google Sheets, **Then** the user is warned that local changes will be lost and asked to confirm

---

### User Story 3 - Handle Update Conflicts and Errors (Priority: P2)

Users receive clear feedback when position updates fail due to network issues, permission errors, or conflicts with concurrent edits to the Google Sheets document.

**Why this priority**: Essential for robust error handling and preventing data loss. Equally important as tracking changes to ensure users trust the system.

**Independent Test**: Can be tested by simulating network failure, permission denial, or concurrent edits during push operation and verifying that appropriate error messages are displayed and local changes are preserved.

**Acceptance Scenarios**:

1. **Given** the user clicks "Push Updates", **When** the network is unavailable or Google Sheets API returns an error, **Then** an error message is displayed and pending changes are retained locally for retry
2. **Given** the Google Sheets document was modified by another user since last fetch, **When** "Push Updates" is clicked, **Then** the user is notified of potential conflicts and offered options to refresh, overwrite, or cancel
3. **Given** the user lacks write permissions to the Google Sheets document, **When** "Push Updates" is clicked, **Then** a clear error message explains the permission issue
4. **Given** a push operation is in progress, **When** the user waits, **Then** a loading indicator shows update status and disables the "Push Updates" button to prevent duplicate requests

---

### Edge Cases

- What happens when a user drags a rumour outside the valid map bounds before pushing updates?
- How does the system handle pushing updates when the Google Sheets row for a rumour has been deleted by another user?
- What happens when the Google Sheets document is temporarily locked for editing by another process?
- How does the system handle rumours that have been moved multiple times before a single push?
- What happens when only some rumours in a batch update succeed while others fail?
- How does the system handle very large batches of position updates (e.g., 100+ moved rumours)?
- What happens when a rumour's identifier (row) cannot be matched between local state and Google Sheets?
- How does the system handle updates when the Google Sheets schema has been modified (columns added/removed/reordered)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to drag rumour markers to new positions on the map
- **FR-002**: System MUST track which rumours have had their positions changed locally but not yet pushed to Google Sheets
- **FR-003**: System MUST provide a "Push Updates" button that is visible and accessible to users
- **FR-004**: System MUST send position updates (X,Y coordinates) to Google Sheets when "Push Updates" is clicked
- **FR-005**: System MUST update only the X and Y columns in Google Sheets for modified rumours, leaving all other fields unchanged
- **FR-006**: System MUST identify the correct row in Google Sheets for each rumour being updated using a unique identifier (assume row number or unique title for initial implementation)
- **FR-007**: System MUST display a loading indicator during the push operation
- **FR-008**: System MUST display success confirmation when updates complete successfully, indicating the number of rumours updated
- **FR-009**: System MUST display error messages when updates fail, with specific details about the failure type (network, permissions, etc.)
- **FR-010**: System MUST preserve pending local changes when push operations fail, allowing users to retry
- **FR-011**: System MUST validate that updated X,Y coordinates are within valid map bounds (0-6500 for X, 0-3600 for Y) before pushing to Google Sheets
- **FR-012**: System MUST clear the pending changes state for successfully updated rumours after push completes
- **FR-013**: System MUST disable the "Push Updates" button during push operations to prevent concurrent requests
- **FR-014**: System MUST require Google authentication with write permissions to the Google Sheets document before allowing push updates

### Key Entities

- **Rumour Position Update**: Represents a change to a rumour's X,Y coordinates, including the rumour identifier, old coordinates, new coordinates, and timestamp of change
- **Update Batch**: Collection of rumour position updates to be pushed to Google Sheets in a single operation
- **Sync State**: Tracks whether each rumour has pending local changes, is in sync with Google Sheets, or has update errors

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can reposition a rumour and save the change to Google Sheets in under 10 seconds (including network latency)
- **SC-002**: System successfully updates rumour positions in Google Sheets with 99% success rate under normal network conditions
- **SC-003**: Users can visually identify which rumours have unpushed changes within 1 second of moving a marker
- **SC-004**: System handles batches of up to 50 rumour position updates in a single push operation without errors
- **SC-005**: Error messages are clear enough that 90% of users can understand the issue and take corrective action without external help
- **SC-006**: Zero data loss occurs when push operations fail (all pending changes are preserved for retry)

## Assumptions *(optional)*

- Users have already authenticated with Google and have write permissions to the Google Sheets document (authentication implemented in 001-google-sheets-integration)
- The Google Sheets document schema matches the expected format defined in 001-google-sheets-integration
- Each rumour can be uniquely identified to match local state with Google Sheets rows (initially using title as unique identifier, or row number if stored during fetch)
- The Google Sheets API supports batch updates for multiple cells/rows in a single request
- Network latency for Google Sheets API requests is typically under 2 seconds
- Users will primarily move a small number of rumours (1-10) before pushing updates, not bulk repositioning of hundreds

## Dependencies *(optional)*

- **001-google-sheets-integration**: This feature extends the existing Google Sheets integration and requires the read functionality to be fully implemented
- Google Sheets API write access must be enabled and authenticated
- Rumour drag functionality must be working (likely already implemented based on existing codebase references to useRumourDrag.js)

## Out of Scope *(optional)*

- Updating fields other than X,Y coordinates (title, details, rating, etc.)
- Real-time synchronization or automatic push of changes
- Conflict resolution UI for concurrent edits (initial version will show error and require manual resolution)
- Undo/redo functionality for position changes
- Offline support or queueing updates when network is unavailable
- Bulk repositioning tools (e.g., "align all rumours in a grid")
- History/audit log of position changes
- Push updates for newly created or deleted rumours (only position updates for existing rumours)
