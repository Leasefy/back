import { Injectable } from '@nestjs/common';
import { PropertyType } from '../../common/enums/index.js';
import { ColombiaDataProvider } from './colombia-data.provider.js';

/**
 * Parsed filters extracted from natural language query.
 */
export interface ParsedSearchFilters {
  propertyType?: PropertyType;
  city?: string;
  neighborhood?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  stratum?: number;
  floor?: number;
  amenities?: string[];
  /** Words that couldn't be parsed - used for full-text search */
  remainingText?: string;
  /** Debug info: what was detected */
  _detected?: Record<string, string>;
}

/**
 * Service to parse natural language property searches.
 * Extracts structured filters from text like "busco casa en bogota con 2 habitaciones".
 */
@Injectable()
export class NaturalSearchParserService {
  constructor(private readonly colombiaData: ColombiaDataProvider) {}

  // Property type patterns (Spanish)
  private readonly PROPERTY_TYPES: Record<string, PropertyType> = {
    casa: PropertyType.HOUSE,
    casas: PropertyType.HOUSE,
    casita: PropertyType.HOUSE,
    vivienda: PropertyType.HOUSE,
    apartamento: PropertyType.APARTMENT,
    apartamentos: PropertyType.APARTMENT,
    apto: PropertyType.APARTMENT,
    aptos: PropertyType.APARTMENT,
    apartaestudio: PropertyType.STUDIO,
    estudio: PropertyType.STUDIO,
    estudios: PropertyType.STUDIO,
    loft: PropertyType.STUDIO,
    habitacion: PropertyType.ROOM,
    habitaciones: PropertyType.ROOM,
    cuarto: PropertyType.ROOM,
    cuartos: PropertyType.ROOM,
    pieza: PropertyType.ROOM,
  };

  // Common Bogota neighborhoods (expanded)
  private readonly BOGOTA_NEIGHBORHOODS = new Set([
    'chapinero', 'usaquen', 'usaquén', 'suba', 'engativa', 'engativá',
    'kennedy', 'fontibon', 'fontibón', 'teusaquillo', 'barrios unidos',
    'santa fe', 'candelaria', 'la candelaria', 'san cristobal', 'san cristóbal',
    'rafael uribe', 'antonio narino', 'antonio nariño', 'puente aranda',
    'martires', 'mártires', 'bosa', 'ciudad bolivar', 'ciudad bolívar',
    'tunjuelito', 'usme', 'sumapaz', 'cedritos', 'chico', 'el chico',
    'rosales', 'la cabrera', 'virrey', 'santa barbara', 'santa bárbara',
    'country', 'polo', 'modelia', 'niza', 'colina', 'spring', 'mazuren',
    'la soledad', 'galerias', 'galerías', 'parkway', 'la macarena',
    'quinta camacho', 'nogal', 'el nogal', 'refugio', 'el refugio',
    'chicó norte', 'chico norte', 'la carolina', 'santa ana', 'santa ana norte',
    'bella suiza', 'contador', 'cedro', 'el cedro', 'caobos', 'los caobos',
    'multicentro', 'la calleja', 'san patricio', 'sotileza', 'gratamira',
  ]);

  // Medellin neighborhoods
  private readonly MEDELLIN_NEIGHBORHOODS = new Set([
    'poblado', 'el poblado', 'laureles', 'envigado', 'belen', 'belén',
    'la america', 'la américa', 'estadio', 'florida nueva', 'conquistadores',
    'san lucas', 'manila', 'astorga', 'los balsos', 'provenza',
    'santa monica', 'santa mónica', 'san diego', 'patio bonito',
    'castropol', 'las lomas', 'transversal', 'alejandria', 'alejandría',
  ]);

  // Number words in Spanish
  private readonly NUMBER_WORDS: Record<string, number> = {
    un: 1, uno: 1, una: 1, primer: 1, primero: 1, primera: 1,
    dos: 2, segundo: 2, segunda: 2,
    tres: 3, tercer: 3, tercero: 3, tercera: 3,
    cuatro: 4, cuarto: 4, cuarta: 4,
    cinco: 5, quinto: 5, quinta: 5,
    seis: 6, sexto: 6, sexta: 6,
    siete: 7, septimo: 7, septima: 7,
    ocho: 8, octavo: 8, octava: 8,
    nueve: 9, noveno: 9, novena: 9,
    diez: 10, decimo: 10, decima: 10,
  };

