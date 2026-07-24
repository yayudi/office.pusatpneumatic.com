/**
 * Helper to check if a location matches the building/floor filters
 * @param {Object} loc - Location object from API
 * @param {Object} selectedBuilding - { include: Array<string>, exclude: Array<string> }
 * @param {Object} selectedFloor - { include: Array<string>, exclude: Array<string> }
 * @returns {boolean}
 */
export const matchesFilters = (loc, selectedBuilding, selectedFloor) => {
  let buildingMatch = true
  if (selectedBuilding.include.length > 0) {
    if (loc.building) {
      buildingMatch = selectedBuilding.include.includes(loc.building)
    } else if (loc.location_code) {
      buildingMatch = selectedBuilding.include.some(b => loc.location_code.startsWith(b))
    }
  } else if (selectedBuilding.exclude.length > 0) {
    if (loc.building) {
      buildingMatch = !selectedBuilding.exclude.includes(loc.building)
    } else if (loc.location_code) {
      buildingMatch = !selectedBuilding.exclude.some(b => loc.location_code.startsWith(b))
    }
  }

  let floorMatch = true
  if (selectedFloor.include.length > 0) {
    if (loc.floor !== undefined && loc.floor !== null) {
      floorMatch = selectedFloor.include.includes(String(loc.floor))
    }
  } else if (selectedFloor.exclude.length > 0) {
    if (loc.floor !== undefined && loc.floor !== null) {
      floorMatch = !selectedFloor.exclude.includes(String(loc.floor))
    }
  }

  return buildingMatch && floorMatch
}

/**
 * Transforms an API product object, calculating stocks based on location purpose and filters
 * @param {Object} apiProduct - Product object from API
 * @param {Object} selectedBuilding - Current building filters
 * @param {Object} selectedFloor - Current floor filters
 * @returns {Object} Transformed product object
 */
export const transformProduct = (apiProduct, selectedBuilding, selectedFloor) => {
  const locations = apiProduct.stock_locations || []

  const filteredLocations = locations.filter(loc => matchesFilters(loc, selectedBuilding, selectedFloor))

  const pajanganLocations = filteredLocations.filter(loc => loc.purpose === 'DISPLAY')
  const stockPajangan = pajanganLocations.reduce((sum, loc) => sum + loc.quantity, 0)
  const lokasiPajangan = pajanganLocations.map(loc => loc.location_code).join(', ')

  const gudangLocations = filteredLocations.filter(loc => loc.purpose === 'WAREHOUSE')
  const stockGudang = gudangLocations.reduce((sum, loc) => sum + loc.quantity, 0)
  const lokasiGudang = gudangLocations.map(loc => loc.location_code).join(', ')

  const ltcLocation = filteredLocations.find(loc => loc.purpose === 'BRANCH')
  const stockLTC = ltcLocation ? ltcLocation.quantity : 0
  const lokasiLTC = ltcLocation ? ltcLocation.location_code : 'N/A'

  const filteredTotalStock = filteredLocations.reduce((sum, loc) => sum + loc.quantity, 0)
  const filteredAllLocationsCode = filteredLocations.map(loc => loc.location_code).join(', ')

  return {
    id: apiProduct.id,
    sku: apiProduct.sku,
    name: apiProduct.name,
    price: apiProduct.price,
    weight: apiProduct.weight,
    length: apiProduct.length,
    width: apiProduct.width,
    height: apiProduct.height,
    total_cbm: apiProduct.total_cbm,
    is_package: Boolean(apiProduct.is_package),
    category_name: apiProduct.category_name || null,
    thumbnail_path: apiProduct.thumbnail_path,
    image_path: apiProduct.image_path,

    stockPajangan,
    lokasiPajangan,
    pajanganLocations,
    stockGudang,
    lokasiGudang,
    gudangLocations,
    stockLTC,
    lokasiLTC,
    totalStock: filteredTotalStock,
    allLocationsCode: filteredAllLocationsCode,
    stock_locations: filteredLocations,
    components: apiProduct.components || [] // Pass components for virtual stock calc
  }
}
