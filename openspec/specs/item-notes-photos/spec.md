## ADDED Requirements (v3)

### Requirement: Notes per rack item
Each rack item SHALL support a rich-text notes field for configuration details, troubleshooting info, or reference material. Notes persist with the item and are visible in the detail panel.

#### Scenario: Add wiring notes
- **WHEN** user opens the detail panel for "48-port Patch Panel" and adds notes: "Ports 1-24: Office floor. Ports 25-48: Upstairs. Blue = data, yellow = VoIP"
- **THEN** the notes are saved and displayed when the item is selected

### Requirement: Photo attachments per rack item
Each rack item SHALL support multiple photo attachments. Users can upload images (JPG, PNG, WebP) that are stored alongside the item. Photos are viewable in a gallery within the detail panel.

#### Scenario: Attach wiring photo
- **WHEN** user uploads a photo of the rear wiring on a patch panel
- **THEN** the photo appears in the item's photo gallery with upload timestamp

#### Scenario: Multiple photos
- **WHEN** user attaches 3 photos to a rack item (front view, rear view, label closeup)
- **THEN** all 3 photos are viewable in a scrollable gallery, with the ability to delete individual photos

### Requirement: Photo storage
Photos SHALL be stored on the local filesystem under `STORAGE_DIR/rack-photos/<rackId>/<itemId>/`. Metadata (filename, upload date, size) is tracked in the database. Photos are deleted when the rack item is deleted.
