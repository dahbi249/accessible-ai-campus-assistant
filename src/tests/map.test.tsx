import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CampusMapView } from '../components/CampusMap/CampusMapView';
import { TRANSLATIONS } from '../i18n/translations';
import { setApiMode } from '../services/api';

vi.mock('leaflet', () => {
  const noopChain = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
  };
  const mapMock = {
    setView: vi.fn(),
    fitBounds: vi.fn(),
    closePopup: vi.fn(),
    invalidateSize: vi.fn(),
    remove: vi.fn(),
  };
  return {
    default: {
      map: vi.fn(() => mapMock),
      tileLayer: vi.fn(() => noopChain),
      layerGroup: vi.fn(() => noopChain),
      marker: vi.fn(() => noopChain),
      divIcon: vi.fn(() => ({})),
      latLngBounds: vi.fn(() => ({
        extend: vi.fn(),
        isValid: vi.fn(() => true),
      })),
    },
  };
});

beforeEach(() => {
  setApiMode('mock');
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CampusMapView Locate Me & walking distance', () => {
  it('displays client-side walking distances on facility cards when geolocation succeeds', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 22.788,
          longitude: 5.525,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(
      <CampusMapView
        language="en"
        apiMode="mock"
        t={TRANSLATIONS.en}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Rectorate & Central Administration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.en.map.locateMe }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByText(TRANSLATIONS.en.map.locationPrivacyNote)).toBeInTheDocument();

    const walkingBadges = screen.getAllByText(/min walk/i);
    expect(walkingBadges.length).toBeGreaterThan(0);
  });

  it('displays accessible permission denied message when geolocation is rejected', async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
      error?.({
        code: 1,
        message: 'User denied Geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(
      <CampusMapView
        language="en"
        apiMode="mock"
        t={TRANSLATIONS.en}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Rectorate & Central Administration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: TRANSLATIONS.en.map.locateMe }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(TRANSLATIONS.en.map.locationPermissionDenied);
  });
});
