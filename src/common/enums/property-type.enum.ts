/**
 * Property type enum matching Prisma schema.
 * Defines the different types of properties available for rent.
 *
 * APARTMENT: Apartment unit in a building
 * HOUSE: Standalone house
 * STUDIO: Studio apartment (single room + bathroom)
 * ROOM: Single room in a shared property
 */
export enum PropertyType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  STUDIO = 'STUDIO',
  ROOM = 'ROOM',
}
