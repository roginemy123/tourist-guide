import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapLocation } from '@fortawesome/free-solid-svg-icons';

function TouristAttraction({ attractions, onClick }) {
  return (
    <div className="tourist-attractions bg-light bg-light pt-0 pe-0 ps-0 p-3" style={{ flex: 1 }}>
      <span className="bg-primary text-light p-3 w-100">
              <FontAwesomeIcon icon={faMapLocation} className='text-light' /> Tourist Attractions
      </span>
      <div className="overflow-auto list">
      <ul style={{ listStyle: "none", padding: 0 }}>
        {attractions.map((attraction, index) => (
          <li
            key={index}
            style={{
              padding: "8px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => onClick(attraction)}
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
    </div>
  );
}

export default TouristAttraction;
