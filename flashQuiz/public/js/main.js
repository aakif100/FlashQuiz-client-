window.addEventListener('load', () => {
    const loader = document.querySelector('.loader-container');
    const mainContent = document.querySelector('.main-content');
    
    setTimeout(() => {
        loader.classList.add('loader-hidden');
        mainContent.classList.remove('blur');
        
        loader.addEventListener('transitionend', () => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        });
    }, 2000); 
});
