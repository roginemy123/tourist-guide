import { useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';

function SavedLocations({ loadingLocation, userLocation, markers, createRoute, setMarkers, routingControlRef }) {
  const markerInstancesRef = useRef({});
  const mapRef = useRef(null);

  const handleDeleteMarker = async (markerToDelete) => {
    // const confirmDelete = window.confirm(
    //   `Are you sure you want to delete the marker at ${markerToDelete.name}?`
    // );

    const { confirmDelete } = await Swal.fire({
      title: 'Delete Marker',
      text: `Are you sure you want to delete the marker at ${markerToDelete.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (!confirmDelete) return;

    // Update markers state
    const updatedMarkers = markers.filter(marker => 
      !(marker.lat === markerToDelete.lat && marker.lng === markerToDelete.lng)
    );
    setMarkers(updatedMarkers);
    
    // Update localStorage
    localStorage.setItem("userLocations", JSON.stringify(updatedMarkers));

    // Remove marker from map
    const markerKey = `${markerToDelete.lat},${markerToDelete.lng}`;
    if (markerInstancesRef.current[markerKey] && mapRef.current) {
      mapRef.current.removeLayer(markerInstancesRef.current[markerKey]);
      delete markerInstancesRef.current[markerKey];
    }

    // Clean up any existing routes
    if (routingControlRef.current && mapRef.current) {
      try {
        mapRef.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      } catch (error) {
        console.warn("Error removing routing control:", error);
      }
    }
  };

  return (
    <div className="saved-locations bg-light pt-0 pe-0 ps-0 p-3" style={{ flex: 1 }}>
      <span className="bg-primary text-light p-3 w-100">
        <FontAwesomeIcon icon={faLocationDot} className='text-light' /> Saved Locations
      </span>
      {loadingLocation && <p>Loading location data...</p>}
      <div className="overflow-auto list">
        <ul style={{ listStyle: "none", padding: 0 }}>
          {markers.map((marker, index) => (
            <li
              key={`${marker.lat}-${marker.lng}-${index}`} // More unique key
              style={{
                padding: "8px",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ cursor: "pointer", flex: 1 }}
                onClick={() => {
                  if (userLocation) {
                    // Clean up previous route before creating new one
                    if (routingControlRef.current && mapRef.current) {
                      mapRef.current.removeControl(routingControlRef.current);
                    }
                    createRoute(
                      userLocation.lat,
                      userLocation.lng,
                      marker.lat,
                      marker.lng,
                      marker.name
                    );
                  }
                }}
              >
                <b>{marker.name}</b> (Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)})
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault(); // Add this to prevent any default behavior
                  handleDeleteMarker(marker);
                }}
                className='btn btn-danger btn-sm' // Added btn-sm for better sizing
              >
                Delete
              </button>
            </li>
          ))}

          {markers.length <= 0 && (
            <li style={{
              padding: "8px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              No saved locations
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default SavedLocations;