  // Amenity keywords (aligned with frontend AMENITIES_OPTIONS)
  private readonly AMENITY_KEYWORDS: Record<string, string> = {
    // pool
    piscina: 'pool',
    alberca: 'pool',
    // gym
    gimnasio: 'gym',
    gym: 'gym',
    // security
    seguridad: 'security',
    vigilancia: 'security',
    porteria: 'security',
    portería: 'security',
    vigilante: 'security',
    '24 horas': 'security',
    '24h': 'security',
    // parking
    parqueadero: 'parking',
    parqueaderos: 'parking',
    garaje: 'parking',
    garage: 'parking',
    parking: 'parking',
    cochera: 'parking',
    // elevator
    ascensor: 'elevator',
    elevador: 'elevator',
    // terrace
    terraza: 'terrace',
    // bbq
    bbq: 'bbq',
    asador: 'bbq',
    parrilla: 'bbq',
    'zona social': 'bbq',
    // playground
    infantil: 'playground',
    ninos: 'playground',
    niños: 'playground',
    parque: 'playground',
    juegos: 'playground',
    // laundry
    lavanderia: 'laundry',
    lavandería: 'laundry',
    lavadero: 'laundry',
    'cuarto util': 'laundry',
    // pets
    mascotas: 'pets',
    perros: 'pets',
    gatos: 'pets',
    'pet friendly': 'pets',
    // furnished
    amoblado: 'furnished',
    amueblado: 'furnished',
    muebles: 'furnished',
    equipado: 'furnished',
    // balcony
    balcon: 'balcony',
    balcón: 'balcony',
    // storage
    deposito: 'storage',
    depósito: 'storage',
    bodega: 'storage',
    // ac
    aire: 'ac',
    'aire acondicionado': 'ac',
    ac: 'ac',
    clima: 'ac',
    climatizado: 'ac',
    // heating
    calefaccion: 'heating',
    calefacción: 'heating',
    caliente: 'heating',
  };

  /**
   * Parse a natural language query into structured filters.
   */
  parse(query: string): ParsedSearchFilters {
    if (!query || query.trim().length === 0) {
      return {};
    }

    const filters: ParsedSearchFilters = {};
    const detected: Record<string, string> = {};
    const text = this.normalizeText(query);
    const usedWords = new Set<string>();

    // Extract property type
    const typeResult = this.extractPropertyType(text);
    if (typeResult) {
      filters.propertyType = typeResult.type;
      detected['tipo'] = typeResult.word;
      usedWords.add(typeResult.word);
    }

    // Extract city (using Colombia data provider)
    const cityResult = this.extractCity(text);
    if (cityResult) {
      filters.city = cityResult.city;
      detected['ciudad'] = cityResult.city;
      usedWords.add(cityResult.word);
    }

    // Extract neighborhood
    const neighborhoodResult = this.extractNeighborhood(text, filters.city);
    if (neighborhoodResult) {
      filters.neighborhood = neighborhoodResult.neighborhood;
      detected['barrio'] = neighborhoodResult.neighborhood;
      usedWords.add(neighborhoodResult.word);
    }

    // Extract bedrooms
    const bedroomsResult = this.extractBedrooms(text);
    if (bedroomsResult) {
      filters.bedrooms = bedroomsResult.count;
      detected['habitaciones'] = String(bedroomsResult.count);
      bedroomsResult.words.forEach((w) => usedWords.add(w));
    }

    // Extract bathrooms
    const bathroomsResult = this.extractBathrooms(text);
    if (bathroomsResult) {
      filters.bathrooms = bathroomsResult.count;
      detected['baños'] = String(bathroomsResult.count);
      bathroomsResult.words.forEach((w) => usedWords.add(w));
    }

    // Extract parking
    const parkingResult = this.extractParking(text);
    if (parkingResult) {
      filters.parkingSpaces = parkingResult.count;
      detected['parqueaderos'] = String(parkingResult.count);
      parkingResult.words.forEach((w) => usedWords.add(w));
    }

    // Extract area
    const areaResult = this.extractArea(text);
    if (areaResult) {
      if (areaResult.minArea) filters.minArea = areaResult.minArea;
      if (areaResult.maxArea) filters.maxArea = areaResult.maxArea;
      detected['área'] = `${areaResult.minArea || '?'}-${areaResult.maxArea || '?'} m²`;
      areaResult.words.forEach((w) => usedWords.add(w));
    }

    // Extract stratum
    const stratumResult = this.extractStratum(text);
    if (stratumResult) {
      filters.stratum = stratumResult.stratum;
      detected['estrato'] = String(stratumResult.stratum);
      stratumResult.words.forEach((w) => usedWords.add(w));
    }

    // Extract floor
    const floorResult = this.extractFloor(text);
    if (floorResult) {
      filters.floor = floorResult.floor;
      detected['piso'] = String(floorResult.floor);
      floorResult.words.forEach((w) => usedWords.add(w));
    }

    // Extract amenities
    const amenitiesResult = this.extractAmenities(text);
    if (amenitiesResult.amenities.length > 0) {
      filters.amenities = amenitiesResult.amenities;
      detected['amenidades'] = amenitiesResult.amenities.join(', ');
      amenitiesResult.words.forEach((w) => usedWords.add(w));
    }

    // Extract price hints
    const priceResult = this.extractPriceHints(text);
    if (priceResult) {
      if (priceResult.minPrice) filters.minPrice = priceResult.minPrice;
      if (priceResult.maxPrice) filters.maxPrice = priceResult.maxPrice;
      detected['precio'] = `$${(priceResult.minPrice || 0).toLocaleString()}-${(priceResult.maxPrice || '∞').toLocaleString()}`;
      priceResult.words.forEach((w) => usedWords.add(w));
    }

    // Build remaining text for full-text search
    filters.remainingText = this.buildRemainingText(text, usedWords);
    filters._detected = detected;

    return filters;
  }

