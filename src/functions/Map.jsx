import React, { useEffect, useRef, useState } from "react";
import L, { marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import TouristAttractions from '../assets/json/tourist-attraction.json';
import SavedLocations from "./SavedLocations";
import TouristAttraction from "./TouristAttraction";
import Buttons from "./Buttons";
import HandleOpenTabs from "./HandleOpenTabs";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create red icon for tourist attractions
const redIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create green icon for search results
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function Map() {
  const mapRef = useRef(null);
  const [markers, setMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [attractions, setAttractions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const markersRef = useRef([]);
  const routeControlRef = useRef(null);
  const markerInstancesRef = useRef({});
  const attractionMarkersRef = useRef([]);

  useEffect(() => {
    setAttractions(TouristAttractions);
    
    // Load saved route from localStorage
    const savedRoute = JSON.parse(localStorage.getItem("savedRoute"));
    if (savedRoute) {
      // Wait for map to initialize before creating route
      const checkMap = setInterval(() => {
        if (mapRef.current) {
          clearInterval(checkMap);
          createRoute(
            savedRoute.fromLat,
            savedRoute.fromLng,
            savedRoute.toLat,
            savedRoute.toLng,
            savedRoute.name
          );
        }
      }, 100);
    }
  }, []);
  
  const saveRouteToStorage = (fromLat, fromLng, toLat, toLng, name) => {
    localStorage.setItem("savedRoute", JSON.stringify({
      fromLat,
      fromLng,
      toLat,
      toLng,
      name
    }));
  };

  const clearSavedRoute = () => {
    localStorage.removeItem("savedRoute");
  };

  const getLocationName = async (lat, lng) => {
    setLoadingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (!data.address) {
        return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }

      const { 
        village, town, city, 
        municipality, county, state, 
        country, neighbourhood, 
        road, suburb, hamlet
      } = data.address;

      const locationParts = [
        road,
        neighbourhood,
        hamlet,
        village,
        suburb,
        town,
        city,
        municipality,
        county,
        state,
        country
      ].filter(Boolean);

      return locationParts.length > 0 
        ? locationParts.reduce((acc, part) => acc ? `${acc}, ${part}` : part, '')
        : `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch (error) {
      console.error("Error fetching location name:", error);
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } finally {
      setLoadingLocation(false);
    }
  };

  const createRoute = (fromLat, fromLng, toLat, toLng, name) => {
    if (routeControlRef.current) {
      mapRef.current.removeControl(routeControlRef.current);
    }

    // Save the route to localStorage
    saveRouteToStorage(fromLat, fromLng, toLat, toLng, name);

    const routeControl = L.Routing.control({
      waypoints: [
        L.latLng(fromLat, fromLng),
        L.latLng(toLat, toLng),
      ],
      routeWhileDragging: true,
      showAlternatives: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      collapsible: true,
      lineOptions: {
        styles: [{color: '#3388ff', opacity: 1, weight: 5}]
      },
      altLineOptions: {
        styles: [{color: '#3388ff', opacity: 0.7, weight: 5}]
      },
      plan: L.Routing.plan([
        L.latLng(fromLat, fromLng),
        L.latLng(toLat, toLng)
      ], {
        createMarker: function(i, wp) {
          if (i === 0) {
            return L.marker(wp.latLng, {
              icon: L.icon({
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              })
            }).bindPopup("Start point");
          } else {
            return L.marker(wp.latLng, {
              icon: redIcon
            }).bindPopup(`<b>${name}</b>`);
          }
        }
      })
    }).addTo(mapRef.current);

    routeControlRef.current = routeControl;

    routeControl.on('routingerror', (e) => {
      console.error('Routing error:', e.error);
    });
  };

  const clearRoute = () => {
    if (routeControlRef.current && mapRef.current) {
      mapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }
    clearSavedRoute();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching location:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    mapRef.current.flyTo([lat, lng], 15);
    
    // Clear previous search marker if exists
    if (markerInstancesRef.current.searchMarker) {
      mapRef.current.removeLayer(markerInstancesRef.current.searchMarker);
    }
    
    // Add new marker for the search result
    const marker = L.marker([lat, lng], {
      icon: greenIcon
    })
    .addTo(mapRef.current)
    .bindPopup(`<b>${result.display_name}</b>`)
    .openPopup();
    
    markerInstancesRef.current.searchMarker = marker;
    
    // Save search result to savedRoute in localStorage
    if (userLocation?.lat && userLocation?.lng) {
      // Create route from user location to search result
      createRoute(userLocation.lat, userLocation.lng, lat, lng, result.display_name);
    } else {
      // If user location is not available, try to get it
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          // Create route from user location to search result
          createRoute(latitude, longitude, lat, lng, result.display_name);
        },
        (error) => {
          console.error("Error getting location:", error);
          // If unable to get user location, just save the destination
          saveRouteToStorage(lat, lng, lat, lng, result.display_name);
        }
      );
    }
    
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleAttractionClick = (attraction) => {
    if (userLocation?.lat && userLocation?.lng) {
      createRoute(userLocation.lat, userLocation.lng, attraction.lat, attraction.lng, attraction.name);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          createRoute(latitude, longitude, attraction.lat, attraction.lng, attraction.name);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Please enable location services to get directions");
        }
      );
    }
  };

  

  useEffect(() => {
    try {
      const savedLocations = JSON.parse(localStorage.getItem("userLocations"));
      if (Array.isArray(savedLocations)) {
        setMarkers(savedLocations);
      }
    } catch (error) {
      console.error("Error parsing localStorage data:", error);
      localStorage.removeItem("userLocations");
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map").setView([10.3157, 123.8854], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);

      attractionMarkersRef.current = TouristAttractions.map(attraction => {
        const marker = L.marker([attraction.lat, attraction.lng], { icon: redIcon })
          .addTo(mapRef.current)
          .bindPopup(`<b>${attraction.name}</b><br>${attraction.description}`)
          .on('click', () => handleAttractionClick(attraction));
        return marker;
      });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          mapRef.current.setView([latitude, longitude], 13);
          setUserLocation({ lat: latitude, lng: longitude });
          L.marker([latitude, longitude])
            .addTo(mapRef.current)
            .bindPopup("You are here!")
            .openPopup();
        },
        (error) => console.error("Error getting location:", error)
      );
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && userLocation) {
      markersRef.current.forEach(marker => {
        const markerKey = `${marker.lat},${marker.lng}`;
        if (markerInstancesRef.current[markerKey]) {
          mapRef.current.removeLayer(markerInstancesRef.current[markerKey]);
        }
      });
      markersRef.current = [];
      markerInstancesRef.current = {};

      markers.forEach(({ lat, lng, name }) => {
        const markerKey = `${lat},${lng}`;
        if (!markerInstancesRef.current[markerKey]) {
          const markerInstance = L.marker([lat, lng])
            .addTo(mapRef.current)
            .bindPopup(`<b>${name}</b><br>(${lat.toFixed(6)}, ${lng.toFixed(6)})`);

          markerInstance.on("click", () => {
            if (userLocation) {
              createRoute(userLocation.lat, userLocation.lng, lat, lng, name);
            }
          });

          markerInstancesRef.current[markerKey] = markerInstance;
          markersRef.current.push({ lat, lng });
        }
      });
    }
  }, [markers, userLocation]);

  useEffect(() => {
    if (mapRef.current) {
      const handleMapClick = async (e) => {
        const { lat, lng } = e.latlng;

        const clickedAttraction = TouristAttractions.find(
          a => Math.abs(a.lat - lat) < 0.0001 && Math.abs(a.lng - lng) < 0.0001
        );
        if (clickedAttraction) return;

        if (markers.some((marker) => marker.lat === lat && marker.lng === lng)) {
          alert("This marker already exists!");
          return;
        }

        const confirmSave = window.confirm(
          `Do you want to save a marker at (${lat.toFixed(6)}, ${lng.toFixed(6)})?`
        );

        if (confirmSave) {
          const locationName = await getLocationName(lat, lng);
          const newMarker = { lat, lng, name: locationName };
          const updatedMarkers = [...markers, newMarker];

          setMarkers(updatedMarkers);
          localStorage.setItem("userLocations", JSON.stringify(updatedMarkers));

          const markerKey = `${lat},${lng}`;
          const markerInstance = L.marker([lat, lng])
            .addTo(mapRef.current)
            .bindPopup(`<b>${locationName}</b><br>(${lat.toFixed(6)}, ${lng.toFixed(6)})`)
            .openPopup();

          markerInstance.on("click", () => {
            if (userLocation) {
              createRoute(userLocation.lat, userLocation.lng, lat, lng, locationName);
            }
          });

          markerInstancesRef.current[markerKey] = markerInstance;
          markersRef.current.push({ lat, lng });
        }
      };

      mapRef.current.on("click", handleMapClick);
      return () => mapRef.current.off("click", handleMapClick);
    }
  }, [markers]);

  return (
    <>
      <div className="map-container position-relative h-100 w-100">
        <div id="map"></div>
        
        {/* Search Box */}
        <div className="search-container" style={{
          position: 'absolute',
          top: '10px',
          left: '50px',
          zIndex: 1000,
          width: '300px'
        }}>
          <form onSubmit={handleSearch} className="d-flex">
            <input
              type="text"
              className="form-control"
              placeholder="Search for a location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              type="submit" 
              className="btn btn-primary ms-2"
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="search-results mt-2 bg-white rounded shadow">
              {searchResults.map((result, index) => (
                <div 
                  key={index} 
                  className="search-result p-2 border-bottom cursor-pointer"
                  onClick={() => handleSearchResultClick(result)}
                  style={{ cursor: 'pointer' }}
                >
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <Buttons/>
        <SavedLocations
          loading={loadingLocation}
          location={userLocation}
          markers={markers}
          setMrk={setMarkers}
        />

        <TouristAttraction 
          attractions={TouristAttractions} 
          onClick={handleAttractionClick}
        />
      </div>
    </>
  );
}

export default Map;