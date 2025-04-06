import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoffee, faLocationDot, faMapLocation } from '@fortawesome/free-solid-svg-icons'

function Buttons(){
    let savedLocationBtn = <button type="button" className="btn btn-primary rounded-0 rounded-start rounded-pill d-block mb-3">
        <span className="d-none text">Saved Locations </span>

        <span className='bg-light p-1 py-0 rounded-circle'> <FontAwesomeIcon icon={faLocationDot} className='text-primary' /></span> </button>;
    let touristAttractionBtn = <button type="button" className="btn btn-primary rounded-0 rounded-start rounded-pill">
        <span className="d-none text">Tourist Attractions </span> 
        <span className='bg-light p-1 py-0 rounded-circle'> <FontAwesomeIcon icon={faMapLocation} className='text-primary' /></span> </button>;

    return (
        <>
            <div className="position-absolute left-0 btn-container">
                <div className="">
                    {savedLocationBtn}
                    {touristAttractionBtn}
                </div>
            </div>
        </>
    );
}

export default Buttons;