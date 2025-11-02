# Pathology Image Annotation Feature

## Overview

This feature enables the Nexent platform's intelligent agent to display medical pathology images with interactive anatomical annotations during chat conversations. When users ask about pathological features or anatomical structures, the agent can automatically retrieve and display relevant images with clickable anatomical terms that highlight specific regions.

## Features

### 1. Interactive Pathology Viewer
- **Image Display**: Shows high-quality pathology images from knowledge base
- **Clickable Annotations**: Click anatomical terms to see arrows pointing to corresponding structures
- **Zoom Controls**: Zoom in/out to examine details (50% to 300%)
- **Responsive Design**: Works on all screen sizes
- **Collapsible UI**: Expand/collapse viewer to save space

### 2. Intelligent Search
- **Natural Language Queries**: Ask questions like "show me foot anatomy" or "what does bone pathology look like"
- **Keyword Matching**: Searches through case titles, categories, and anatomical terms
- **Ranked Results**: Returns most relevant cases first
- **Multi-case Support**: Can display multiple matching cases in one response

### 3. Rich Annotations
- **Anatomical Terms**: 20+ structures identified per case
- **Coordinates**: Precise bounding boxes for each structure
- **Descriptions**: Detailed explanations for each anatomical feature
- **Visual Highlighting**: Red border and arrow overlay when term is selected

## Architecture

### Frontend Components

**PathologyImageViewer** (`/frontend/components/ui/PathologyImageViewer.tsx`)
- React component for displaying pathology images
- Manages zoom, pan, and annotation selection
- Renders interactive term list with descriptions

**Message Type** (`/frontend/const/chatConfig.ts`)
- New `PATHOLOGY_IMAGE` message type added
- Processed in chat stream handler

**Stream Handler** (`/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`)
- Parses `pathology_image` SSE messages
- Stores pathology data in message state

**Message Renderer** (`/frontend/app/[locale]/chat/streaming/chatStreamMessage.tsx`)
- Renders PathologyImageViewer component
- Displays multiple pathology images per message

### Backend Components

**PathologySearchTool** (`/sdk/nexent/core/tools/pathology_search_tool.py`)
- Searches pathology knowledge base
- Parses YAML frontmatter from Markdown files
- Returns structured pathology data
- Sends `PATHOLOGY_IMAGE` messages via observer

**ProcessType** (`/sdk/nexent/core/utils/observer.py`)
- New `PATHOLOGY_IMAGE` process type added
- Enables SSE streaming of pathology data

**Tool Registration** (`/sdk/nexent/core/tools/__init__.py`)
- PathologySearchTool exported and available to agents

## Data Format

### Markdown File Structure

Pathology cases are stored as Markdown files with YAML frontmatter:

```markdown
---
pathology_case_id: unique_case_id
pathology_category: Category Name
pathology_metadata:
  total_cases: 1
  images:
  - image_id: unique_image_id
    image_url: https://example.com/image.jpg
    case_title: Case Title
    annotations:
    - term: Anatomical Structure Name
      coordinates:
        x: 100
        y: 200
        width: 60
        height: 40
      description: Detailed description
---

# Pathology Content

Markdown content describing the case...
```

### Annotation Data

Each annotation includes:
- `term`: Name of anatomical structure
- `coordinates`: Bounding box (x, y, width, height in pixels)
- `description`: Educational description

## Usage

### 1. Add Pathology Cases

Create Markdown files in `/pathology_knowledge/` directory:

```bash
pathology_knowledge/
  ├── bone_pathology.md
  ├── heart_pathology.md
  └── lung_pathology.md
```

### 2. Configure Tool

When creating an agent, add the PathologySearchTool:

```python
from nexent.core.tools import PathologySearchTool

pathology_tool = PathologySearchTool(
    pathology_dir="/path/to/pathology_knowledge",
    top_k=3,  # Return top 3 matches
    observer=message_observer
)
```

### 3. Query Examples

Users can ask:
- "Show me normal foot anatomy"
- "What does bone pathology look like?"
- "Display coronary artery anatomy"
- "I need to see heart pathology examples"

### 4. Agent Response

The agent will:
1. Use PathologySearchTool to search knowledge base
2. Stream pathology_image messages to frontend
3. Display interactive PathologyImageViewer components
4. Allow users to click terms and see highlighted regions

## Configuration

### Environment Variables

Add to `/backend/consts/const.py`:

```python
PATHOLOGY_KNOWLEDGE_DIR = os.getenv("PATHOLOGY_KNOWLEDGE_DIR", "/home/user/-/pathology_knowledge")
```

### Agent Setup

Configure agents to use the pathology search tool:

1. Navigate to agent setup page
2. Add "Pathology Search" tool to agent
3. Configure pathology directory path
4. Save agent configuration

## File Locations

### Frontend
- `/frontend/components/ui/PathologyImageViewer.tsx` - Viewer component
- `/frontend/const/chatConfig.ts` - Message type definition
- `/frontend/types/chat.ts` - TypeScript types
- `/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx` - Stream handler
- `/frontend/app/[locale]/chat/streaming/chatStreamMessage.tsx` - Message renderer

### Backend
- `/sdk/nexent/core/tools/pathology_search_tool.py` - Search tool
- `/sdk/nexent/core/tools/__init__.py` - Tool exports
- `/sdk/nexent/core/utils/observer.py` - Process types
- `/pathology_knowledge/` - Knowledge base directory

## Example Data

A sample bone pathology case is provided in:
- `/pathology_knowledge/bone_pathology.md`

This demonstrates:
- Foot anatomy with 23 annotated structures
- Proper YAML frontmatter format
- Coordinate mapping for annotations
- Rich descriptions for each term

## Future Enhancements

Potential improvements:
1. **Multi-language support**: Translate terms and descriptions
2. **Drawing tools**: Allow users to add their own annotations
3. **3D visualization**: Support for 3D pathology models
4. **Video support**: Animate pathological processes
5. **Comparison view**: Side-by-side normal vs. pathological
6. **Export functionality**: Download annotated images
7. **Search filters**: Filter by organ system, modality, etc.
8. **User annotations**: Save personal notes on images

## Testing

To test the feature:

1. Start the backend server
2. Start the frontend development server
3. Create a new conversation
4. Ask: "Show me foot anatomy"
5. Verify pathology image appears with clickable annotations
6. Click different anatomical terms
7. Verify arrows and highlights appear correctly
8. Test zoom controls
9. Test expand/collapse functionality

## Troubleshooting

**Images not loading:**
- Check image URL is accessible
- Verify CORS settings allow image fetching
- Check browser console for errors

**Annotations not clickable:**
- Verify coordinate data in YAML frontmatter
- Check browser console for JavaScript errors
- Ensure image has loaded before clicking

**Search returns no results:**
- Check pathology_knowledge directory path
- Verify Markdown files have proper YAML frontmatter
- Try broader search terms (e.g., "anatomy" instead of specific terms)

## Contributing

To add new pathology cases:

1. Create Markdown file with YAML frontmatter
2. Add high-quality image URL
3. Define precise coordinates for annotations
4. Write clear descriptions for each term
5. Add relevant keywords
6. Test in chat interface
7. Submit pull request

## License

This feature is part of the Nexent platform and follows the project's license terms.
