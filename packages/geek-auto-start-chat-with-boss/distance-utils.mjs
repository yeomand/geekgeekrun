const EARTH_RADIUS_KM = 6371

const toRadians = (value) => value * Math.PI / 180

export function calculateDistanceKm (latitudeA, longitudeA, latitudeB, longitudeB) {
  const lat1 = Number(latitudeA)
  const lng1 = Number(longitudeA)
  const lat2 = Number(latitudeB)
  const lng2 = Number(longitudeB)

  if ([lat1, lng1, lat2, lng2].some(value => Number.isNaN(value))) {
    return null
  }

  const deltaLat = toRadians(lat2 - lat1)
  const deltaLng = toRadians(lng2 - lng1)
  const radLat1 = toRadians(lat1)
  const radLat2 = toRadians(lat2)

  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

export function roundDistanceKm (distanceKm, digits = 1) {
  if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm)) {
    return null
  }
  return Number(distanceKm.toFixed(digits))
}
