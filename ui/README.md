# Logistics Manager - Three.js

A modular Three.js application for visualizing logistics containers and packages.

## Project Structure

```
logistics-manager/
├── index.html              # Entry point
├── styles/
│   └── main.css           # Application styles
├── public/data/           # Sample JSON files
│   ├── sample-containers.json
│   └── warehouse-layout.json
└── src/
    ├── main.js            # Application initialization
    ├── config/
    │   └── constants.js   # Configuration and defaults
    ├── scene/
    │   └── SceneManager.js # Scene, camera, renderer setup
    ├── objects/
    │   ├── BigBox.js      # Outer container box
    │   └── InnerBox.js    # Inner package boxes
    ├── data/
    │   └── ContainerLoader.js # JSON loading and export
    └── ui/
        └── UIController.js # UI controls and events
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Architecture

- **SceneManager**: Handles Three.js scene, camera, renderer, and controls
- **BigBox**: Manages the outer transparent container
- **InnerBox**: Manages inner package boxes
- **UIController**: Handles all UI interactions and data collection
- **ContainerLoader**: JSON loading, validation, and export
- **constants.js**: Centralized configuration

## Tech Stack

- **Three.js**: 3D graphics library
- **Vite**: Fast development server and bundler
- **ES6 Modules**: Modern JavaScript modules

## JSON Schema Support

### Loading Containers

**Option 1: Load Sample JSON**
1. Click "Load Sample" button in UI
2. Sample containers will be loaded and rendered

**Option 2: Upload Custom JSON**
1. Click "Upload JSON" button
2. Select your JSON file
3. Containers will be loaded and rendered

**Option 3: Load from Code**
```javascript
import { ContainerLoader } from './src/data/ContainerLoader.js';

// Load from URL
const containers = await ContainerLoader.loadFromURL('/data/sample-containers.json');

// Load from file input
const containers = await ContainerLoader.loadFromFile(fileObject);
```

### Exporting Containers

1. Arrange containers in the UI
2. Click "Export JSON" button
3. JSON file will be downloaded

### JSON Format

```json
{
  "container": {
    "size": { "length": 3000, "width": 1500, "height": 1500 },
    "position": { "x": 0, "y": 750, "z": 0 },
    "maxWeight": 1000,
    "color": "#9fbcd4"
  },
  "packages": [
    {
      "id": "box-1",
      "position": { "x": 0, "y": 0, "z": 0 },
      "size": { "length": 400, "width": 300, "height": 300 },
      "weight": 10,
      "color": "#ff6b6b",
      "label": "Package A"
    }
  ]
}
```

**Units:** All dimensions and positions are in millimeters (mm). Scale: 1 unit = 100mm.

**Field Descriptions:**
- `container.size`: Dimensions (length, width, height) in mm
- `container.position`: Position (x, y, z) in mm
- `container.maxWeight`: Maximum weight capacity in kg
- `container.color`: Container color (hex)
- `packages[].id`: Unique identifier
- `packages[].position`: 3D coordinates (x, y, z) in mm
- `packages[].size`: Package dimensions (length, width, height) in mm
- `packages[].weight`: Package weight in kg
- `packages[].color`: Package color (hex)
- `packages[].label`: Optional display label

**Sample Files:**
- `public/data/sample-containers.json` - Basic 3-package layout
- `public/data/warehouse-layout.json` - Complex warehouse with 5 packages

## Adding New Features

- New 3D objects → Add to `src/objects/`
- Scene modifications → Update `src/scene/SceneManager.js`
- UI components → Extend `src/ui/UIController.js`
- Configuration → Update `src/config/constants.js`
- Data loaders → Add to `src/data/`
