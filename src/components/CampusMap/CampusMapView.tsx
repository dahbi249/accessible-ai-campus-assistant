import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Accessibility,
  AlertCircle,
  Clock,
  Compass,
  ExternalLink,
  Footprints,
  LocateFixed,
  MapPin,
  MessageSquare,
  Navigation,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TranslationStrings } from '../../i18n/translations';
import {
  buildGoogleMapsUrl,
  campusApi,
  TAMANRASSET_CAMPUS_CENTER,
} from '../../services/api';
import type { ApiMode, CampusLocation, SupportedLanguage } from '../../types/api';
import { type Coordinates, estimateWalking } from '../../utils/geoDistance';

interface CampusMapViewProps {
  language: SupportedLanguage;
  apiMode: ApiMode;
  onAskAboutLocation?: (prompt: string) => void;
  t: TranslationStrings;
}

const LOCATION_CATEGORIES = [
  'all',
  'faculty',
  'administration',
  'library',
  'student_services',
  'accessibility',
] as const;

function createPinIcon(isSelected: boolean): L.DivIcon {
  const fill = isSelected ? '#10b981' : '#1f2937';
  const ring = isSelected
    ? 'box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.32);'
    : 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);';
  return L.divIcon({
    className: 'custom-campus-pin',
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:${fill};border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;${ring}"><div style="width:8px;height:8px;border-radius:9999px;background:#ffffff;"></div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-user-location-pin',
    html: '<div style="width:24px;height:24px;border-radius:9999px;background:#3b82f6;border:3px solid #ffffff;box-shadow:0 0 0 6px rgba(59,130,246,0.32);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;border-radius:9999px;background:#ffffff;"></div></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getLocalizedName(loc: CampusLocation, language: SupportedLanguage): string {
  return loc.localizedNames?.[language] ?? loc.name;
}

function getLocalizedDescription(loc: CampusLocation, language: SupportedLanguage): string {
  return loc.localizedDescriptions?.[language] ?? loc.description;
}

function getLocalizedBuilding(loc: CampusLocation, language: SupportedLanguage): string | null {
  return loc.localizedBuildings?.[language] ?? loc.building ?? null;
}

function getLocalizedAccessibilityNote(
  loc: CampusLocation,
  language: SupportedLanguage
): string | null {
  return loc.localizedAccessibilityNotes?.[language] ?? loc.accessibility_notes ?? null;
}

export function CampusMapView({
  language,
  apiMode,
  onAskAboutLocation,
  t,
}: CampusMapViewProps) {
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFittedBoundsKeyRef = useRef<string>('');

  const loadLocations = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await campusApi.getCampusLocations(
        { q: searchQuery.trim() || undefined },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) {
        return;
      }
      setLocations(response.items);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setErrorMessage(
        error instanceof Error ? error.message : t.map.errorTitle
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchQuery, t.map.errorTitle]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLocations();
    }, 180);
    return () => {
      window.clearTimeout(timer);
      abortControllerRef.current?.abort();
    };
  }, [loadLocations, apiMode]);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesCategory =
        selectedCategory === 'all' || loc.category === selectedCategory;
      const matchesAccessible =
        !accessibleOnly || loc.wheelchair_accessible === true;
      return matchesCategory && matchesAccessible;
    });
  }, [locations, selectedCategory, accessibleOnly]);

  useEffect(() => {
    setSelectedLocationId((prev) => {
      if (prev === null) {
        return null;
      }
      return filteredLocations.some((loc) => String(loc.id) === String(prev))
        ? prev
        : null;
    });
  }, [filteredLocations]);

  const getCategoryLabel = useCallback(
    (category: string) => t.map.categories[category] ?? category,
    [t.map.categories]
  );

  const handleRecenterCampus = useCallback(() => {
    const map = mapInstanceRef.current;
    setSelectedLocationId(null);
    if (!map) {
      return;
    }
    map.closePopup();
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    map.setView(
      [TAMANRASSET_CAMPUS_CENTER.latitude, TAMANRASSET_CAMPUS_CENTER.longitude],
      TAMANRASSET_CAMPUS_CENTER.zoom,
      { animate: !prefersReducedMotion }
    );
  }, []);

    const handleLocateMe = useCallback(() => {
    setLocationError(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== 'function'
    ) {
      setLocationError(t.map.locationUnsupportedError);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserPosition(coords);
        setIsLocating(false);

        const map = mapInstanceRef.current;
        if (map) {
          const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
          ).matches;
          map.setView([coords.latitude, coords.longitude], 17, {
            animate: !prefersReducedMotion,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocationError(t.map.locationPermissionDenied);
        } else {
          setLocationError(t.map.locationUnavailableError);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [
    t.map.locationPermissionDenied,
    t.map.locationUnavailableError,
    t.map.locationUnsupportedError,
  ]);

  const handleClearUserPosition = useCallback(() => {
    setUserPosition(null);
    setLocationError(null);
  }, []);

  // Initialize Leaflet centered on University of Tamanrasset (Route de l'Aéroport)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) {
      return;
    }

    const map = L.map(container, {
      center: [
        TAMANRASSET_CAMPUS_CENTER.latitude,
        TAMANRASSET_CAMPUS_CENTER.longitude,
      ],
      zoom: TAMANRASSET_CAMPUS_CENTER.zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    const userGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;
    userLayerRef.current = userGroup;

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize({ animate: false });
          })
        : null;

    resizeObserver?.observe(container);

    const initTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 120);

    return () => {
      window.clearTimeout(initTimer);
      resizeObserver?.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      userLayerRef.current = null;
      markerMapRef.current.clear();
    };
  }, []);

  // Render on-device user position marker (never transmitted to backend)
  useEffect(() => {
    const userLayer = userLayerRef.current;
    if (!userLayer) {
      return;
    }
    userLayer.clearLayers();
    if (!userPosition) {
      return;
    }

    const isRtl = language === 'ar';
    const userMarker = L.marker([userPosition.latitude, userPosition.longitude], {
      icon: createUserLocationIcon(),
      title: t.map.youAreHere,
    });
    userMarker.bindPopup(
      `<div dir="${isRtl ? 'rtl' : 'ltr'}" style="font-size:12px;font-weight:600;color:#93c5fd;">${escapeHtml(
        t.map.youAreHere
      )}</div>`
    );
    userMarker.addTo(userLayer);
  }, [userPosition, language, t.map.youAreHere]);

  // Render markers and Google Maps action button inside each popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    markerMapRef.current.clear();

    if (filteredLocations.length === 0) {
      return;
    }

    const bounds = L.latLngBounds([]);
    const isRtl = language === 'ar';

    for (const loc of filteredLocations) {
      const locKey = String(loc.id);
      const isSelected =
        selectedLocationId !== null && String(selectedLocationId) === locKey;

      const displayName = getLocalizedName(loc, language);
      const displayDescription = getLocalizedDescription(loc, language);
      const displayBuilding = getLocalizedBuilding(loc, language);
      const accessNote = getLocalizedAccessibilityNote(loc, language);
      const mapsUrl = buildGoogleMapsUrl({
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.name,
      });

      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: createPinIcon(isSelected),
        title: displayName,
      });

      const metaParts = [getCategoryLabel(loc.category)];
      if (displayBuilding) {
        metaParts.push(displayBuilding);
      }

      const hoursHtml = loc.opening_hours
        ? `<div style="font-size:11px;color:#d4d4d4;margin-bottom:4px;">${escapeHtml(
            t.map.openingHoursLabel
          )}: ${escapeHtml(loc.opening_hours)}</div>`
        : '';

      const accessHtml = loc.wheelchair_accessible
        ? `<div style="font-size:11px;color:#34d399;margin-bottom:6px;">♿ ${escapeHtml(
            accessNote ?? t.map.accessibleBadge
          )}</div>`
        : '';

      const walkingEstimate = userPosition
        ? estimateWalking(userPosition, {
            latitude: loc.latitude,
            longitude: loc.longitude,
          })
        : null;
      const walkingHtml = walkingEstimate
        ? `<div style="font-size:11px;color:#93c5fd;margin-bottom:6px;">🚶 ${escapeHtml(
            t.map.walkingDistanceLabel(walkingEstimate.meters, walkingEstimate.minutes)
          )}</div>`
        : '';

      const popupHtml = `
        <div dir="${isRtl ? 'rtl' : 'ltr'}" style="min-width:230px;max-width:280px;font-size:13px;line-height:1.5;text-align:${isRtl ? 'right' : 'left'};">
          <div style="font-size:11px;color:#a3a3a3;margin-bottom:4px;">${metaParts
            .map(escapeHtml)
            .join(' · ')}</div>
          <div style="font-weight:600;color:#f5f5f5;margin-bottom:6px;">${escapeHtml(
            displayName
          )}</div>
          <div style="color:#d4d4d4;font-size:12px;margin-bottom:8px;">${escapeHtml(
            displayDescription
          )}</div>
          ${hoursHtml}
          ${accessHtml}
          ${walkingHtml}
          <div dir="ltr" style="font-family:monospace;font-size:11px;color:#34d399;margin-bottom:10px;unicode-bidi:isolate;">
            ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}
          </div>
          <a
            href="${escapeHtml(mapsUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            style="display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px 12px;border-radius:8px;background:#10b981;color:#052e16;font-weight:600;font-size:12px;text-decoration:none;box-sizing:border-box;"
          >
            <span>${escapeHtml(t.map.openInGoogleMaps)}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        setSelectedLocationId(loc.id);
      });

      marker.addTo(layer);
      markerMapRef.current.set(locKey, marker);
      bounds.extend([loc.latitude, loc.longitude]);
    }

    const boundsKey = filteredLocations.map((loc) => String(loc.id)).join(',');
    if (
      bounds.isValid() &&
      selectedLocationId === null &&
      lastFittedBoundsKeyRef.current !== boundsKey
    ) {
      lastFittedBoundsKeyRef.current = boundsKey;
      map.fitBounds(bounds, { padding: [52, 52], maxZoom: 17 });
    }
  }, [
    filteredLocations,
    selectedLocationId,
    userPosition,
    language,
    getCategoryLabel,
    t.map.openInGoogleMaps,
    t.map.openingHoursLabel,
    t.map.accessibleBadge,
    t.map.walkingDistanceLabel,
  ]);

  // Focus selected marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedLocationId === null) {
      return;
    }
    const locKey = String(selectedLocationId);
    const target = filteredLocations.find((loc) => String(loc.id) === locKey);
    const marker = markerMapRef.current.get(locKey);
    if (!target || !marker) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    map.setView([target.latitude, target.longitude], 17, {
      animate: !prefersReducedMotion,
    });
    marker.openPopup();
  }, [selectedLocationId, filteredLocations]);

  const campusOverviewUrl = useMemo(
    () =>
      buildGoogleMapsUrl({
        latitude: TAMANRASSET_CAMPUS_CENTER.latitude,
        longitude: TAMANRASSET_CAMPUS_CENTER.longitude,
        name: 'University of Tamanrasset',
      }),
    []
  );

  return (
    <section aria-label={t.map.title} className="space-y-5">
      {/* Header, Search & Category Controls */}
      <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-neutral-100">{t.map.title}</h1>
            <p className="text-sm text-neutral-400 max-w-3xl">{t.map.description}</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{t.map.campusAddress}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isLoading && !errorMessage && (
              <span className="text-xs font-medium text-neutral-400 tabular-nums whitespace-nowrap px-2">
                {t.map.locationsCount(filteredLocations.length)}
              </span>
            )}

            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200 ease-out whitespace-nowrap min-h-[38px] ${
                userPosition
                  ? 'border-blue-500/60 bg-blue-950/50 text-blue-200 hover:border-blue-400'
                  : 'border-neutral-800 bg-[#181818] text-neutral-200 hover:border-neutral-600 hover:text-white'
              } disabled:opacity-60`}
            >
              <LocateFixed className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
              <span>{isLocating ? t.map.locating : t.map.locateMe}</span>
            </button>

            {userPosition && (
              <button
                type="button"
                onClick={handleClearUserPosition}
                aria-label={t.map.clearMyLocation}
                title={t.map.clearMyLocation}
                className="inline-flex items-center justify-center w-9 h-[38px] rounded-lg border border-neutral-800 bg-[#181818] text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={handleRecenterCampus}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-800 bg-[#181818] text-xs font-medium text-neutral-200 hover:border-neutral-600 hover:text-white transition-all duration-200 ease-out whitespace-nowrap min-h-[38px]"
            >
              <Compass className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
              <span>{t.map.recenterCampus}</span>
            </button>

            <a
              href={campusOverviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-semibold hover:bg-emerald-400 transition-all duration-200 ease-out whitespace-nowrap min-h-[38px]"
            >
              <Navigation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.map.openInGoogleMaps}</span>
              <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>

        {(userPosition || locationError) && (
          <div className="mt-3">
            {locationError ? (
              <div
                role="alert"
                className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-lg border border-amber-800/60 bg-amber-950/30 text-xs text-amber-200"
              >
                <span>{locationError}</span>
                <button
                  type="button"
                  onClick={() => setLocationError(null)}
                  aria-label={t.map.clearMyLocation}
                  className="text-amber-300 hover:text-white shrink-0"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div
                role="status"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-blue-900/50 bg-blue-950/25 text-xs text-blue-200"
              >
                <LocateFixed className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
                <span>{t.map.locationPrivacyNote}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
          <div className="relative flex-1">
            <label htmlFor="location-search-input" className="sr-only">
              {t.map.searchLabel}
            </label>
            <Search
              className="w-4 h-4 text-neutral-500 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="location-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.map.searchPlaceholder}
              className="w-full rounded-xl border border-neutral-800 bg-[#181818] ps-10 pe-10 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-700 focus:outline-none min-h-[44px] transition-colors"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t.map.clearSearch}
                className="absolute top-1/2 -translate-y-1/2 end-2.5 p-1.5 text-neutral-400 hover:text-neutral-100 rounded"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="group"
              aria-label={t.map.title}
              className="flex items-center gap-1 p-1 bg-[#181818] border border-neutral-800 rounded-xl overflow-x-auto max-w-full"
            >
              {LOCATION_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                const label =
                  cat === 'all' ? t.map.filterAll : getCategoryLabel(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedLocationId(null);
                    }}
                    aria-pressed={isActive}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[36px] ${
                      isActive
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setAccessibleOnly((prev) => !prev);
                setSelectedLocationId(null);
              }}
              aria-pressed={accessibleOnly}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 ease-out whitespace-nowrap shrink-0 min-h-[44px] ${
                accessibleOnly
                  ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                  : 'border-neutral-800 bg-[#181818] text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <Accessibility className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.map.accessibleOnlyFilter}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Directory + Interactive Map Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <aside
          aria-label={t.map.directoryHeading}
          className="lg:col-span-4 bg-[#121212] border border-white/10 rounded-2xl overflow-hidden flex flex-col min-h-[380px] lg:h-[650px]"
        >
          <div className="px-5 py-4 border-b border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-100">
              {t.map.directoryHeading}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400">{t.map.selectPrompt}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-5 space-y-4 animate-pulse" aria-label={t.map.loading}>
                {[1, 2, 3, 4].map((row) => (
                  <div key={row} className="space-y-2">
                    <div className="h-3 w-24 bg-neutral-800 rounded" />
                    <div className="h-4 w-3/4 bg-neutral-800 rounded" />
                    <div className="h-3 w-full bg-neutral-900 rounded" />
                  </div>
                ))}
              </div>
            ) : errorMessage ? (
              <div role="alert" className="p-6 space-y-3">
                <div className="flex items-start gap-2.5 text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-red-100">{t.map.errorTitle}</p>
                    <p className="text-xs text-red-300 mt-1">{errorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadLocations()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-700 bg-[#1a1a1a] text-xs font-medium text-neutral-100 hover:border-neutral-500 transition-colors min-h-[40px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.map.retry}</span>
                </button>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="p-6">
                <h3 className="text-sm font-medium text-neutral-100">{t.map.emptyTitle}</h3>
                <p className="mt-1 text-xs text-neutral-400">{t.map.emptyBody}</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-800/80">
                {filteredLocations.map((loc) => {
                  const isSelected =
                    selectedLocationId !== null &&
                    String(loc.id) === String(selectedLocationId);
                  const displayName = getLocalizedName(loc, language);
                  const displayDescription = getLocalizedDescription(loc, language);
                  const displayBuilding = getLocalizedBuilding(loc, language);
                  const accessNote = getLocalizedAccessibilityNote(loc, language);
                  const walkingEstimate = userPosition
                    ? estimateWalking(userPosition, {
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                      })
                    : null;
                  const mapsUrl = buildGoogleMapsUrl({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    name: loc.name,
                  });

                  return (
                    <li
                      key={String(loc.id)}
                      className={`p-4 transition-all duration-200 ease-out ${
                        isSelected
                          ? 'bg-neutral-900/90'
                          : 'bg-[#121212] hover:bg-neutral-900/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedLocationId(loc.id)}
                        aria-pressed={isSelected}
                        className="w-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-neutral-400">
                          <span className="font-medium text-neutral-300 truncate">
                            {getCategoryLabel(loc.category)}
                            {displayBuilding ? ` · ${displayBuilding}` : ''}
                          </span>
                          <span
                            dir="ltr"
                            className="font-mono text-[11px] tabular-nums shrink-0 text-emerald-400/90"
                          >
                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-start gap-2">
                          <MapPin
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isSelected ? 'text-emerald-400' : 'text-neutral-500'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="text-sm font-semibold text-neutral-100 leading-snug">
                            {displayName}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed ps-6">
                          {displayDescription}
                        </p>

                        {(loc.opening_hours || loc.wheelchair_accessible || walkingEstimate) && (
                          <div className="mt-2 ps-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                            {walkingEstimate && (
                              <span className="inline-flex items-center gap-1 text-blue-300 font-medium tabular-nums">
                                <Footprints className="w-3 h-3 shrink-0" aria-hidden="true" />
                                <span>
                                  {t.map.walkingDistanceLabel(
                                    walkingEstimate.meters,
                                    walkingEstimate.minutes
                                  )}
                                </span>
                              </span>
                            )}
                            {loc.opening_hours && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-neutral-500" aria-hidden="true" />
                                <span dir="ltr">{loc.opening_hours}</span>
                              </span>
                            )}
                            {loc.wheelchair_accessible && (
                              <span
                                title={accessNote ?? t.map.accessibleBadge}
                                className="inline-flex items-center gap-1 text-emerald-300"
                              >
                                <Accessibility className="w-3 h-3" aria-hidden="true" />
                                <span>{t.map.accessibleBadge}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      <div className="mt-3 ps-6 flex flex-wrap items-center gap-2">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all duration-200 ease-out min-h-[34px]"
                        >
                          <Navigation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{t.map.openInGoogleMaps}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                        </a>

                        {onAskAboutLocation && (
                          <button
                            type="button"
                            onClick={() =>
                              onAskAboutLocation(
                                t.map.askAboutBuildingPrompt(displayName)
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-[#181818] text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-all duration-200 ease-out min-h-[34px]"
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{t.map.askAssistantAction}</span>
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Leaflet Map Canvas */}
        <div className="lg:col-span-8">
          <div
            dir="ltr"
            className="h-[650px] w-full rounded-2xl border border-white/10 overflow-hidden bg-[#121212] relative campus-dark-tiles"
          >
            <div
              ref={mapContainerRef}
              className="w-full h-full"
              aria-label={t.map.title}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
