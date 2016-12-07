var url, host;

function onClick() {
    var key = this.id;

    // 根据选项类型反转选项
    var list = OPTIONS[key];
    if( list.indexOf(host) > -1 ) {
        list.remove(host);
    } else {
    	list.push(host);
    }
    saveOption();

    // toggle class
    this.classList.toggle('checked');
}

function init() {
    // 获取当前激活tab的域名
    chrome.tabs.query({'active': true, 'currentWindow': true}, function(tabs) {
        url = tabs[0].url, host = getHost(url);
        if( host ) {
        	$('domain').textContent = host;
        } else {
            console.error('无法获取当前页面的域名');
        }

        // 读取当前域名的配置
        readOption(function() {
        	// 是否在主动模式/被动模式的特例名单里
        	var mode = OPTIONS.basic.mode,
        		list = OPTIONS[mode+'List'],
        		btn = $(mode+'List');

        	if( list.indexOf(host) > -1 ) {
        		btn.classList.add('checked');
        	}

        	// 显示对应模式的按钮
        	btn.style.display = 'block';

        	// 是否强制替换
        	if( OPTIONS.forceReplaceList.indexOf(host) > -1 ) {
        		$('forceReplaceList').classList.add('checked');
        	}
        })
    });

    // 修改设置
    var nodes = $$('.option-check');
    nodes.forEach(function(node) {
        node.addEventListener('click', onClick);
    });
}

init();