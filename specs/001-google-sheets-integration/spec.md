# Feature Specification: Google Sheets Rumour Repository

**Feature Branch**: `001-google-sheets-integration`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: User description: "Use Google sheets as the repository for rumours. The google sheets schema is: session_date, game_date, location_heard, location_targetted, X (pixels), Y (pixels), title, rating (out of 10), resolved, details"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Rumours from Google Sheets (Priority: P1)

Users can see rumours loaded from a Google Sheets document displayed on the map. When the application loads, rumours are automatically fetched from the configured Google Sheets source and rendered as markers at their specified pixel coordinates.

**Why this priority**: This is the core functionality that replaces the static PSV file with a dynamic Google Sheets data source. Without this, no other features can function.

**Independent Test**: Can be fully tested by configuring a Google Sheets URL, loading the application, and verifying that markers appear at the correct positions with the correct titles. Delivers immediate value by enabling dynamic rumour management.

**Acceptance Scenarios**:

1. **Given** a Google Sheets document with valid rumour data exists, **When** the user loads the application, **Then** all rumours are fetched and displayed as markers on the map at their specified X,Y coordinates
2. **Given** the Google Sheets data includes title and details fields, **When** markers are rendered, **Then** titles are visible on markers and details are shown on hover
3. **Given** the application is loading data from Google Sheets, **When** the fetch is in progress, **Then** a loading indicator is displayed to the user
4. **Given** the Google Sheets is empty or has no data rows, **When** the application loads, **Then** no markers are displayed and no errors occur

---

### User Story 2 - Filter Rumours by Resolution Status (Priority: P2)

Users can toggle between viewing all rumours, only unresolved rumours, or only resolved rumours. This helps users focus on active rumours versus historical ones.

**Why this priority**: Provides essential filtering capability to manage growing rumour lists. Less critical than basic display but important for usability once data accumulates.

**Independent Test**: Can be tested by adding a filter toggle control, applying it to the rumour list, and verifying that markers appear/disappear based on their resolved field value.

**Acceptance Scenarios**:

1. **Given** the map displays multiple rumours with mixed resolved/unresolved status, **When** the user selects "show unresolved only", **Then** only markers with resolved=false are displayed
2. **Given** a filter is active, **When** the user resets the filter to "show all", **Then** all rumours become visible again
3. **Given** rumours have empty or missing resolved values, **When** filtering is applied, **Then** these rumours are treated as unresolved

---

### User Story 3 - View Rumour Metadata (Priority: P2)

Users can see additional rumour metadata including session date, game date, locations (heard and targetted), and rating when viewing rumour details.

**Why this priority**: Enhances rumour information richness without being critical to core functionality. Users can still use the map effectively with just title and details.

**Independent Test**: Can be tested by hovering or clicking on a rumour marker and verifying that all metadata fields are displayed in a readable format.

**Acceptance Scenarios**:

1. **Given** a rumour has session_date and game_date values, **When** the user views the rumour details, **Then** both dates are displayed in a readable format
2. **Given** a rumour has location_heard and location_targetted values, **When** the user views details, **Then** both locations are clearly labeled and displayed
3. **Given** a rumour has a rating value, **When** displayed, **Then** the rating is shown as "X/10" or similar clear format
4. **Given** any metadata field is empty or null, **When** displayed, **Then** that field is either hidden or shows "Not specified"

---

### User Story 4 - Refresh Data from Google Sheets (Priority: P3)

Users can manually refresh the rumour data to see updates made to the Google Sheets document without reloading the entire application.

**Why this priority**: Nice-to-have convenience feature that improves workflow but isn't critical for initial deployment. Users can always refresh the browser as a workaround.

**Independent Test**: Can be tested by modifying Google Sheets data, clicking a refresh button in the app, and verifying that new/updated rumours appear without a full page reload.

**Acceptance Scenarios**:

1. **Given** the application has loaded rumours, **When** the user clicks a refresh button, **Then** data is re-fetched from Google Sheets and markers are updated
2. **Given** new rumours were added to Google Sheets, **When** refresh occurs, **Then** new markers appear on the map
3. **Given** rumours were modified in Google Sheets, **When** refresh occurs, **Then** existing markers update to reflect new data
4. **Given** a refresh is in progress, **When** the user waits, **Then** a loading indicator shows refresh status

