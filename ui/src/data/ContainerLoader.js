export class ContainerLoader {
  static async loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (this.validate(data)) {
            resolve(data);
          } else {
            reject(new Error('Invalid JSON schema'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  static async loadFromURL(url) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (this.validate(data)) {
        return data;
      }
      throw new Error('Invalid JSON schema');
    } catch (error) {
      throw error;
    }
  }

  static validate(data) {
    if (!data.container || !data.packages || !Array.isArray(data.packages)) return false;
    const containerSize = data.container.size;
    if (!containerSize || !containerSize.length || !containerSize.width || !containerSize.height) return false;
    if (!data.container.position || !data.container.maxWeight) return false;
    return data.packages.every(pkg => {
      const size = pkg.size;
      return pkg.position && size && size.length && size.width && size.height && pkg.color && pkg.weight !== undefined;
    });
  }

  static exportToJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  static downloadJSON(data, filename = 'containers.json') {
    const json = this.exportToJSON(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
