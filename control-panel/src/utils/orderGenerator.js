/**
 * Intelligent Order Generator
 * Generates realistic orders with weighted distributions and smart product combinations
 */

// Major US cities with regions for distance-based routing
const CITIES = {
  northeast: [
    'New York, NY',
    'Boston, MA',
    'Philadelphia, PA',
  ],
  south: [
    'Houston, TX',
    'Dallas, TX',
    'Miami, FL',
    'Atlanta, GA',
  ],
  west: [
    'Los Angeles, CA',
    'San Francisco, CA',
    'Seattle, WA',
    'Phoenix, AZ',
  ],
  midwest: [
    'Chicago, IL',
    'Detroit, MI',
    'Minneapolis, MN',
    'Denver, CO',
  ],
};

// Flatten cities for easier access
const ALL_CITIES = Object.values(CITIES).flat();

// Distance categories (percentage distribution)
const DISTANCE_DISTRIBUTION = {
  short: 0.3,    // Same region
  medium: 0.4,   // Adjacent regions
  long: 0.3,     // Cross-country
};

// Priority distribution (1=urgent, 5=bulk)
const PRIORITY_DISTRIBUTION = [
  { priority: 1, weight: 10 },   // 10% urgent
  { priority: 2, weight: 20 },   // 20% high
  { priority: 3, weight: 50 },   // 50% normal
  { priority: 4, weight: 15 },   // 15% low
  { priority: 5, weight: 5 },    // 5% bulk
];

// Order size distribution
const ORDER_SIZE_DISTRIBUTION = [
  { min: 1, max: 2, weight: 40 },    // 40% small
  { min: 3, max: 5, weight: 40 },    // 40% medium
  { min: 6, max: 10, weight: 15 },   // 15% large
  { min: 11, max: 20, weight: 5 },   // 5% bulk
];

/**
 * Weighted random selection
 */
