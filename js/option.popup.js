function init() {
    // 获取当前激活tab的域名
    chrome.tabs.query({'active': true, 'currentWindow': true}, function(tabs) {
        url = tabs[0].url, host = getHost(url);
        if( host ) {
        	$('domain').textContent = host;
        } else {
            console.error('无法获取当前页面的域名');
        }
    });
}

init();