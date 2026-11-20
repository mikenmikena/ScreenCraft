import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { Scene, ShootLocation, ShootLocationPhoto } from '../types/story';
import {
  Layers,
  Users,
  MapPin,
  Search,
  Plus,
  Crosshair,
  Camera,
  Trash2,
  X,
  Maximize2,
  Compass,
  CheckCircle2,
  AlertCircle,
  Film,
  Navigation,
  Upload,
} from 'lucide-react';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_CENTER = { lat: 34.0522, lng: -118.2437 };

interface LocationMapViewProps {
  projectTitle: string;
  scenes: Scene[];
  savedLocations: ShootLocation[];
  crewCount: number;
  onUpdateLocations: (locations: ShootLocation[]) => void;
  onSwitchSubView: (view: 'stripboard' | 'cast_crew' | 'location_map') => void;
  onSelectScene: (sceneId: string) => void;
}

interface MergedShootLocation extends ShootLocation {
  linkedScenes: Scene[];
  isFromScript: boolean;
}

function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const msg = String(err instanceof Error ? err.message : err).toUpperCase();
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? String((err as { status?: unknown }).status).toUpperCase()
      : '';
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QUOTA') ||
    status === '429' ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'OVER_QUERY_LIMIT'
  );
}

interface AdvancedMarkerWithRefProps {
  location: MergedShootLocation;
  indexNumber: number;
  isSelected: boolean;
  onSelectMarker: (
    locationId: string,
    marker: google.maps.marker.AdvancedMarkerElement
  ) => void;
}

const LocationPinMarker: React.FC<AdvancedMarkerWithRefProps> = ({
  location,
  indexNumber,
  isSelected,
  onSelectMarker,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  if (location.lat === null || location.lng === null) return null;

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: location.lat, lng: location.lng }}
      title={location.name}
      zIndex={isSelected ? 1000 : 10 + indexNumber}
      onClick={() => {
        if (marker) {
          onSelectMarker(location.id, marker);
        }
      }}
    >
      <Pin
        background={isSelected ? '#ff7700' : location.photos.length > 0 ? '#0ea5e9' : '#f59e0b'}
        borderColor={isSelected ? '#ffffff' : '#181818'}
        glyphColor={isSelected ? '#111111' : '#181818'}
        scale={isSelected ? 1.25 : 1.05}
      >
        <span className="text-[10px] font-bold tabular-nums">{indexNumber}</span>
      </Pin>
    </AdvancedMarker>
  );
};

interface MapCameraControllerProps {
  pinnedLocations: MergedShootLocation[];
  panTarget: { lat: number; lng: number; zoom?: number; seq: number } | null;
  fitBoundsSeq: number;
}

const MapCameraController: React.FC<MapCameraControllerProps> = ({
  pinnedLocations,
  panTarget,
  fitBoundsSeq,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !panTarget) return;
    map.panTo({ lat: panTarget.lat, lng: panTarget.lng });
    if (panTarget.zoom) {
      map.setZoom(panTarget.zoom);
    }
  }, [map, panTarget]);

  useEffect(() => {
    if (!map || fitBoundsSeq === 0 || pinnedLocations.length === 0) return;
    if (pinnedLocations.length === 1) {
      const single = pinnedLocations[0];
      if (single.lat !== null && single.lng !== null) {
        map.panTo({ lat: single.lat, lng: single.lng });
        map.setZoom(14);
      }
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    let count = 0;
    pinnedLocations.forEach((loc) => {
      if (loc.lat !== null && loc.lng !== null) {
        bounds.extend({ lat: loc.lat, lng: loc.lng });
        count++;
      }
    });
    if (count > 0) {
      map.fitBounds(bounds, 56);
    }
  }, [map, fitBoundsSeq, pinnedLocations]);

  return null;
};

interface PlacesAutocompleteInputProps {
  disabled: boolean;
  onPlaceResolved: (resolved: {
    lat: number;
    lng: number;
    address: string;
    placeId?: string;
    displayName?: string;
  }) => void;
}

