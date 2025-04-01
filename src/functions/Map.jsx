import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import TouristAttractions from '../assets/json/tourist-attraction.json';

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

function Map() {
  const mapRef = useRef(null);
  const [markers, setMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [currentGuide, setCurrentGuide] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [attractions, setAttractions] = useState([]);
  const markersRef = useRef([]);
  const routeControlRef = useRef(null);
  const markerInstancesRef = useRef({});
  const attractionMarkersRef = useRef([]);

  // Sample tourist attractions data


  useEffect(() => {
    setAttractions(TouristAttractions);
  }, []);
  
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

    const routeControl = L.Routing.control({
      waypoints: [
        L.latLng(fromLat, fromLng),
        L.latLng(toLat, toLng),
      ],
      routeWhileDragging: true,
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
    }).addTo(mapRef.current);

    routeControlRef.current = routeControl;

    routeControl.on("routesfound", (e) => {
      const route = e.routes[0];
      setCurrentGuide({
        name,
        distance: (route.summary.totalDistance / 1000).toFixed(1) + " km",
        time: Math.round(route.summary.totalTime / 60) + " min",
      });
    });

    routeControl.on('routingerror', (e) => {
      console.error('Routing error:', e.error);
    });
  };

const handleAttractionClick = (attraction) => {
  // First check if we have the user's current location
  if (userLocation?.lat && userLocation?.lng) {
    // Use the actual user location
    createRoute(userLocation.lat, userLocation.lng, attraction.lat, attraction.lng, attraction.name);
  } else {
    // If we don't have location yet, try to get it
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        // Now create the route with the newly acquired location
        createRoute(latitude, longitude, attraction.lat, attraction.lng, attraction.name);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Please enable location services to get directions");
      }
    );
  }
};
  const handleDeleteMarker = (markerToDelete) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the marker at ${markerToDelete.name}?`
    );
    
    if (!confirmDelete) return;

    const updatedMarkers = markers.filter(marker => 
      !(marker.lat === markerToDelete.lat && marker.lng === markerToDelete.lng)
    );
    setMarkers(updatedMarkers);
    localStorage.setItem("userLocations", JSON.stringify(updatedMarkers));

    const markerKey = `${markerToDelete.lat},${markerToDelete.lng}`;
    if (markerInstancesRef.current[markerKey]) {
      mapRef.current.removeLayer(markerInstancesRef.current[markerKey]);
      delete markerInstancesRef.current[markerKey];
    }

    markersRef.current = markersRef.current.filter(marker => 
      !(marker.lat === markerToDelete.lat && marker.lng === markerToDelete.lng)
    );
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

      // Add tourist attractions with click handlers
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

        // Skip if clicked on an attraction
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
      <div id="map" style={{ height: "500px", width: "100%" }}></div>
      
      <div style={{ display: "flex", marginTop: "20px", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <h2>Saved Locations:</h2>
          {loadingLocation && <p>Loading location data...</p>}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {markers.map((marker, index) => (
              <li 
                key={index} 
                style={{ 
                  padding: "8px", 
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: currentGuide?.name === marker.name ? "#f0f8ff" : "transparent"
                }}
              >
                <div 
                  style={{ cursor: "pointer", flex: 1 }}
                  onClick={() => {
                    if (userLocation) {
                      createRoute(userLocation.lat, userLocation.lng, marker.lat, marker.lng, marker.name);
                    }
                  }}
                >
                  <b>{marker.name}</b> (Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)})
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMarker(marker);
                  }}
                  style={{
                    background: "#ff4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    marginLeft: "10px"
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          <h2>Tourist Attractions:</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {TouristAttractions.map((attraction, index) => (
              <li 
                key={index}
                style={{ 
                  padding: "8px", 
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: currentGuide?.name === attraction.name ? "#fff0f0" : "transparent",
                  cursor: "pointer"
                }}
                onClick={() => handleAttractionClick(attraction)}
              >
                <div style={{ flex: 1 }}>
                  <b style={{ color: "#d32f2f" }}>{attraction.name}</b>
                  <div style={{ fontSize: "0.9em", color: "#666" }}>
                    {attraction.description}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {currentGuide && (
          <div style={{ flex: 1, padding: "0 20px" }}>
            <h2>Route Guide</h2>
            <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
              <h3>{currentGuide.name}</h3>
              <p><strong>Distance:</strong> {currentGuide.distance}</p>
              <p><strong>Estimated Time:</strong> {currentGuide.time}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Map;