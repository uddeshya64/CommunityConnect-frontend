import { api } from "@/lib/axios";

export interface LocationSuggestion {
  mapboxId?: string;
  name: string;
  address: string;
}

export interface DetectedLocation {
  name: string;
  address: string;
  fullAddress: string;
  city?: string;
  state?: string;
  country?: string;
}

export const locationService = {
  /**
   * Search for locations matching query (min 3 chars).
   */
  search: async (query: string, signal?: AbortSignal): Promise<LocationSuggestion[]> => {
    const term = (query || "").trim();
    if (term.length < 3) return [];

    try {
      const response = await api.get("/locations/search", {
        params: { q: term },
        signal,
      });
      return response.data?.data || [];
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return [];
      }
      // If /locations/search had issue, try fallback /location/search
      try {
        const fallback = await api.get("/location/search", {
          params: { q: term },
          signal,
        });
        return fallback.data?.data || [];
      } catch {
        return [];
      }
    }
  },

  /**
   * Reverse geocode precise latitude and longitude into real-world address/city.
   */
  reverseGeocode: async (lat: number, lng: number): Promise<DetectedLocation | null> => {
    try {
      const response = await api.get("/locations/reverse", {
        params: { lat, lng },
      });
      return response.data?.data || null;
    } catch {
      try {
        const fallback = await api.get("/location/reverse", {
          params: { lat, lng },
        });
        return fallback.data?.data || null;
      } catch {
        return null;
      }
    }
  },

  /**
   * Fetch user's accurate GPS coordinates via Browser Geolocation API.
   */
  getCurrentCoordinates: (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (error) => {
          const messages: Record<number, string> = {
            1: "Location permission was denied. Please allow location access in your browser.",
            2: "Location position unavailable. Please check your GPS/network.",
            3: "Location request timed out. Please try again.",
          };
          reject(new Error(messages[error.code] || "Could not retrieve your current location."));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  },

  /**
   * Convenience method: Get coordinates and resolve to readable address.
   */
  detectCurrentLocation: async (): Promise<string> => {
    const coords = await locationService.getCurrentCoordinates();
    const resolved = await locationService.reverseGeocode(coords.lat, coords.lng);
    if (resolved?.fullAddress) {
      return resolved.fullAddress;
    }
    if (resolved?.name && resolved?.city) {
      return `${resolved.name}, ${resolved.city}`;
    }
    return `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
  },
};
