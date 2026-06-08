# Google Stitch MCP Agent Guidelines

This project utilizes the Google Stitch MCP server to turn UI/UX designs into programmable infrastructure and functional frontend code. 

## Available Stitch Tools & Capabilities
The AI agent can invoke the following native MCP tool functions automatically based on prompt intent:

### 1. Project Management
* `list_projects` — Retrieves a list of all active projects in the connected Google Stitch workspace.
* `get_project_details` — Fetches metadata, frameworks, and settings for a specific project ID.
* `create_project` — Spins up a new design project environment directly from the IDE.

### 2. Screen & Canvas Management
* `list_screens` — Lists all design screens, artboards, and user flow states inside a project.
* `get_screen` — Fetches the visual asset, layout, layout bounding boxes, and underlying metadata for a single specific screen.

### 3. Design Generation & Conversion (Powered by Gemini)
* `generate_screen` — Generates brand new UI screens or user interfaces completely from text prompts using context-aware models.
* `export_design_dna` — Pulls raw HTML, CSS, component styling, or Tailwind configurations directly out of an active Stitch design frame.

