function vivaldiIcon() {
    const adr = document.querySelector('.toolbar-mainbar')
    const menu = document.querySelector('.vivaldi');
    document.querySelector('.vivaldi').style = 'position: relative;';
    adr.appendChild(menu);
    document.querySelector('.win #tabs-container:not(.none).top').style.paddingLeft = 0;
};

let timer = setTimeout(function wait() {
    let adr = document.querySelector('.toolbar-mainbar');
    if (adr) {
        vivaldiIcon();
        clearTimeout(timer);
    }
    else {
        setTimeout(wait, 100);
    }
}, 100);
