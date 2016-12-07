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
        		btn = $(mode+'Exclude');

        	if( list.indexOf(host) > -1 ) {
        		btn.classList.add('checked');
        	}

        	// 显示对应模式的按钮
        	btn.style.display = 'block';

        	// 是否强制替换
        	if( OPTIONS.forceReplaceList.indexOf(host) > -1 ) {
        		$('forceReplace').classList.add('checked');
        	}
        })
    });
}

init();