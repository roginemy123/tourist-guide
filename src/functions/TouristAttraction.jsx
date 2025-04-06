function TouristAttraction({ attractions, onClick }) {
  return (
    <div style={{ flex: 1 }}>
      <h2>Tourist Attractions:</h2>
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
  );
}

export default TouristAttraction;
