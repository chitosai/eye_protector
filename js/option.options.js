var CLICKLISTENERS = {
	check: function() {
	    var key = this.id;

	    // 根据选项类型反转选项
	    var option = OPTIONS.basic[key];
	    if( typeof option == 'boolean' ) {
	        OPTIONS.basic[key] = !option;
	    };
	    saveOption();

	    // toggle class
	    this.classList.toggle('checked');
	},
	radio: function() {
		
	}
}

function init() {
    // 读取设置
    readOption(function() {
        var options = OPTIONS.basic, key, node;
        for( key in options ) {
            if( options[key] === true ) {
	            node = $(key);
	            if( node ) {
	                node.classList.add('checked');
	            }
            }
        }

        // 工作模式暂时没想到怎么做通用，就做个特例吧
        $(OPTIONS.basic.mode).classList.add('checked');
    });

    // 修改设置
    var nodes = $$('.option-item');
    nodes.forEach(function(node) {
        node.addEventListener('click', CLICKLISTENERS[node.getAttribute('type')]);
    });
}

init();