  /**
   * Normalize text: lowercase, trim, collapse whitespace.
   */
  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Remove accents from text for flexible matching.
   */
  private removeAccents(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private extractPropertyType(
    text: string,
  ): { type: PropertyType; word: string } | null {
    const normalizedText = this.removeAccents(text);
    for (const [keyword, type] of Object.entries(this.PROPERTY_TYPES)) {
      const normalizedKeyword = this.removeAccents(keyword);
      const pattern = new RegExp(`\\b${normalizedKeyword}s?\\b`, 'i');
      if (pattern.test(normalizedText)) {
        return { type, word: keyword };
      }
    }
    return null;
  }

  private extractCity(text: string): { city: string; word: string } | null {
    // Use Colombia data provider to find municipality
    const result = this.colombiaData.findMunicipalityInText(text);
    if (result) {
      return { city: result.municipality, word: result.matchedText };
    }
    return null;
  }

  private extractNeighborhood(
    text: string,
    city?: string,
  ): { neighborhood: string; word: string } | null {
    const normalizedText = this.removeAccents(text);
    const normalizedCity = city ? this.removeAccents(city.toLowerCase()) : '';

    // Select neighborhood set based on city
    let neighborhoods: Set<string>;
    if (normalizedCity.includes('bogot')) {
      neighborhoods = this.BOGOTA_NEIGHBORHOODS;
    } else if (normalizedCity.includes('medell')) {
      neighborhoods = this.MEDELLIN_NEIGHBORHOODS;
    } else {
      // Check both if no city specified
      neighborhoods = new Set([
        ...this.BOGOTA_NEIGHBORHOODS,
        ...this.MEDELLIN_NEIGHBORHOODS,
      ]);
    }

    for (const neighborhood of neighborhoods) {
      const normalizedNeighborhood = this.removeAccents(neighborhood);
      const pattern = new RegExp(`\\b${normalizedNeighborhood}\\b`, 'i');
      if (pattern.test(normalizedText)) {
        const capitalizedNeighborhood = neighborhood
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return { neighborhood: capitalizedNeighborhood, word: neighborhood };
      }
    }
    return null;
  }

  private extractBedrooms(
    text: string,
  ): { count: number; words: string[] } | null {
    const patterns = [
      /(\d+)\s*(habitacion|habitaciones|cuarto|cuartos|alcoba|alcobas|hab|habs)/i,
      /(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*(habitacion|habitaciones|cuarto|cuartos|alcoba|alcobas|hab)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numStr = match[1].toLowerCase();
        const count = this.NUMBER_WORDS[numStr] ?? parseInt(numStr, 10);
        if (!isNaN(count) && count > 0 && count <= 20) {
          return { count, words: [match[0]] };
        }
      }
    }

    return null;
  }

  private extractBathrooms(
    text: string,
  ): { count: number; words: string[] } | null {
    const patterns = [
      /(\d+)\s*(baño|baños|bano|banos)/i,
      /(un|uno|una|dos|tres|cuatro|cinco)\s*(baño|baños|bano|banos)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numStr = match[1].toLowerCase();
        const count = this.NUMBER_WORDS[numStr] ?? parseInt(numStr, 10);
        if (!isNaN(count) && count > 0 && count <= 10) {
          return { count, words: [match[0]] };
        }
      }
    }

    return null;
  }