function weightedRandom(items, weightKey = 'weight') {
  const totalWeight = items.reduce((sum, item) => sum + item[weightKey], 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item[weightKey];
    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

/**
 * Get random priority based on weighted distribution
 */
export function getWeightedPriority() {
  const selected = weightedRandom(PRIORITY_DISTRIBUTION);
  return selected.priority;
}

/**
 * Get random order size based on weighted distribution
 */
export function getWeightedOrderSize() {
  const selected = weightedRandom(ORDER_SIZE_DISTRIBUTION);
  return Math.floor(Math.random() * (selected.max - selected.min + 1)) + selected.min;
}

/**
 * Get source and destination cities with realistic distance distribution
 */
export function getSourceDestination() {
  const rand = Math.random();
  let sourceRegion, destRegion;

  const regions = Object.keys(CITIES);

  if (rand < DISTANCE_DISTRIBUTION.short) {
    // Short distance - same region
    sourceRegion = regions[Math.floor(Math.random() * regions.length)];
    destRegion = sourceRegion;
  } else if (rand < DISTANCE_DISTRIBUTION.short + DISTANCE_DISTRIBUTION.medium) {
    // Medium distance - different regions
    sourceRegion = regions[Math.floor(Math.random() * regions.length)];
    destRegion = regions[Math.floor(Math.random() * regions.length)];
  } else {
    // Long distance - opposite coasts
    const isWestToEast = Math.random() > 0.5;
    sourceRegion = isWestToEast ? 'west' : 'northeast';
    destRegion = isWestToEast ? 'northeast' : 'west';
  }

  const sourceCities = CITIES[sourceRegion];
  const destCities = CITIES[destRegion];

  const source = sourceCities[Math.floor(Math.random() * sourceCities.length)];
  let destination = destCities[Math.floor(Math.random() * destCities.length)];

  // Ensure source and destination are different
  while (source === destination && sourceCities.length > 1) {
    destination = destCities[Math.floor(Math.random() * destCities.length)];
  }

  return { source, destination };
}

/**
 * Check if products are compatible in same order
 */
function areProductsCompatible(products) {
  const hasRefrigerated = products.some((p) => p.requires_refrigeration);
  const hasNonRefrigerated = products.some((p) => !p.requires_refrigeration);

  // Don't mix refrigerated with non-refrigerated
  if (hasRefrigerated && hasNonRefrigerated) {
    return false;
  }

  return true;
}

/**
 * Group products by compatibility
 */
function groupProductsByCompatibility(products) {
  const refrigerated = products.filter((p) => p.requires_refrigeration);
  const fragile = products.filter((p) => p.fragility && !p.requires_refrigeration);
  const regular = products.filter((p) => !p.fragility && !p.requires_refrigeration);

  return {
    refrigerated,
    fragile,
    regular,
  };
}

/**
 * Select compatible products for an order
 */
export function selectCompatibleProducts(products, count) {
  if (!products || products.length === 0) {
    return [];
  }

  const groups = groupProductsByCompatibility(products);

  // Decide which group to use (weighted)
  const groupSelection = Math.random();
  let selectedGroup;

  if (groupSelection < 0.15 && groups.refrigerated.length > 0) {
    // 15% refrigerated orders
    selectedGroup = groups.refrigerated;
  } else if (groupSelection < 0.35 && groups.fragile.length > 0) {
    // 20% fragile orders
    selectedGroup = groups.fragile;
  } else if (groups.regular.length > 0) {
    // 65% regular orders (can include fragile)
    selectedGroup = [...groups.regular, ...groups.fragile];
  } else {
    // Fallback to all products
    selectedGroup = products;
  }

  // Select random products from the chosen group
  const selectedProducts = [];
  const maxAttempts = count * 3; // Prevent infinite loop
  let attempts = 0;

  while (selectedProducts.length < count && attempts < maxAttempts) {
    const product = selectedGroup[Math.floor(Math.random() * selectedGroup.length)];

    // Allow duplicates (realistic - ordering multiple of same item)
    selectedProducts.push(product);
    attempts++;
  }

  return selectedProducts;
}

/**
 * Generate intelligent order items with compatible products
 */
export function generateOrderItems(products, orderSize) {
  const selectedProducts = selectCompatibleProducts(products, orderSize);

  return selectedProducts.map((product) => ({
    product_id: product.id,
    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 quantity per item
  }));
}

/**
 * Select customer that matches destination city (if possible)
 */
export function selectCustomerForDestination(customers, destination) {
  if (!customers || customers.length === 0) {
    return null;
  }

  // Try to find customer in destination city (70% of the time)
  if (Math.random() < 0.7) {
    const cityName = destination.split(',')[0].trim();
    const matchingCustomers = customers.filter((c) =>
      c.city && c.city.toLowerCase().includes(cityName.toLowerCase())
    );

    if (matchingCustomers.length > 0) {
      return matchingCustomers[Math.floor(Math.random() * matchingCustomers.length)];
    }
  }

  // Otherwise, random customer
  return customers[Math.floor(Math.random() * customers.length)];
}

/**
 * Generate a complete intelligent order
 */
export function generateIntelligentOrder(products, customers) {
  const { source, destination } = getSourceDestination();
  const priority = getWeightedPriority();
  const orderSize = getWeightedOrderSize();
  const items = generateOrderItems(products, orderSize);
  const customer = selectCustomerForDestination(customers, destination);

  if (!customer) {
    throw new Error('No customers available');
  }

  return {
    customer_id: customer.id,
    items,
    source,
    destination,
    priority,
  };
}

/**
 * Get generation statistics (for display)
 */
export function getGenerationStats() {
  return {
    priorityDistribution: PRIORITY_DISTRIBUTION,
    orderSizeDistribution: ORDER_SIZE_DISTRIBUTION,
    distanceDistribution: DISTANCE_DISTRIBUTION,
  };
}
