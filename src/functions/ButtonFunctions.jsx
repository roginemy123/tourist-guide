function ButtonFunctions({ el, secondEl }){

    console.log(this);
    

    if (el.style.display == 'none') {
        el.style.display = 'block';
        secondEl.style.display = 'none';
    }else{
        el.style.display = 'none';
        secondEl.style.display = 'none';
    }
}

export default ButtonFunctions;