  private extractParking(
    text: string,
  ): { count: number; words: string[] } | null {
    const normalizedText = this.removeAccents(text);
    const parkingKeywords = [
      'parqueadero',
      'parqueaderos',
      'garaje',
      'garajes',
      'parking',
      'cochera',
    ];

    for (const keyword of parkingKeywords) {
      if (normalizedText.includes(keyword)) {
        const pattern = new RegExp(
          `(\\d+|un|uno|una|dos|tres)\\s*${keyword}`,
          'i',
        );
        const match = text.match(pattern);

        if (match) {
          const numStr = match[1].toLowerCase();
          const count = this.NUMBER_WORDS[numStr] ?? parseInt(numStr, 10);
          return { count: isNaN(count) ? 1 : count, words: [match[0]] };
        }

        return { count: 1, words: [keyword] };
      }
    }

    return null;
  }

  private extractArea(
    text: string,
  ): { minArea?: number; maxArea?: number; words: string[] } | null {
    const patterns = [
      /(\d+)\s*(?:a|hasta|-)\s*(\d+)\s*(?:m2|metros|mts)/i,
      /(\d+)\s*(?:m2|metros|mts)/i,
      /mas de\s*(\d+)\s*(?:m2|metros|mts)/i,
      /menos de\s*(\d+)\s*(?:m2|metros|mts)/i,
    ];

    // Range pattern
    const rangeMatch = text.match(patterns[0]);
    if (rangeMatch) {
      return {
        minArea: parseInt(rangeMatch[1], 10),
        maxArea: parseInt(rangeMatch[2], 10),
        words: [rangeMatch[0]],
      };
    }

    // "más de X m2"
    const moreMatch = text.match(patterns[2]);
    if (moreMatch) {
      return {
        minArea: parseInt(moreMatch[1], 10),
        words: [moreMatch[0]],
      };
    }

    // "menos de X m2"
    const lessMatch = text.match(patterns[3]);
    if (lessMatch) {
      return {
        maxArea: parseInt(lessMatch[1], 10),
        words: [lessMatch[0]],
      };
    }

    // Single value (treat as approximate)
    const singleMatch = text.match(patterns[1]);
    if (singleMatch) {
      const area = parseInt(singleMatch[1], 10);
      return {
        minArea: Math.max(10, area - 20),
        maxArea: area + 20,
        words: [singleMatch[0]],
      };
    }

    return null;
  }

  private extractStratum(
    text: string,
  ): { stratum: number; words: string[] } | null {
    const patterns = [
      /estrato\s*(\d)/i,
      /stratum\s*(\d)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const stratum = parseInt(match[1], 10);
        if (stratum >= 1 && stratum <= 6) {
          return { stratum, words: [match[0]] };
        }
      }
    }

