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
}

init();