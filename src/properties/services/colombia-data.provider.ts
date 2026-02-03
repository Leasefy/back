import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

interface DepartmentData {
  id: number;
  departamento: string;
  ciudades: string[];
}

/**
 * Provider for Colombian geographic data.
 * Loads all 1124+ municipalities from JSON file.
 */
@Injectable()
export class ColombiaDataProvider implements OnModuleInit {
  private departments: Map<string, string[]> = new Map();
  private allMunicipalities: Set<string> = new Set();
  private normalizedMunicipalities: Map<string, string> = new Map();

  // Major cities that should be prioritized in search
  private readonly MAJOR_CITIES = new Set([
    'bogota', 'medellin', 'cali', 'barranquilla', 'cartagena',
    'bucaramanga', 'pereira', 'manizales', 'cucuta', 'ibague',
    'santa marta', 'villavicencio', 'pasto', 'monteria', 'neiva',
    'armenia', 'popayan', 'valledupar', 'tunja', 'florencia',
    'sincelejo', 'riohacha', 'quibdo', 'yopal', 'mocoa',
  ]);

  onModuleInit() {
    this.loadData();
  }

  private loadData() {
    try {
      const filePath = join(__dirname, 'colombia-municipalities.json');
      const rawData = readFileSync(filePath, 'utf-8');
      const data: DepartmentData[] = JSON.parse(rawData);

      for (const dept of data) {
        const deptName = dept.departamento;
        this.departments.set(deptName.toLowerCase(), dept.ciudades);

        for (const city of dept.ciudades) {
          this.allMunicipalities.add(city);
          // Store normalized version for flexible matching
          const normalized = this.normalize(city);
          this.normalizedMunicipalities.set(normalized, city);
        }
      }

      console.log(`[ColombiaDataProvider] Loaded ${this.departments.size} departments, ${this.allMunicipalities.size} municipalities`);
    } catch (error) {
      console.warn('[ColombiaDataProvider] Failed to load municipalities, using fallback');
      this.loadFallbackData();
    }
  }

  private loadFallbackData() {
    // Fallback with major cities if JSON fails to load
    const fallbackCities = [
      'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
      'Bucaramanga', 'Pereira', 'Manizales', 'Cúcuta', 'Ibagué',
      'Santa Marta', 'Villavicencio', 'Pasto', 'Montería', 'Neiva',
      'Armenia', 'Popayán', 'Valledupar', 'Tunja', 'Florencia',
      'Sincelejo', 'Riohacha', 'Quibdó', 'Yopal', 'Mocoa',
      'Leticia', 'Arauca', 'Inírida', 'San José del Guaviare',
      'Mitú', 'Puerto Carreño', 'Sogamoso', 'Duitama', 'Chiquinquirá',
      'Zipaquirá', 'Facatativá', 'Girardot', 'Fusagasugá', 'Soacha',
      'Envigado', 'Itagüí', 'Bello', 'Rionegro', 'Apartadó',
      'Palmira', 'Buenaventura', 'Tuluá', 'Buga', 'Cartago',
      'Soledad', 'Malambo', 'Maicao', 'Riohacha', 'Valledupar',
    ];

    for (const city of fallbackCities) {
      this.allMunicipalities.add(city);
      this.normalizedMunicipalities.set(this.normalize(city), city);
    }
  }

  /**
   * Normalize text for matching (lowercase, remove accents).
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Check if a word matches any municipality.
   * Returns the properly capitalized municipality name if found.
   */
  findMunicipality(word: string): string | null {
    const normalized = this.normalize(word);

    // Direct match
    if (this.normalizedMunicipalities.has(normalized)) {
      return this.normalizedMunicipalities.get(normalized)!;
    }

    // Check if it's a major city (faster path)
    if (this.MAJOR_CITIES.has(normalized)) {
      // Find the proper capitalization
      for (const [norm, original] of this.normalizedMunicipalities) {
        if (norm === normalized) {
          return original;
        }
      }
    }

    return null;
  }

  /**
   * Find municipality in a text string.
   * Checks for multi-word cities like "Santa Marta".
   */
  findMunicipalityInText(text: string): { municipality: string; matchedText: string } | null {
    const normalizedText = this.normalize(text);

    // First check major cities (common case, fast path)
    for (const majorCity of this.MAJOR_CITIES) {
      if (normalizedText.includes(majorCity)) {
        const original = this.normalizedMunicipalities.get(majorCity);
        if (original) {
          return { municipality: original, matchedText: majorCity };
        }
      }
    }

    // Check multi-word municipalities first (e.g., "Santa Marta", "San Andrés")
    for (const [normalized, original] of this.normalizedMunicipalities) {
      if (normalized.includes(' ') && normalizedText.includes(normalized)) {
        return { municipality: original, matchedText: normalized };
      }
    }

    // Then check single-word municipalities
    const words = normalizedText.split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue; // Skip short words
      const found = this.normalizedMunicipalities.get(word);
      if (found) {
        return { municipality: found, matchedText: word };
      }
    }

    return null;
  }

  /**
   * Check if a municipality is a major city.
   */
  isMajorCity(municipality: string): boolean {
    return this.MAJOR_CITIES.has(this.normalize(municipality));
  }

  /**
   * Get all municipalities (for autocomplete, etc.).
   */
  getAllMunicipalities(): string[] {
    return Array.from(this.allMunicipalities);
  }

  /**
   * Get municipalities by department.
   */
  getMunicipalitiesByDepartment(department: string): string[] {
    return this.departments.get(department.toLowerCase()) ?? [];
  }

  /**
   * Get all department names.
   */
  getDepartments(): string[] {
    return Array.from(this.departments.keys()).map(
      (d) => d.charAt(0).toUpperCase() + d.slice(1),
    );
  }
}
