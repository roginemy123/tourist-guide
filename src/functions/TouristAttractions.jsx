import { useEffect } from 'react';
import attractions from '../assets/json/tourist-attraction.json';

function TouristAttractions(){

    attractions.map( attraction => localStorage.setItem("userLocations", JSON.stringify(updatedMarkers)));

    
}