---

### Edge Cases

- What happens when Google Sheets is unreachable or returns an error (network failure, permissions issue)?
- How does the system handle malformed data (non-numeric X/Y coordinates, missing required fields)?
- What happens when X or Y coordinates are outside the valid map bounds (negative values, or values exceeding map dimensions)?
- How does the system handle special characters in text fields (pipes, quotes, newlines)?
- What happens when a required field (title, X, Y) is empty or null?
- How does the system handle very large datasets (>1000 rumours) from Google Sheets?
- What happens when the Google Sheets URL is not configured or invalid?
- How does the system handle date fields with invalid or varied formats?
- What happens when rating values are outside 0-10 range or non-numeric?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch rumour data from a configured Google Sheets document URL
- **FR-002**: System MUST parse Google Sheets data with the following schema: session_date, game_date, location_heard, location_targetted, X, Y, title, rating, resolved, details
- **FR-003**: System MUST display rumours as map markers positioned at their X,Y pixel coordinates
- **FR-004**: System MUST display rumour title on the marker and full details on hover/click
- **FR-005**: System MUST show a loading state while fetching data from Google Sheets
- **FR-006**: System MUST handle fetch errors gracefully with user-friendly error messages (e.g., "Unable to load rumours. Please check connection and try again.")
- **FR-007**: System MUST validate that X and Y coordinates are numeric and within valid map bounds (0-6500 for X, 0-3600 for Y based on existing RUMOURS_SPECIFICATION.md)
- **FR-008**: System MUST treat rumours with invalid or missing required fields (title, X, Y) as errors and skip them with console warnings
- **FR-009**: System MUST allow users to filter rumours by resolved status (all, resolved only, unresolved only)
- **FR-010**: System MUST display rumour metadata including session_date, game_date, location_heard, location_targetted, and rating when viewing details
- **FR-011**: System MUST format rating values as "X/10" where X is the numeric rating value
- **FR-012**: System MUST handle empty or null metadata fields gracefully (hide field or show "Not specified")
- **FR-013**: System MUST provide a manual refresh mechanism to re-fetch data from Google Sheets without full page reload
- **FR-014**: System MUST maintain consistent marker appearance and behavior as specified in RUMOURS_SPECIFICATION.md
- **FR-015**: System MUST support OAuth2 authentication where users sign in with their Google account to access Google Sheets data
- **FR-016**: System MUST implement OAuth2 authorization flow to obtain user consent for read-only access to their Google Sheets
- **FR-017**: System MUST handle OAuth2 authentication failures gracefully with clear instructions for users to sign in or grant permissions
- **FR-018**: System MUST only request read-only permissions scope for Google Sheets API access

### Key Entities *(include if feature involves data)*

- **Rumour**: Represents a single rumour entry with geographic location, temporal context, and resolution status
  - Attributes: session_date (when rumour was recorded), game_date (in-game date), location_heard (where rumour was heard), location_targetted (location rumour is about), X (pixel coordinate), Y (pixel coordinate), title (summary), rating (1-10 score), resolved (boolean status), details (full description)
  - Relationships: Multiple rumours can target the same location; rumours are associated with specific game sessions

- **Google Sheets Data Source**: External data repository containing rumour records
  - Attributes: spreadsheet URL/ID, sheet name, data range
  - Relationships: Single source of truth for all rumour data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view rumours loaded from Google Sheets within 3 seconds of application load (assuming typical network conditions)
- **SC-002**: System successfully fetches and displays 100% of valid rumours from Google Sheets (rumours with all required fields)
- **SC-003**: Users can apply filters and see results update on screen within 500 milliseconds
- **SC-004**: System handles up to 500 rumours from Google Sheets without performance degradation (maintains 60fps interaction per constitution)
- **SC-005**: Users can identify resolved vs unresolved rumours through filtering with 100% accuracy
- **SC-006**: Manual refresh completes and updates display within 2 seconds
- **SC-007**: Error scenarios display user-friendly messages within 1 second of detection
- **SC-008**: All rumour metadata fields (dates, locations, rating) are displayed correctly for 100% of rumours that include those fields

