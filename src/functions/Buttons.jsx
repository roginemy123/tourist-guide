import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faMapLocation } from '@fortawesome/free-solid-svg-icons'
import ButtonFunctions from './ButtonFunctions';

function Buttons() {
    const handleSavedLocationClick = () => {
        ButtonFunctions({ el: document.querySelector(".saved-locations"), secondEl: document.querySelector(".tourist-attractions") });
    };

    const handleTouristAttractionClick = () => {
        ButtonFunctions({ el: document.querySelector(".tourist-attractions"), secondEl: document.querySelector(".saved-locations") });
    };

    return (
        <div className="position-absolute left-0 btn-container">
            <div className="">
                <button 
                    type="button" 
                    onClick={handleSavedLocationClick} 
                    className="btn btn-primary rounded-0 rounded-start rounded-pill d-block mb-3"
                >
                    <span className="d-none text">Saved Locations</span>
                    <span className='bg-light p-1 py-0 rounded-circle'>
                        <FontAwesomeIcon icon={faLocationDot} className='text-primary' />
                    </span>
                </button>
                
                <button 
                    type="button" 
                    onClick={handleTouristAttractionClick}
                    className="btn btn-primary rounded-0 rounded-start rounded-pill"
                >
                    <span className="d-none text">Tourist Attractions</span>
                    <span className='bg-light p-1 py-0 rounded-circle'>
                        <FontAwesomeIcon icon={faMapLocation} className='text-primary' />
                    </span>
                </button>
            </div>
        </div>
    );
}

export default Buttons;