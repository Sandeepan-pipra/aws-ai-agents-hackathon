import React, { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, RotateCw, Loader2, Package, Box } from 'lucide-react';
import { config } from '../utils/config';
import ThreeJSViewer from './ThreeJSViewer';

export default function Layout3DViewer({ booking, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutData, setLayoutData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLayoutData();
  }, [booking]);

  const loadLayoutData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!booking.s3LayoutKey) {
        throw new Error('No layout available for this booking');
      }

      // Fetch layout data from Lambda API
      const layoutUrl = `${config.layoutApiUrl}/layouts?key=${booking.s3LayoutKey}`;
      const response = await fetch(layoutUrl);

      if (!response.ok) {
        throw new Error('Layout not found');
      }

      const data = await response.json();

      // Validate data structure
      if (validateLayoutData(data)) {
        setLayoutData(data);
      } else {
        throw new Error('Invalid layout data format');
      }
    } catch (err) {
      console.warn('Failed to load layout from S3, using sample data:', err);
      // Use sample data for demonstration
      const sampleData = await createMockLayoutData();
      setLayoutData(sampleData);
    } finally {
      setIsLoading(false);
    }
  };

  const validateLayoutData = (data) => {
    if (!data.container || !data.packages) return false;
    const containerSize = data.container.size;
    if (!containerSize || !containerSize.length || !containerSize.width || !containerSize.height) {
      return false;
    }
    if (!Array.isArray(data.packages)) return false;
    return data.packages.every(pkg => {
      const size = pkg.size;
      return (
        pkg.position &&
        size &&
        size.length &&
        size.width &&
        size.height
      );
    });
  };

  const createMockLayoutData = async () => {
    // Load the sample packing layout from public folder
    try {
      const response = await fetch('/sample-layout.json');
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Could not load sample layout, using fallback');
    }

    // Fallback data if sample file is not available
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

    return {
      container: {
        size: { length: 3000, width: 1500, height: 1500 },
        position: { x: 0, y: 750, z: 0 },
        color: '#9fbcd4',
        maxWeight: 1000
      },
      packages: Array.from({ length: 5 }, (_, i) => ({
        size: { length: 400, width: 400, height: 300 },
        position: { x: i * 500, y: 0, z: 0 },
        color: colors[i % colors.length],
        weight: 10 + i * 5,
        label: `Package ${i + 1}`
      }))
    };
  };

  const handleReset = () => {
    // Re-load the data to reset the view
    loadLayoutData();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${
        isFullscreen ? 'p-0' : 'p-4'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-2xl overflow-hidden ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl h-[700px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold">
            3D Packing Layout - Booking #{booking.id.substring(0, 8)}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Container */}
        <div className="relative w-full flex" style={{ height: 'calc(100% - 64px)' }}>
          {/* 3D Canvas */}
          <div className={`${isFullscreen && layoutData ? 'w-3/4' : 'w-full'} h-full`}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-600">
                <p>{error}</p>
              </div>
            ) : layoutData ? (
              <ThreeJSViewer layoutData={layoutData} key={isFullscreen ? 'fullscreen' : 'normal'} />
            ) : null}
          </div>

          {/* Side Panel - Only visible in fullscreen */}
          {isFullscreen && layoutData && (
            <div className="w-1/4 h-full bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0 order-first">
              <div className="p-4">
                {/* Container Info */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Box className="w-5 h-5 text-primary-600" />
                    <h4 className="font-semibold text-gray-900">Container</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Length:</span>
                      <span className="font-medium">{layoutData.container.size.length} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Width:</span>
                      <span className="font-medium">{layoutData.container.size.width} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Height:</span>
                      <span className="font-medium">{layoutData.container.size.height} mm</span>
                    </div>
                    {layoutData.container.maxWeight && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Weight:</span>
                        <span className="font-medium">{layoutData.container.maxWeight} kg</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Packages List */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-primary-600" />
                    <h4 className="font-semibold text-gray-900">
                      Packages ({layoutData.packages.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {layoutData.packages.map((pkg, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: pkg.color || '#666666' }}
                          />
                          <span className="font-medium text-sm">
                            {pkg.label || `Package ${index + 1}`}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span className="font-medium">
                              {pkg.size.length} × {pkg.size.width} × {pkg.size.height} mm
                            </span>
                          </div>
                          {pkg.weight && (
                            <div className="flex justify-between">
                              <span>Weight:</span>
                              <span className="font-medium">{pkg.weight} kg</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Position:</span>
                            <span className="font-medium">
                              ({pkg.position.x}, {pkg.position.y}, {pkg.position.z})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statistics */}
                {layoutData.packages.length > 0 && (
                  <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-sm text-gray-900 mb-2">Statistics</h5>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Total Packages:</span>
                        <span className="font-medium">{layoutData.packages.length}</span>
                      </div>
                      {layoutData.packages.some(p => p.weight) && (
                        <div className="flex justify-between">
                          <span>Total Weight:</span>
                          <span className="font-medium">
                            {layoutData.packages.reduce((sum, p) => sum + (p.weight || 0), 0).toFixed(1)} kg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