## Assumptions *(mandatory)*

1. **Google Sheets Access**: Google Sheets will be accessed using OAuth2 authentication where users sign in with their Google account. Users must have read access to the configured Google Sheets document. Standard web-based Google Sheets API will be used.

2. **Data Format**: Assuming Google Sheets has a header row with column names matching the specified schema (session_date, game_date, location_heard, location_targetted, X, Y, title, rating, resolved, details) and data starts from row 2.

3. **Date Format**: Assuming dates in session_date and game_date fields follow standard formats (ISO 8601 or common regional formats) that can be parsed by standard date parsing functions.

4. **Boolean Representation**: Assuming the resolved field uses common boolean representations (TRUE/FALSE, true/false, 1/0, yes/no) that can be normalized to boolean values.

5. **Rating Range**: Assuming rating values are intended to be 0-10 inclusive. Values outside this range will be clamped or flagged as invalid.

6. **Map Dimensions**: Assuming map dimensions remain 6500x3600 pixels as specified in RUMOURS_SPECIFICATION.md. X/Y coordinates outside these bounds will be rejected.

7. **Update Frequency**: Assuming manual refresh is sufficient; real-time synchronization with Google Sheets is not required for this feature.

8. **Single Sheet**: Assuming data comes from a single sheet within the Google Sheets document, not multiple sheets that need to be merged.

9. **Character Encoding**: Assuming UTF-8 encoding for all text fields in Google Sheets.

10. **Network Availability**: Assuming users have active internet connection; offline functionality is not required.

11. **OAuth2 Configuration**: Assuming OAuth2 client ID and configuration details will be provided at deployment time and configured in the application settings.

12. **User Permissions**: Assuming users have the necessary Google account permissions to access the configured Google Sheets document. Users without access will receive appropriate error messages.

## Dependencies *(mandatory)*

### External Dependencies

- **Google Sheets API**: Requires access to Google Sheets API or ability to export/fetch sheet data in a parseable format (CSV, JSON)
- **Network Connectivity**: Application requires internet connection to fetch data from Google Sheets

### Internal Dependencies

- **Existing Map System**: Relies on existing PanZoomMap.vue component and coordinate system (6500x3600 pixel map)
- **Existing Marker Components**: May reuse or adapt existing RumourMarker.vue component structure from RUMOURS_SPECIFICATION.md
- **Existing Composables**: Will integrate with or replace existing useRumours.ts composable that currently loads PSV data

## Non-Goals *(optional)*

This feature explicitly does NOT include:

- **Write-back to Google Sheets**: Users cannot modify rumour data through the application (no CRUD operations beyond Read)
- **Real-time sync**: Changes in Google Sheets do not automatically appear in the application without manual refresh
- **Multi-user collaboration**: No awareness of other users viewing or filtering the same data
- **Offline support**: Application cannot display rumours without internet connection
- **Data validation in Google Sheets**: Does not enforce or validate data quality within Google Sheets itself
- **Version history**: Does not track or display historical changes to rumours
- **Export functionality**: Does not provide ability to export filtered or viewed rumours to other formats
- **Custom sheet configuration UI**: Google Sheets URL/credentials are configured at deployment, not changeable by end users through UI

## Out of Scope *(optional)*

Future enhancements that are intentionally deferred:

- **Advanced filtering**: By date range, location, rating threshold, or keyword search
- **Rumour editing**: Inline editing of rumour properties through the application
- **Batch operations**: Marking multiple rumours as resolved simultaneously
- **Rumour creation**: Adding new rumours through the application interface
- **Map annotation**: Drawing or marking areas on the map associated with rumours
- **Rumour relationships**: Linking related rumours or showing rumour threads
- **Statistical dashboard**: Analytics showing rumour trends, heat maps, or distribution
- **Mobile app**: Native mobile application separate from web interface
- **User accounts**: Personal filters, saved views, or customization per user
- **Notifications**: Alerts for new rumours or changes to existing ones
