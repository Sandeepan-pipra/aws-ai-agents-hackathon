// Simple distance calculation - in production, use Google Maps API or similar
function calculateDistance(pickupAddress, deliveryAddress) {
  // Mock implementation - returns random distance between 10-100 km
  // Replace with actual geocoding and distance calculation
  const hash = (pickupAddress + deliveryAddress).length;
  return Math.floor(10 + (hash % 90) + Math.random() * 10);
}

module.exports = { calculateDistance };