    return null;
  }

  private extractFloor(
    text: string,
  ): { floor: number; words: string[] } | null {
    const patterns = [
      /piso\s*(\d+)/i,
      /(primer|segundo|tercer|cuarto|quinto|sexto|septimo|octavo|noveno|decimo)\s*piso/i,
      /(\d+)\s*(?:er|do|ro|to|vo|mo)\s*piso/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numStr = match[1].toLowerCase();
        const floor = this.NUMBER_WORDS[numStr] ?? parseInt(numStr, 10);
        if (!isNaN(floor) && floor >= 1 && floor <= 50) {
          return { floor, words: [match[0]] };
        }
      }
    }

    return null;
  }

  private extractAmenities(
    text: string,
  ): { amenities: string[]; words: string[] } {
    const amenities: string[] = [];
    const words: string[] = [];
    const normalizedText = this.removeAccents(text);

    for (const [keyword, amenityId] of Object.entries(this.AMENITY_KEYWORDS)) {
      const normalizedKeyword = this.removeAccents(keyword);
      if (
        normalizedText.includes(normalizedKeyword) &&
        !amenities.includes(amenityId)
      ) {
        // Don't add 'parking' as amenity if we already detected parking spaces
        if (
          amenityId !== 'parking' ||
          !normalizedText.match(/\d+\s*parqueadero/i)
        ) {
          amenities.push(amenityId);
          words.push(keyword);
        }
      }
    }

    return { amenities, words };
  }

  private extractPriceHints(
    text: string,
  ): { minPrice?: number; maxPrice?: number; words: string[] } | null {
    const words: string[] = [];
    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    // Range pattern: "1 a 2 millones", "entre 1 y 2 millones"
    const rangePattern = /(\d+(?:[.,]\d+)?)\s*(?:a|y|-|hasta)\s*(\d+(?:[.,]\d+)?)\s*(millon|millones|mill|M|pesos)/gi;
    const rangeMatches = [...text.matchAll(rangePattern)];
    if (rangeMatches.length > 0) {
      const match = rangeMatches[0];
      const num1 = parseFloat(match[1].replace(',', '.'));
      const num2 = parseFloat(match[2].replace(',', '.'));
      const unit = match[3].toLowerCase();

      const multiplier = unit.includes('peso') ? 1 : 1000000;
      minPrice = num1 * multiplier;
      maxPrice = num2 * multiplier;
      words.push(match[0]);
    }

    // Single price pattern: "2 millones", "hasta 3M"
    if (!minPrice && !maxPrice) {
      const singlePattern = /(?:hasta|menos de|maximo|máximo)?\s*(\d+(?:[.,]\d+)?)\s*(millon|millones|mill|M)/gi;
      const singleMatches = [...text.matchAll(singlePattern)];

      if (singleMatches.length > 0) {
        const prices = singleMatches.map((m) => {
          const num = parseFloat(m[1].replace(',', '.'));
          words.push(m[0]);
          return num * 1000000;
        });

        if (prices.length === 1) {
          // Check if it's "hasta X" or "menos de X"
          const hasMax = /hasta|menos de|maximo|máximo/i.test(text);
          if (hasMax) {
            maxPrice = prices[0];
          } else {
            // Treat single value as approximate max
            maxPrice = prices[0];
          }
        } else if (prices.length >= 2) {
          minPrice = Math.min(...prices);
          maxPrice = Math.max(...prices);
        }
      }
    }

    // Price keywords
    const normalizedText = this.removeAccents(text);
    if (normalizedText.includes('barato') || normalizedText.includes('economico')) {
      maxPrice = maxPrice ?? 2000000;
      if (!words.includes('barato')) words.push('barato');
    }
    if (normalizedText.includes('lujoso') || normalizedText.includes('premium') || normalizedText.includes('exclusivo')) {
      minPrice = minPrice ?? 5000000;
      if (!words.includes('lujoso')) words.push('lujoso');
    }

    if (words.length > 0) {
      return { minPrice, maxPrice, words };
    }

    return null;
  }

  private buildRemainingText(text: string, usedWords: Set<string>): string {
    const stopwords = new Set([
      'busco', 'necesito', 'quiero', 'en', 'con', 'y', 'de', 'la', 'el', 'los', 'las',
      'un', 'una', 'unos', 'unas', 'para', 'por', 'que', 'se', 'al', 'del',
      'arriendo', 'alquiler', 'renta', 'cerca', 'zona', 'sector', 'a', 'o',
      'mi', 'me', 'te', 'su', 'sus', 'muy', 'mas', 'pero', 'como', 'donde',
    ]);

    let remaining = text;

    for (const word of usedWords) {
      remaining = remaining.replace(new RegExp(this.escapeRegex(word), 'gi'), ' ');
    }

    const resultWords = remaining
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w.toLowerCase()));

    return resultWords.join(' ').trim();
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
