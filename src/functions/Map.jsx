import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

// Fix for Leaflet marker icons
const defaultIcon = L.icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

function Map() {
  const mapRef = useRef(null);
  const [markers, setMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [currentGuide, setCurrentGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const markersRef = useRef([]);
  const routeControlRef = useRef(null);
  const markerInstancesRef = useRef({});

  // Function to fetch location name with rate limiting
  const getLocationName = async (lat, lng) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'TouristGuideApp/1.0 (your@email.com)'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      if (data.address) {
        const { town, city, village, municipality, state, country } = data.address;
        const locationName = town || city || village || municipality || "Unknown Location";
        return `${locationName}, ${municipality || ""}, ${state || ""} ${country || ""}`.trim();
      }
      return "Unknown Location";
    } catch (error) {
      console.error("Error fetching location name:", error);
      setError("Failed to fetch location details. Please try again later.");
      return "Unknown Location";
    } finally {
      setLoading(false);
    }
  };

  // Create route between two points
  const createRoute = (fromLat, fromLng, toLat, toLng, name) => {
    try {
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
        lineOptions: {
          styles: [{color: '#3388ff', opacity: 0.7, weight: 5}]
        },
        showAlternatives: false,
        altLineOptions: {
          styles: [
            {color: 'black', opacity: 0.15, weight: 9},
            {color: 'white', opacity: 0.8, weight: 6},
            {color: 'blue', opacity: 0.5, weight: 2}
          ]
        }
      }).addTo(mapRef.current);

      routeControlRef.current = routeControl;

      routeControl.on("routesfound", (e) => {
        const route = e.routes[0];
        setCurrentGuide({
          name,
          distance: (route.summary.totalDistance / 1000).toFixed(1) + " km",
          time: Math.round(route.summary.totalTime / 60) + " min",
          instructions: route.instructions
        });
      });

      routeControl.on('routingerror', (e) => {
        console.error('Routing error:', e.error);
        setError('Could not calculate route to this location. Please try another destination.');
      });
    } catch (error) {
      console.error("Error creating route:", error);
      setError("Failed to create route. Please try again.");
    }
  };

  // Handle marker deletion
  const handleDeleteMarker = (markerToDelete) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the marker at ${markerToDelete.name}?`
    );
    
    if (!confirmDelete) return;

    // Remove from markers array
    const updatedMarkers = markers.filter(marker => 
      !(marker.lat === markerToDelete.lat && marker.lng === markerToDelete.lng)
    );
    setMarkers(updatedMarkers);
    localStorage.setItem("userLocations", JSON.stringify(updatedMarkers));

    // Remove from map
    const markerKey = `${markerToDelete.lat},${markerToDelete.lng}`;
    if (markerInstancesRef.current[markerKey]) {
      mapRef.current.removeLayer(markerInstancesRef.current[markerKey]);
      delete markerInstancesRef.current[markerKey];
    }

    // Remove from markersRef
    markersRef.current = markersRef.current.filter(marker => 
      !(marker.lat === markerToDelete.lat && marker.lng === markerToDelete.lng)
    );

    // Clear current guide if it was for the deleted marker
    if (currentGuide?.name === markerToDelete.name) {
      setCurrentGuide(null);
      if (routeControlRef.current) {
        mapRef.current.removeControl(routeControlRef.current);
        routeControlRef.current = null;
      }
    }
  };

  // Load saved markers
  useEffect(() => {
    try {
      const savedLocations = JSON.parse(localStorage.getItem("userLocations"));
      if (Array.isArray(savedLocations)) {
        setMarkers(savedLocations);
      }
    } catch (error) {
      console.error("Error parsing localStorage data:", error);
      localStorage.removeItem("userLocations");
      setError("Failed to load saved locations. Data has been reset.");
    }
  }, []);

  // Initialize map and get user location
  useEffect(() => {
    if (!mapRef.current) {
      try {
        mapRef.current = L.map("map", {
          zoomControl: true,
          doubleClickZoom: true,
          closePopupOnClick: false,
          preferCanvas: true
        }).setView([10.3157, 123.8854], 10);
        
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);

        // Try high accuracy first, fallback to less accurate if needed
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        };

        const success = (position) => {
          const { latitude, longitude } = position.coords;
          mapRef.current.setView([latitude, longitude], 13);
          setUserLocation({ lat: latitude, lng: longitude });
          L.marker([latitude, longitude], {
            icon: L.icon({
              ...defaultIcon.options,
              iconUrl: require('leaflet/dist/images/marker-icon-blue.png')
            })
          })
          .addTo(mapRef.current)
          .bindPopup("<b>You are here!</b>")
          .openPopup();
        };

        const error = (err) => {
          console.error("Error getting location:", err);
          setError(`Location access denied. Using default view. (${err.message})`);
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(success, error, options);
        } else {
          setError("Geolocation is not supported by this browser.");
        }
      } catch (error) {
        console.error("Error initializing map:", error);
        setError("Failed to initialize map. Please refresh the page.");
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle marker clicks and show route + guide
  useEffect(() => {
    if (mapRef.current && userLocation) {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        const markerKey = `${marker.lat},${marker.lng}`;
        if (markerInstancesRef.current[markerKey]) {
          mapRef.current.removeLayer(markerInstancesRef.current[markerKey]);
        }
      });
      markersRef.current = [];
      markerInstancesRef.current = {};

      // Add new markers
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

  // Handle map clicks to add new markers
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = async (e) => {
      try {
        const { lat, lng } = e.latlng;

        if (markers.some((marker) => marker.lat === lat && marker.lng === lng)) {
          alert("This marker already exists!");
          return;
        }

        const confirmSave = window.confirm(
          `Do you want to save this marker at (${lat.toFixed(6)}, ${lng.toFixed(6)})?`
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
      } catch (error) {
        console.error("Error handling map click:", error);
        setError("Failed to add marker. Please try again.");
      }
    };

    mapRef.current.on("click", handleMapClick);
    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleMapClick);
      }
    };
  }, [markers]);

  return (
    <>
      {error && (
        <div style={{
          padding: "10px",
          background: "#ffebee",
          color: "#c62828",
          marginBottom: "10px",
          borderRadius: "4px"
        }}>
          {error}
          <button 
            onClick={() => setError(null)}
            style={{
              float: "right",
              background: "none",
              border: "none",
              color: "#c62828",
              cursor: "pointer"
            }}
          >
            ×
          </button>
        </div>
      )}
      
      <div id="map" style={{ height: "500px", width: "100%" }}></div>
      
      <div style={{ display: "flex", marginTop: "20px", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px" }}>
          <h2>Saved Locations</h2>
          {loading && <p>Loading location details...</p>}
          {markers.length === 0 ? (
            <p>No saved locations yet. Click on the map to add markers.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {markers.map((marker, index) => (
                <li 
                  key={index} 
                  style={{ 
                    padding: "10px", 
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: currentGuide?.name === marker.name ? "#f0f8ff" : "transparent",
                    transition: "background-color 0.2s"
                  }}
                >
                  <div 
                    style={{ cursor: "pointer", flex: 1 }}
                    onClick={() => {
                      if (userLocation) {
                        createRoute(userLocation.lat, userLocation.lng, marker.lat, marker.lng, marker.name);
                      } else {
                        alert("Please wait for your location to be detected");
                      }
                    }}
                  >
                    <b>{marker.name}</b>
                    <div style={{ fontSize: "0.9em", color: "#666" }}>
                      Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}
                    </div>
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
                      padding: "6px 12px",
                      cursor: "pointer",
                      marginLeft: "10px",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = "#cc0000"}
                    onMouseOut={(e) => e.target.style.backgroundColor = "#ff4444"}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {currentGuide && (
          <div style={{ flex: 1, minWidth: "300px", padding: "0 10px" }}>
            <h2>Route Guide</h2>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "15px", 
              borderRadius: "5px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <h3 style={{ marginTop: 0 }}>{currentGuide.name}</h3>
              <p><strong>Distance:</strong> {currentGuide.distance}</p>
              <p><strong>Estimated Time:</strong> {currentGuide.time}</p>
              <button 
                onClick={() => {
                  if (routeControlRef.current) {
                    mapRef.current.removeControl(routeControlRef.current);
                    routeControlRef.current = null;
                    setCurrentGuide(null);
                  }
                }}
                style={{
                  background: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  marginTop: "10px"
                }}
              >
                Clear Route
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Map;