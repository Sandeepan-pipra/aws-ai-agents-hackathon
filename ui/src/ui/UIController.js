import { DEFAULTS } from '../config/constants.js';
import { ContainerLoader } from '../data/ContainerLoader.js';

export class UIController {
  constructor(onApply) {
    this.onApply = onApply;
    this.elements = this.getElements();
    this.setupEventListeners();
  }

  getElements() {
    return {
      bigX: document.getElementById('bigX'),
      bigY: document.getElementById('bigY'),
      bigZ: document.getElementById('bigZ'),
      bigPosX: document.getElementById('bigPosX'),
      bigPosY: document.getElementById('bigPosY'),
      bigPosZ: document.getElementById('bigPosZ'),
      bigColor: document.getElementById('bigColor'),
      innerBoxesDiv: document.getElementById('innerBoxes'),
      addBoxBtn: document.getElementById('addBox'),
      applyBtn: document.getElementById('apply'),
      loadJsonBtn: document.getElementById('loadJson'),
      loadFileBtn: document.getElementById('loadFile'),
      fileInput: document.getElementById('fileInput'),
      exportBtn: document.getElementById('exportJson')
    };
  }

  setupEventListeners() {
    this.elements.addBoxBtn.addEventListener('click', () => this.addInnerBoxUI());
    this.elements.applyBtn.addEventListener('click', () => this.onApply(this.getSceneData()));
    this.elements.loadJsonBtn.addEventListener('click', () => this.loadSampleJSON());
    this.elements.loadFileBtn.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    this.elements.exportBtn.addEventListener('click', () => this.exportToJSON());
  }

  addInnerBoxUI(x = 0, y = 0, z = 0, sx = 400, sy = 300, sz = 300, color = '#666666', id = '', weight = 0, label = '') {
    const div = document.createElement('div');
    div.className = 'inner-box';
    const displayLabel = label ? ` - ${label}` : '';
    div.innerHTML = `
      <div class="box-header">${id || 'Box'}${displayLabel}</div>
      <div class="box-section">
        <label>Position (mm)</label>
        <div class="input-group">
          <input type="number" value="${x}" step="10" class="ix" placeholder="X">
          <input type="number" value="${y}" step="10" class="iy" placeholder="Y">
          <input type="number" value="${z}" step="10" class="iz" placeholder="Z">
        </div>
      </div>
      <div class="box-section">
        <label>Size (L × H × W mm)</label>
        <div class="input-group">
          <input type="number" value="${sx}" step="10" class="sx" placeholder="L">
          <input type="number" value="${sy}" step="10" class="sy" placeholder="H">
          <input type="number" value="${sz}" step="10" class="sz" placeholder="W">
        </div>
      </div>
      <div class="box-section">
        <label>Weight (kg)</label>
        <input type="number" value="${weight}" step="0.1" class="weight">
      </div>
      <div class="box-section">
        <label>Color</label>
        <input type="color" value="${color}" class="color">
      </div>
      <button class="remove">Remove</button>`;
    this.elements.innerBoxesDiv.appendChild(div);
    div.querySelector('.remove').onclick = () => div.remove();
  }

  getSceneData() {
    const innerBoxes = [];
    this.elements.innerBoxesDiv.querySelectorAll('.inner-box').forEach(div => {
      innerBoxes.push({
        x: parseFloat(div.querySelector('.ix').value),
        y: parseFloat(div.querySelector('.iy').value),
        z: parseFloat(div.querySelector('.iz').value),
        sx: parseFloat(div.querySelector('.sx').value),
        sy: parseFloat(div.querySelector('.sy').value),
        sz: parseFloat(div.querySelector('.sz').value),
        weight: parseFloat(div.querySelector('.weight').value),
        color: div.querySelector('.color').value
      });
    });

    return {
      bigBox: {
        dimensions: {
          x: parseFloat(this.elements.bigX.value),
          y: parseFloat(this.elements.bigY.value),
          z: parseFloat(this.elements.bigZ.value)
        },
        position: {
          x: parseFloat(this.elements.bigPosX.value),
          y: parseFloat(this.elements.bigPosY.value),
          z: parseFloat(this.elements.bigPosZ.value)
        },
        color: this.elements.bigColor.value
      },
      innerBoxes
    };
  }

  async loadSampleJSON() {
    try {
      const data = await ContainerLoader.loadFromURL('/data/sample-containers.json');
      this.loadData(data);
    } catch (error) {
      alert('Failed to load sample JSON: ' + error.message);
    }
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const data = await ContainerLoader.loadFromFile(file);
      this.loadData(data);
    } catch (error) {
      alert('Failed to load file: ' + error.message);
    }
    event.target.value = '';
  }

  loadData(data) {
    // Load container settings
    this.elements.bigX.value = data.container.size.length;
    this.elements.bigY.value = data.container.size.height;
    this.elements.bigZ.value = data.container.size.width;
    this.elements.bigPosX.value = data.container.position.x;
    this.elements.bigPosY.value = data.container.position.y;
    this.elements.bigPosZ.value = data.container.position.z;
    this.elements.bigColor.value = data.container.color;
    
    // Load packages
    this.elements.innerBoxesDiv.innerHTML = '';
    data.packages.forEach(pkg => {
      this.addInnerBoxUI(
        pkg.position.x,
        pkg.position.y,
        pkg.position.z,
        pkg.size.length,
        pkg.size.height,
        pkg.size.width,
        pkg.color,
        pkg.id,
        pkg.weight,
        pkg.label
      );
    });
    this.onApply(this.getSceneData());
  }

  exportToJSON() {
    const data = this.getSceneData();
    const exportData = {
      container: {
        size: {
          length: data.bigBox.dimensions.x,
          width: data.bigBox.dimensions.z,
          height: data.bigBox.dimensions.y
        },
        position: data.bigBox.position,
        maxWeight: 1000,
        color: data.bigBox.color
      },
      packages: data.innerBoxes.map((box, index) => ({
        id: `box-${index + 1}`,
        position: { x: box.x, y: box.y, z: box.z },
        size: {
          length: box.sx,
          width: box.sz,
          height: box.sy
        },
        weight: box.weight,
        color: box.color,
        label: `Package ${index + 1}`
      }))
    };
    ContainerLoader.downloadJSON(exportData);
  }
}
