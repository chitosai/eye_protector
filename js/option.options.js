function onClick() {
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
    // 读取设置
    readOption(function() {
        var options = OPTIONS.basic, key, node;
        for( key in options ) {
            if( options[key] ) {
	            node = $(key);
	            if( node ) {
	                node.classList.add('checked');
	            }
            }
        }
    });

    // 修改设置
    var nodes = $$('.option-check');
    nodes.forEach(function(node) {
        node.addEventListener('click', onClick);
    });
}

init();