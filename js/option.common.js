function onclick() {
    var key = this.id;

    // 根据选项类型反转选项
    var option = OPTIONS.basic[key];
    if( typeof option == 'boolean' ) {
        OPTIONS.basic[key] = !option;
    };
    saveOption();

    // toggle class
    this.classList.toggle('checked');
}

function init() {
    var nodes = $$('.option-item');
    nodes.forEach(function(node) {
        node.addEventListener('click', onclick);
    });
}

document.addEventListener('DOMContentLoaded', init);