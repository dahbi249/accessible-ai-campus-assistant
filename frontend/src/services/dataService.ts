import type {
  AnnouncementItem,
  AnnouncementsQuery,
  AnnouncementsResponse,
  CampusLocation,
  LocationsQuery,
  LocationsResponse,
  RequestOptions,
} from '../types/api';
import { normalizeSearchText } from '../utils/arabicSearch';
import {
  ApiError,
  buildUrl,
  fetchJsonWithTimeout,
  getApiMode,
  isObject,
  isSafeHttpUrl,
  simulateDelay,
} from './httpClient';
import { MOCK_ANNOUNCEMENTS, MOCK_LOCATIONS } from './mockData';

export const TAMANRASSET_CAMPUS_CENTER = {
  latitude: 22.788,
  longitude: 5.525,
  zoom: 16,
} as const;

export function buildGoogleMapsUrl(
  location: Pick<CampusLocation, 'latitude' | 'longitude' | 'name'>
): string {
  const cleanName = location.name.trim();
  const searchQuery = cleanName.toLowerCase().includes('tamanrasset')
    ? cleanName
    : `University of Tamanrasset ${cleanName}`;
  const params = new URLSearchParams({
    api: '1',
    query: searchQuery,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function validateAnnouncementItem(raw: unknown): AnnouncementItem {
  if (!isObject(raw)) {
    throw new ApiError('Invalid announcement entry.');
  }
  const validId = typeof raw.id === 'string' || typeof raw.id === 'number';
  if (!validId || typeof raw.title !== 'string' || typeof raw.content !== 'string') {
    throw new ApiError('Announcement entry missing required fields (id, title, content).');
  }
  const safeUrl =
    typeof raw.source_url === 'string' && isSafeHttpUrl(raw.source_url.trim())
      ? raw.source_url.trim()
      : null;

  return {
    id: String(raw.id),
    title: raw.title,
    content: raw.content,
    published_at: typeof raw.published_at === 'string' ? raw.published_at : null,
    event_date: typeof raw.event_date === 'string' ? raw.event_date : undefined,
    source_url: safeUrl,
    category:
      typeof raw.category === 'string' && raw.category.trim()
        ? raw.category
        : 'administrative',
  };
}

function validateAnnouncementsResponse(raw: unknown): AnnouncementsResponse {
  if (!isObject(raw) || !Array.isArray(raw.items)) {
    throw new ApiError('Response from /api/v1/announcements must contain an "items" array.');
  }
  return {
    items: raw.items.map(validateAnnouncementItem),
    total: typeof raw.total === 'number' ? raw.total : undefined,
  };
}

function validateLocationItem(raw: unknown): CampusLocation {
  if (!isObject(raw)) {
    throw new ApiError('Invalid campus location entry.');
  }
  const validId = typeof raw.id === 'string' || typeof raw.id === 'number';
  if (
    !validId ||
    typeof raw.name !== 'string' ||
    typeof raw.description !== 'string' ||
    typeof raw.latitude !== 'number' ||
    !Number.isFinite(raw.latitude) ||
    typeof raw.longitude !== 'number' ||
    !Number.isFinite(raw.longitude)
  ) {
    throw new ApiError('Campus location entry does not match expected schema.');
  }
  return {
    id: String(raw.id),
    name: raw.name,
    description: raw.description,
    building: typeof raw.building === 'string' ? raw.building : null,
    latitude: raw.latitude,
    longitude: raw.longitude,
    category: typeof raw.category === 'string' && raw.category.trim() ? raw.category : 'faculty',
    opening_hours: typeof raw.opening_hours === 'string' ? raw.opening_hours : null,
    wheelchair_accessible:
      typeof raw.wheelchair_accessible === 'boolean' ? raw.wheelchair_accessible : undefined,
    accessibility_notes:
      typeof raw.accessibility_notes === 'string' ? raw.accessibility_notes : null,
  };
}

function validateLocationsResponse(raw: unknown): LocationsResponse {
  if (!isObject(raw) || !Array.isArray(raw.items)) {
    throw new ApiError('Response from /api/v1/locations must contain an "items" array.');
  }
  return {
    items: raw.items.map(validateLocationItem),
    total: typeof raw.total === 'number' ? raw.total : undefined,
  };
}

export const dataService = {
  async getAnnouncements(
    query: AnnouncementsQuery = {},
    options?: RequestOptions
  ): Promise<AnnouncementsResponse> {
    if (getApiMode() === 'mock') {
      await simulateDelay(240, options?.signal);
      const q = normalizeSearchText(query.q ?? '');
      const category = normalizeSearchText(query.category ?? '');
      const filtered = MOCK_ANNOUNCEMENTS.filter((item) => {
        const matchesCategory =
          !category || category === 'all' || normalizeSearchText(item.category) === category;
        const searchable = [
          item.title,
          item.content,
          item.category,
          ...Object.values(item.localizedTitles ?? {}),
          ...Object.values(item.localizedContents ?? {}),
        ];
        const matchesQuery =
          !q || searchable.some((entry) => normalizeSearchText(entry).includes(q));
        return matchesCategory && matchesQuery;
      });
      const limited =
        typeof query.limit === 'number' && query.limit > 0
          ? filtered.slice(0, query.limit)
          : filtered;
      return { items: limited, total: filtered.length };
    }

    const endpoint = buildUrl('/api/v1/announcements', {
      q: query.q,
      category: query.category === 'all' ? undefined : query.category,
      limit: query.limit,
      lang: query.lang,
    });
    const payload = await fetchJsonWithTimeout(
      endpoint,
      { method: 'GET' },
      options?.signal
    );
    return validateAnnouncementsResponse(payload);
  },

  async getCampusLocations(
    query: LocationsQuery = {},
    options?: RequestOptions
  ): Promise<LocationsResponse> {
    if (getApiMode() === 'mock') {
      await simulateDelay(220, options?.signal);
      const q = normalizeSearchText(query.q ?? '');
      const filtered = MOCK_LOCATIONS.filter((loc) => {
        if (!q) return true;
        const localizedCorpus = [
          loc.name,
          loc.description,
          loc.building ?? '',
          loc.category,
          ...Object.values(loc.localizedNames ?? {}),
          ...Object.values(loc.localizedDescriptions ?? {}),
          ...Object.values(loc.localizedBuildings ?? {}),
        ];
        return localizedCorpus.some((entry) => normalizeSearchText(entry).includes(q));
      });
      return { items: filtered, total: filtered.length };
    }

    const endpoint = buildUrl('/api/v1/locations', {
      q: query.q,
    });
    const payload = await fetchJsonWithTimeout(
      endpoint,
      { method: 'GET' },
      options?.signal
    );
    return validateLocationsResponse(payload);
  },
};