const PlacesAutocompleteInput: React.FC<PlacesAutocompleteInputProps> = ({
  disabled,
  onPlaceResolved,
}) => {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  useEffect(() => {
    if (!placesLib || disabled) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(() => {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }
      setIsSearching(true);
      setSearchError(null);

      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        sessionToken: sessionTokenRef.current,
      })
        .then((res) => {
          setSuggestions(res.suggestions || []);
        })
        .catch((err) => {
          setSuggestions([]);
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
            setSearchError('Places quota reached.');
          } else {
            setSearchError('Unable to fetch place suggestions.');
          }
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 260);

    return () => clearTimeout(timer);
  }, [placesLib, query, disabled]);

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'id'],
      });

      if (place.location) {
        onPlaceResolved({
          lat: place.location.lat(),
          lng: place.location.lng(),
          address:
            place.formattedAddress ||
            place.displayName ||
            suggestion.placePrediction.text.text,
          placeId: place.id,
          displayName: place.displayName || undefined,
        });
        setQuery('');
        setSearchError(null);
        resetSession();
      }
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        setSearchError('Places quota reached.');
      } else {
        setSearchError('Could not load coordinates for the selected place.');
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
        <input
          type="text"
          disabled={disabled || !placesLib}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            !placesLib
              ? 'Loading Google Places search...'
              : 'Search address or filming site via Google Places...'
          }
          className="w-full bg-[#171717] text-gray-200 pl-8 pr-7 py-1.5 rounded border border-[#3c3c3c] text-xs focus:outline-none focus:border-[#ff8000] disabled:opacity-50"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              resetSession();
            }}
            className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-200"
            title="Clear place search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isSearching && (
        <div className="text-[10px] text-gray-400 mt-1">Searching Google Places...</div>
      )}
      {searchError && (
        <div className="text-[10px] text-amber-400 mt-1">{searchError}</div>
      )}

      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-[#1e1e1e] border border-[#444] rounded shadow-2xl max-h-52 overflow-y-auto z-30 divide-y divide-[#2d2d2d]">
          {suggestions.map((suggestion, idx) => {
            const label = suggestion.placePrediction?.text.text || 'Place result';
            return (
              <li key={suggestion.placePrediction?.placeId || idx}>
                <button
                  type="button"
                  onClick={() => void handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-[#2c251d] text-xs text-gray-200 flex items-start gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#ff8000] shrink-0 mt-0.5" />
                  <span className="leading-snug">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

interface InnerLocationMapWorkspaceProps extends LocationMapViewProps {
  hasMapsKey: boolean;
}

const InnerLocationMapWorkspace: React.FC<InnerLocationMapWorkspaceProps> = ({
  projectTitle,
  scenes,
  savedLocations,
  crewCount,
  onUpdateLocations,
  onSwitchSubView,
  onSelectScene,
  hasMapsKey,
}) => {
  const apiStatus = useApiLoadingStatus();
  const isMapError =
    !hasMapsKey ||
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE;

  // Build merged view of script locations + custom saved locations using plain Records (no new Map)
  const mergedLocations: MergedShootLocation[] = useMemo(() => {
    const scenesByKey: Record<string, Scene[]> = {};
    const displayNameByKey: Record<string, string> = {};
    const scriptKeysOrder: string[] = [];

    scenes.forEach((sc) => {
      const rawName = (sc.location || sc.setting || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      if (!scenesByKey[key]) {
        scenesByKey[key] = [];
        displayNameByKey[key] = rawName;
        scriptKeysOrder.push(key);
      }
      scenesByKey[key].push(sc);
    });

    const savedByKey: Record<string, ShootLocation> = {};
    savedLocations.forEach((loc) => {
      const key = loc.name.trim().toLowerCase();
      if (key) savedByKey[key] = loc;
    });

    const result: MergedShootLocation[] = [];
    const seenKeys: Record<string, boolean> = {};

    scriptKeysOrder.forEach((key, index) => {
      seenKeys[key] = true;
      const existing = savedByKey[key];
      result.push({
        id: existing?.id || `loc-script-${index}-${key.replace(/[^a-z0-9]+/g, '-')}`,
        name: existing?.name || displayNameByKey[key],
        address: existing?.address,
        lat: existing?.lat ?? null,
        lng: existing?.lng ?? null,
        placeId: existing?.placeId,
        notes: existing?.notes,
        photos: existing?.photos || [],
        linkedScenes: scenesByKey[key] || [],
        isFromScript: true,
      });
    });

    savedLocations.forEach((loc) => {
      const key = loc.name.trim().toLowerCase();
      if (!seenKeys[key]) {
        seenKeys[key] = true;
        result.push({
          ...loc,
          photos: loc.photos || [],
          linkedScenes: scenesByKey[key] || [],
          isFromScript: false,
        });
      }
    });

    return result;
  }, [scenes, savedLocations]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    mergedLocations[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [pinFilter, setPinFilter] = useState<'all' | 'pinned' | 'unpinned'>('all');
  const [isPinDropMode, setIsPinDropMode] = useState(false);

  // Manual coordinate inputs synced with selected location
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Add custom location modal/inline state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customLocName, setCustomLocName] = useState('');
  const [confirmDeleteLocId, setConfirmDeleteLocId] = useState<string | null>(null);

  // Active InfoWindow marker state
  const [activeMarker, setActiveMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [infoLocationId, setInfoLocationId] = useState<string | null>(null);

  // Map camera states
  const [panTarget, setPanTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    seq: number;
  } | null>(null);
  const [fitBoundsSeq, setFitBoundsSeq] = useState(0);

  // Photo lightbox modal state
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    caption?: string;
    locationName: string;
  } | null>(null);

  const selectedLocation = useMemo(() => {
    return (
      mergedLocations.find((l) => l.id === selectedLocationId) ||
      mergedLocations[0] ||
      null
    );
  }, [mergedLocations, selectedLocationId]);

  useEffect(() => {
    if (selectedLocation) {
      setLatInput(selectedLocation.lat !== null ? String(selectedLocation.lat) : '');
      setLngInput(selectedLocation.lng !== null ? String(selectedLocation.lng) : '');
      setAddressInput(selectedLocation.address || '');
      setNotesInput(selectedLocation.notes || '');
      setCoordError(null);
    }
  }, [selectedLocation?.id, selectedLocation?.lat, selectedLocation?.lng, selectedLocation?.address, selectedLocation?.notes]);

  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mergedLocations.filter((loc) => {
      const isPinned = loc.lat !== null && loc.lng !== null;
      if (pinFilter === 'pinned' && !isPinned) return false;
      if (pinFilter === 'unpinned' && isPinned) return false;
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        (loc.address && loc.address.toLowerCase().includes(q)) ||
        loc.linkedScenes.some(
          (s) =>
            s.heading.toLowerCase().includes(q) ||
            String(s.sceneNumber).includes(q)
        )
      );
    });
  }, [mergedLocations, searchQuery, pinFilter]);

  const pinnedLocations = useMemo(
    () => mergedLocations.filter((l) => l.lat !== null && l.lng !== null),
    [mergedLocations]
  );

  const totalPhotosCount = useMemo(
    () => mergedLocations.reduce((sum, l) => sum + l.photos.length, 0),
    [mergedLocations]
  );

  // Helper to persist an updated location back to StoryProject.locations
  const persistLocationPatch = useCallback(
    (targetId: string, patch: Partial<ShootLocation>) => {
      const target = mergedLocations.find((l) => l.id === targetId);
      if (!target) return;

      const updatedItem: ShootLocation = {
        id: target.id,
        name: target.name,
        address: target.address,
        lat: target.lat,
        lng: target.lng,
        placeId: target.placeId,
        notes: target.notes,
        photos: target.photos,
        ...patch,
      };

      const existsInSaved = savedLocations.some(
        (sl) =>
          sl.id === target.id ||
          sl.name.trim().toLowerCase() === target.name.trim().toLowerCase()
      );

      if (existsInSaved) {
        onUpdateLocations(
          savedLocations.map((sl) =>
            sl.id === target.id ||
            sl.name.trim().toLowerCase() === target.name.trim().toLowerCase()
              ? updatedItem
              : sl
          )
        );
      } else {
        onUpdateLocations([...savedLocations, updatedItem]);
      }
    },
    [mergedLocations, savedLocations, onUpdateLocations]
  );

  const handleApplyManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;
    const parsedLat = Number(latInput.trim());
    const parsedLng = Number(lngInput.trim());
    if (
      latInput.trim() === '' ||
      lngInput.trim() === '' ||
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      setCoordError('Enter valid Latitude (-90 to 90) and Longitude (-180 to 180).');
      return;
    }

    setCoordError(null);
    const roundedLat = Number(parsedLat.toFixed(6));
    const roundedLng = Number(parsedLng.toFixed(6));
    persistLocationPatch(selectedLocation.id, {
      lat: roundedLat,
      lng: roundedLng,
      address: addressInput.trim() || undefined,
    });
    setPanTarget({ lat: roundedLat, lng: roundedLng, zoom: 14, seq: Date.now() });
  };

  const handleClearPin = () => {
    if (!selectedLocation) return;
    persistLocationPatch(selectedLocation.id, {
      lat: null,
      lng: null,
      placeId: undefined,
    });
    setInfoLocationId(null);
    setActiveMarker(null);
  };

  const handleMapClick = (ev: MapMouseEvent) => {
    if (!isPinDropMode || !selectedLocation) return;
    const clicked = ev.detail.latLng;
    if (!clicked) return;

    const roundedLat = Number(clicked.lat.toFixed(6));
    const roundedLng = Number(clicked.lng.toFixed(6));
    persistLocationPatch(selectedLocation.id, {
      lat: roundedLat,
      lng: roundedLng,
    });
    setIsPinDropMode(false);
    setPanTarget({ lat: roundedLat, lng: roundedLng, zoom: 14, seq: Date.now() });
  };

  const handleUploadPhotos = (files: FileList | null) => {
    if (!files || !selectedLocation) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<ShootLocationPhoto>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `loc-photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                url: typeof reader.result === 'string' ? reader.result : '',
                caption: file.name.replace(/\.[^.]+$/, ''),
                addedAt: new Date().toLocaleDateString(),
              });
            };
            reader.readAsDataURL(file);
          })
      )
    ).then((loadedPhotos) => {
      const valid = loadedPhotos.filter((p) => p.url);
      if (valid.length === 0) return;
      persistLocationPatch(selectedLocation.id, {
        photos: [...selectedLocation.photos, ...valid],
      });
    });
  };

  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    if (!selectedLocation) return;
    persistLocationPatch(selectedLocation.id, {
      photos: selectedLocation.photos.map((p) =>
        p.id === photoId ? { ...p, caption } : p
      ),
    });
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!selectedLocation) return;
    persistLocationPatch(selectedLocation.id, {
      photos: selectedLocation.photos.filter((p) => p.id !== photoId),
    });
  };

  const handleCreateCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLocName.trim();
    if (!trimmed) return;
    const existing = mergedLocations.find(
      (l) => l.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setSelectedLocationId(existing.id);
      setIsAddingCustom(false);
      setCustomLocName('');
      return;
    }

    const created: ShootLocation = {
      id: `loc-custom-${Date.now()}`,
      name: trimmed,
      lat: null,
      lng: null,
      photos: [],
    };
    onUpdateLocations([...savedLocations, created]);
    setSelectedLocationId(created.id);
    setCustomLocName('');
    setIsAddingCustom(false);
  };

  const handleDeleteCustomLocation = (locId: string) => {
    const remaining = savedLocations.filter((l) => l.id !== locId);
    onUpdateLocations(remaining);
    setConfirmDeleteLocId(null);
    if (infoLocationId === locId) {
      setInfoLocationId(null);
      setActiveMarker(null);
    }
    const nextFirst = mergedLocations.find((l) => l.id !== locId);
    if (nextFirst) setSelectedLocationId(nextFirst.id);
  };

  const infoLocation = useMemo(
    () => mergedLocations.find((l) => l.id === infoLocationId) || null,
    [mergedLocations, infoLocationId]
  );

  return (
    <div className="flex-1 bg-[#202020] flex flex-col min-h-0 overflow-hidden text-xs select-none">
      {/* Unified Production Workspace Toolbar */}
      <div className="bg-[#292929] px-4 py-2 border-b border-[#3e3e3e] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center p-0.5 bg-[#191919] rounded border border-[#3c3c3c]">
            <button
              onClick={() => onSwitchSubView('stripboard')}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stripboard</span>
            </button>
            <button
              onClick={() => onSwitchSubView('cast_crew')}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cast & Crew Address Book ({crewCount})</span>
            </button>
            <button
              onClick={() => onSwitchSubView('location_map')}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-[#333333] text-[#ff8000] shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Location Map ({mergedLocations.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-gray-400 font-mono tabular-nums whitespace-nowrap hidden md:inline">
            {pinnedLocations.length}/{mergedLocations.length} pinned · {totalPhotosCount} site photos
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pinnedLocations.length > 0 && !isMapError && (
            <button
              type="button"
              onClick={() => setFitBoundsSeq((n) => n + 1)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#333333] hover:bg-[#444444] text-gray-200 rounded border border-[#4d4d4d] transition-colors whitespace-nowrap shrink-0"
              title="Zoom map to fit all pinned shooting locations"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fit All Pins</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsAddingCustom((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Location</span>
          </button>
        </div>
      </div>

      {/* Add Custom Location Quick Bar */}
      {isAddingCustom && (
        <form
          onSubmit={handleCreateCustomLocation}
          className="bg-[#242424] border-b border-[#3a3a3a] px-4 py-2 flex items-center gap-2 flex-shrink-0"
        >
          <MapPin className="w-3.5 h-3.5 text-[#ff8000] shrink-0" />
          <input
            type="text"
            value={customLocName}
            onChange={(e) => setCustomLocName(e.target.value)}
            placeholder="Enter custom unit basecamp, studio, or scouted location name..."
            autoFocus
            className="flex-1 max-w-md bg-[#171717] text-gray-200 px-3 py-1 rounded border border-[#3e3e3e] text-xs focus:outline-none focus:border-[#ff8000]"
          />
          <button
            type="submit"
            disabled={!customLocName.trim()}
            className="px-3 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-semibold rounded text-xs"
          >
            Create Location
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingCustom(false);
              setCustomLocName('');
            }}
            className="px-2.5 py-1 bg-[#333] hover:bg-[#444] text-gray-300 rounded text-xs"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Main Split Workspace: Left Location List + Inspector | Right Interactive Google Map */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar: Script Locations & Site Photos Inspector */}
        <div className="w-[400px] flex-shrink-0 border-r border-[#383838] bg-[#1c1c1c] flex flex-col min-h-0 overflow-hidden">
          {/* Search & Pinned Filter */}
          <div className="p-3 border-b border-[#323232] bg-[#222222] space-y-2 flex-shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter script locations, addresses, or scenes..."
                className="w-full bg-[#161616] text-gray-200 pl-8 pr-7 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center p-0.5 bg-[#161616] rounded border border-[#343434]">
                {(['all', 'pinned', 'unpinned'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPinFilter(mode)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                      pinFilter === mode
                        ? 'bg-[#2e2e2e] text-[#ff8000]'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {mode === 'all' ? 'All' : mode === 'pinned' ? 'Pinned' : 'Unpinned'}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-gray-400 tabular-nums">
                {filteredLocations.length} shown
              </span>
            </div>
          </div>

          {/* Scrollable Locations List */}
          <div className="max-h-[38%] overflow-y-auto divide-y divide-[#2a2a2a] border-b border-[#383838] flex-shrink-0">
            {filteredLocations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No shooting locations match this filter.
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                const isPinned = loc.lat !== null && loc.lng !== null;
                const pinIdx = isPinned
                  ? pinnedLocations.findIndex((p) => p.id === loc.id) + 1
                  : null;

                return (
                  <div
                    key={loc.id}
                    onClick={() => {
                      setSelectedLocationId(loc.id);
                      setIsPinDropMode(false);
                      if (loc.lat !== null && loc.lng !== null) {
                        setPanTarget({
                          lat: loc.lat,
                          lng: loc.lng,
                          zoom: 14,
                          seq: Date.now(),
                        });
                      }
                    }}
                    className={`px-3 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#2c251d] border-l-2 border-l-[#ff7700]'
                        : 'hover:bg-[#242424]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isPinned ? (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#ff7700] text-black font-bold text-[10px] shrink-0 tabular-nums">
                              {pinIdx}
                            </span>
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          )}
                          <span className="font-semibold text-gray-100 truncate">
                            {loc.name}
                          </span>
                        </div>

                        {loc.address && (
                          <div className="text-[11px] text-gray-400 truncate mt-0.5 pl-5">
                            {loc.address}
                          </div>
                        )}

                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1 pl-5 text-[10px]">
                          <span className="text-amber-300/90 tabular-nums">
                            {loc.linkedScenes.length > 0
                              ? `Sc. ${loc.linkedScenes.map((s) => s.sceneNumber).join(', ')}`
                              : 'Custom Site'}
                          </span>
                          {isPinned ? (
                            <span className="text-emerald-400 font-mono tabular-nums">
                              {loc.lat!.toFixed(4)}, {loc.lng!.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-gray-500">Unpinned</span>
                          )}
                          {loc.photos.length > 0 && (
                            <span className="text-cyan-400 flex items-center gap-1 tabular-nums">
                              <Camera className="w-3 h-3" />
                              {loc.photos.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Location Editor & Site Photo Attachments */}
          {selectedLocation ? (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-[#2f2f2f] pb-2.5">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-[#ff8000] font-semibold">
                    {selectedLocation.isFromScript ? 'Script Location' : 'Custom Location'}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-100 leading-snug mt-0.5">
                    {selectedLocation.name}
                  </h3>
                </div>
                {!selectedLocation.isFromScript && (
                  <div className="shrink-0">
                    {confirmDeleteLocId === selectedLocation.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomLocation(selectedLocation.id)}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-semibold"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteLocId(null)}
                          className="px-2 py-0.5 bg-[#333] text-gray-300 rounded text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLocId(selectedLocation.id)}
                        className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-[#2a2a2a]"
                        title="Delete Custom Location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Linked Script Scenes */}
              {selectedLocation.linkedScenes.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1">
                    <Film className="w-3 h-3 text-amber-400" />
                    <span>Script Scenes ({selectedLocation.linkedScenes.length})</span>
                  </div>
                  <div className="space-y-1">
                    {selectedLocation.linkedScenes.map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => onSelectScene(sc.id)}
                        className="w-full text-left px-2.5 py-1.5 rounded bg-[#232323] hover:bg-[#2c251d] border border-[#333] flex items-center justify-between gap-2 transition-colors"
                      >
                        <span className="truncate text-gray-200 font-mono text-[11px]">
                          <span className="text-[#ff8000] font-bold">#{sc.sceneNumber}</span>{' '}
                          {sc.heading}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                          {sc.pages}p
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Places Lookup */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Find Real-World Site (Google Places)
                </label>
                <PlacesAutocompleteInput
                  disabled={isMapError}
                  onPlaceResolved={(resolved) => {
                    persistLocationPatch(selectedLocation.id, {
                      lat: Number(resolved.lat.toFixed(6)),
                      lng: Number(resolved.lng.toFixed(6)),
                      address: resolved.address,
                      placeId: resolved.placeId,
                    });
                    setPanTarget({
                      lat: resolved.lat,
                      lng: resolved.lng,
                      zoom: 15,
                      seq: Date.now(),
                    });
                  }}
                />
              </div>

              {/* Coordinates & Click-to-Pin */}
              <form onSubmit={handleApplyManualCoords} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Coordinates (Lat / Lng)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!isMapError && (
                      <button
                        type="button"
                        onClick={() => setIsPinDropMode((v) => !v)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                          isPinDropMode
                            ? 'bg-[#ff7700] text-black border-[#ff8c1a] font-semibold'
                            : 'bg-[#262626] text-gray-300 border-[#3f3f3f] hover:border-[#ff8000]'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>{isPinDropMode ? 'Click Map Now...' : 'Click Map to Pin'}</span>
                      </button>
                    )}
                    {selectedLocation.lat !== null && (
                      <button
                        type="button"
                        onClick={handleClearPin}
                        className="px-2 py-0.5 rounded text-[10px] bg-[#262626] hover:bg-[#333] text-gray-400 hover:text-rose-400 border border-[#3f3f3f]"
                      >
                        Clear Pin
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Latitude</label>
                    <input
                      type="text"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      placeholder="e.g. 34.052235"
                      className="w-full bg-[#161616] text-gray-200 px-2.5 py-1 rounded border border-[#3a3a3a] font-mono text-[11px] tabular-nums focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Longitude</label>
                    <input
                      type="text"
                      value={lngInput}
                      onChange={(e) => setLngInput(e.target.value)}
                      placeholder="e.g. -118.243683"
                      className="w-full bg-[#161616] text-gray-200 px-2.5 py-1 rounded border border-[#3a3a3a] font-mono text-[11px] tabular-nums focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">
                    Street Address / Scouted Site Label
                  </label>
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onBlur={() => {
                      if (addressInput !== (selectedLocation.address || '')) {
                        persistLocationPatch(selectedLocation.id, {
                          address: addressInput.trim() || undefined,
                        });
                      }
                    }}
                    placeholder="Address or soundstage access gate..."
                    className="w-full bg-[#161616] text-gray-200 px-2.5 py-1 rounded border border-[#3a3a3a] text-[11px] focus:outline-none focus:border-[#ff8000]"
                  />
                </div>

                {coordError && (
                  <div className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{coordError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-1.5 bg-[#2a2a2a] hover:bg-[#353535] text-gray-200 font-medium rounded border border-[#444] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3 h-3 text-[#ff8000]" />
                  <span>Apply Coordinates & Center Map</span>
                </button>
              </form>

              {/* Location Logistics Notes */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Unit & Scout Logistics Notes
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  onBlur={() => {
                    if (notesInput !== (selectedLocation.notes || '')) {
                      persistLocationPatch(selectedLocation.id, {
                        notes: notesInput.trim() || undefined,
                      });
                    }
                  }}
                  placeholder="Basecamp parking, generator drop, permits, sun direction..."
                  className="w-full bg-[#161616] text-gray-200 px-2.5 py-1.5 rounded border border-[#3a3a3a] text-[11px] focus:outline-none focus:border-[#ff8000]"
                />
              </div>

              {/* Site Photos Gallery & Multi-File Upload */}
              <div className="space-y-2 pt-1 border-t border-[#2f2f2f]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Site Photos ({selectedLocation.photos.length})</span>
                  </span>
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded cursor-pointer text-[11px] transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>Attach Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleUploadPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {selectedLocation.photos.length === 0 ? (
                  <label className="block border border-dashed border-[#3e3e3e] hover:border-[#ff8000] rounded-md p-4 text-center cursor-pointer bg-[#171717] transition-colors">
                    <Camera className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                    <div className="text-[11px] text-gray-300 font-medium">
                      Attach location scout or reference photos
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Supports PNG, JPG, WebP (persisted with project)
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleUploadPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedLocation.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="bg-[#161616] border border-[#343434] rounded overflow-hidden flex flex-col group"
                      >
                        <div className="relative h-24 bg-black overflow-hidden">
                          <img
                            src={photo.url}
                            alt={photo.caption || selectedLocation.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxPhoto({
                                  url: photo.url,
                                  caption: photo.caption,
                                  locationName: selectedLocation.name,
                                })
                              }
                              className="p-1.5 bg-[#222] hover:bg-[#ff7700] hover:text-black text-white rounded"
                              title="Enlarge Photo"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="p-1.5 bg-[#222] hover:bg-red-600 text-white rounded"
                              title="Remove Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={photo.caption || ''}
                          onChange={(e) =>
                            handleUpdatePhotoCaption(photo.id, e.target.value)
                          }
                          placeholder="Add photo caption..."
                          className="w-full bg-[#1a1a1a] text-gray-300 px-2 py-1 text-[10px] border-t border-[#2b2b2b] focus:outline-none focus:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-gray-500 text-center">
              Select or add a location to manage coordinates and site photos.
            </div>
          )}
        </div>

        {/* Right Interactive Google Map Viewport (Explicit sizing prevents CF2 height collapse) */}
        <div className="flex-1 relative min-h-[480px] h-full w-full bg-[#151515]">
          {isPinDropMode && selectedLocation && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#ff7700] text-black px-3.5 py-1.5 rounded shadow-xl font-semibold text-xs flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Click anywhere on the map to pin "{selectedLocation.name}"</span>
              <button
                type="button"
                onClick={() => setIsPinDropMode(false)}
                className="ml-1 px-1.5 py-0.5 bg-black/20 hover:bg-black/30 rounded text-[10px]"
              >
                Cancel
              </button>
            </div>
          )}

          {isMapError ? (
            <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center p-8 text-center text-gray-300 space-y-3 bg-[#181818]">
              <MapPin className="w-10 h-10 text-[#ff7700]" />
              <div className="max-w-md space-y-1.5">
                <h3 className="text-sm font-semibold text-gray-100">
                  Interactive Map Unavailable
                </h3>
                <p className="text-xs text-gray-400">
                  {!hasMapsKey
                    ? 'Google Maps API key is not configured in environment variables (VITE_GOOGLE_MAPS_API_KEY). You can still edit coordinates and attach site photos in the location panel.'
                    : 'Google Maps failed to load or exceeded quota. Check the notice at the top of the workspace or continue managing coordinates and site photos on the left.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full min-h-[480px]">
              <GoogleMap
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                defaultCenter={
                  pinnedLocations[0] &&
                  pinnedLocations[0].lat !== null &&
                  pinnedLocations[0].lng !== null
                    ? { lat: pinnedLocations[0].lat, lng: pinnedLocations[0].lng }
                    : DEFAULT_CENTER
                }
                defaultZoom={pinnedLocations.length > 0 ? 11 : 10}
                gestureHandling="greedy"
                onClick={handleMapClick}
                className="w-full h-full"
              >
                <MapCameraController
                  pinnedLocations={pinnedLocations}
                  panTarget={panTarget}
                  fitBoundsSeq={fitBoundsSeq}
                />

                {pinnedLocations.map((loc, idx) => (
                  <LocationPinMarker
                    key={loc.id}
                    location={loc}
                    indexNumber={idx + 1}
                    isSelected={selectedLocation?.id === loc.id}
                    onSelectMarker={(locId, marker) => {
                      setSelectedLocationId(locId);
                      setActiveMarker(marker);
                      setInfoLocationId(locId);
                    }}
                  />
                ))}

                {infoLocation &&
                  infoLocation.lat !== null &&
                  infoLocation.lng !== null &&
                  activeMarker && (
                    <InfoWindow
                      anchor={activeMarker}
                      maxWidth={290}
                      onCloseClick={() => setInfoLocationId(null)}
                    >
                      <div className="text-gray-900 text-xs space-y-1.5 p-0.5 max-w-[265px]">
                        <div className="font-bold text-sm text-gray-900 leading-snug">
                          {infoLocation.name}
                        </div>
                        {infoLocation.address && (
                          <div className="text-[11px] text-gray-600 leading-snug">
                            {infoLocation.address}
                          </div>
                        )}
                        <div className="text-[11px] font-mono text-gray-700 tabular-nums">
                          {infoLocation.lat.toFixed(5)}, {infoLocation.lng.toFixed(5)}
                        </div>
                        {infoLocation.linkedScenes.length > 0 && (
                          <div className="text-[11px] text-amber-800 font-medium">
                            Scenes:{' '}
                            {infoLocation.linkedScenes
                              .map((s) => `#${s.sceneNumber}`)
                              .join(', ')}
                          </div>
                        )}
                        {infoLocation.photos.length > 0 && (
                          <div className="pt-1 space-y-1">
                            <img
                              src={infoLocation.photos[0].url}
                              alt={infoLocation.photos[0].caption || infoLocation.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-24 object-cover rounded border border-gray-300"
                            />
                            <div className="text-[10px] text-gray-500">
                              {infoLocation.photos.length} site{' '}
                              {infoLocation.photos.length === 1 ? 'photo' : 'photos'} attached
                            </div>
                          </div>
                        )}
                        {infoLocation.notes && (
                          <div className="text-[11px] text-gray-600 italic border-t border-gray-200 pt-1">
                            {infoLocation.notes}
                          </div>
                        )}
                      </div>
                    </InfoWindow>
                  )}
              </GoogleMap>
            </div>
          )}

          {/* Bottom-left Compact Overlay Legend */}
          <div className="absolute bottom-3 left-3 bg-[#1a1a1a]/90 backdrop-blur-xs border border-[#383838] rounded px-3 py-1.5 text-[11px] text-gray-300 flex items-center gap-4 pointer-events-none">
            <span className="font-semibold text-gray-100 truncate max-w-[160px]">
              {projectTitle}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="tabular-nums">{pinnedLocations.length} Pinned</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Camera className="w-3 h-3 text-cyan-400" />
              <span className="tabular-nums">{totalPhotosCount} Photos</span>
            </span>
          </div>
        </div>
      </div>

      {/* Site Photo Lightbox Preview Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-[#1e1e1e] border border-[#444] rounded-lg max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 bg-[#171717] border-b border-[#333] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-100">
                  {lightboxPhoto.locationName}
                </div>
                {lightboxPhoto.caption && (
                  <div className="text-[11px] text-gray-400">{lightboxPhoto.caption}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1 text-gray-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption || lightboxPhoto.locationName}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LocationMapView: React.FC<LocationMapViewProps> = (props) => {
  const hasMapsKey = Boolean(MAPS_API_KEY.trim());

  if (!hasMapsKey) {
    return <InnerLocationMapWorkspace {...props} hasMapsKey={false} />;
  }

  return (
    <APIProvider
      apiKey={MAPS_API_KEY}
      libraries={['marker', 'places']}
      language="en"
      region="US"
    >
      <InnerLocationMapWorkspace {...props} hasMapsKey={true} />
    </APIProvider>
  );
};
