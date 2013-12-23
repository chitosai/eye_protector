/**
 * 获取元素样式
 *
 */
var getStyle = function(dom, attr) {
	return window.getComputedStyle(dom, null)[attr];
}

/**
 * 获取rgba数组
 *
 */
var parseRGBA = function(str) {
	var rgba = str.match(/\d+/g),
		r = parseInt(rgba[0]),
		g = parseInt(rgba[1]),
		b = parseInt(rgba[1]),
		a = parseInt(rgba[1]);
	return [r, g, b, a];
}

/**
 * 计算亮度

 *
 */
var calcBrightness = function(dom, attr) {
	// 读取颜色数据
	var bgcolor = getStyle(dom, attr);
	if( !bgcolor ) return false;

	var rgba = parseRGBA(bgcolor);

	// alpha通道为0是transparent
	if( !rgba[3] ) return false;

	// by henix
	// http://userscripts.org/scripts/show/138275
	var brightness = (Math.max(rgba[0], rgba[1], rgba[2]) 
						+ Math.min(rgba[0], rgba[1], rgba[2])) / 255 / 2;

	return brightness;
}

/*
 * 替换颜色
 * @return 3 设置了背景色，且背景色亮度超过阈值，替换了背景色
 * @return 2 设置了背景色，但背景色亮度没有超过阈值，没有替换背景色
 * @return 1 元素没有设置背景色
 * @return 0 此元素依照config中的设置跳过不处理
 */
var replaceBackgroundColor = function(dom) {
	// 是否需要替换背景色
	if( !option.replaceTextInput && dom.type == 'text' ) return 0;

	// 根据亮度判断是否需要替换
	var brightness = calcBrightness(dom, 'backgroundColor');
	if( !brightness ) return 1;

	if ( brightness > option.bgColorBrightnessThreshold ) {
		dom.style.webkitTransition = 'background .3s ease';
		dom.style.backgroundColor = option.replaceBgWithColor;
		// dom.style.backgroundColor = 'rgba(0, 0, 0, .1)';
		return 3;
	} else {
		return 2;
	}
}

/**
 * 修改Border颜色
 *
 */
var replaceBorderColor = function(dom) {
	// 四边各自计算
	var prefixs = ['Top', 'Bottom', 'Left', 'Right'];

	var _borderWidthAttr = 'border%sWidth', borderWidthAttr,
		_borderColorAttr = 'border%sColor', borderColorAttr, 
		borderWidth, borderBrightness, prefix;

	for( i in prefixs ) {
		prefix = prefixs[i];
		// 先判断下是否有边框
		borderWidthAttr = _borderWidthAttr.replace('%s', prefix);
		borderWidth = getStyle(dom, borderWidthAttr);
		if( !borderWidth ) continue;

		// 然后判断是否需要替换颜色
		borderColorAttr = _borderColorAttr.replace('%s', prefix);
		borderBrightness = calcBrightness(dom, borderColorAttr);
		if( !borderBrightness ) continue;

		if( borderBrightness > option.borderColorBrightnessThreshold ) {
			dom.style[borderColorAttr] = option.replaceBorderWithColor;

			// 是否替换边框样式
			if( option.replaceBorderStyle && parseInt(borderWidth) == 1 ) {
				dom.style[ 'border' + prefix + 'Style'] = 'dashed';
			}
		}
	}
}

/**
 * 修改文字颜色
 *
 */
var replaceTextColor = function(dom) {
	if( !option.replaceTextColor ) return false;

	// 文字亮度
	var brightness = calcBrightness(dom, 'color'), color;
	if( !brightness ) return false;

	// 确认此元素亮度过高且自身没有背景图片
	var bgImage = getStyle(dom, 'backgroundImage');
	if( brightness > option.borderColorBrightnessThreshold &&
		( !bgImage || bgImage == '') ) {
		// 替换文字颜色
		dom.style.color = '#000';
	}
}

/**
 * 替换颜色啦啦啦
 * @param Node dom
 * @param bool processOther 是否处理边框、文字等其他颜色，此参数继承
 *
 */
var replaceColor = function(dom, processOther) {
	// 替换背景色
	var bgColorReplacReturn = replaceBackgroundColor(dom);
	// 根据是否替换了背景色决定是否要处理边框、文字颜色等
	if( bgColorReplacReturn == 3 ) {
		processOther = true;
	} else if( bgColorReplacReturn == 2 ) {
		processOther = false;
	}

	// 是否处理子元素
	if( processOther ) {
		// 替换边框色
		replaceBorderColor(dom);
		// 替换文本颜色
		replaceTextColor(dom);
	}

	// 递归
	var c = dom.childNodes, len = c.length, i;
	for( i = 0; i < len; i++ ) {
		if( c[i].nodeType == 1 ) {
			replaceColor(c[i], processOther );
		}
	}
}

function protectEye() {
	// 遍历DOM替换成目标色
	replaceColor(document.body);
	// 替换body
	document.body.style.backgroundColor = option.replaceColor;
}

function stopProtect() {

}

function start() {
	protectEye();
	timer = setInterval(protectEye, 1000);
}

function pause() {
	clearInterval(timer);
}

function check() {
	readOption(function() {
		if( option['skip-' + currentHost] ) {
			pause();
		} else {
			start();
		}
	});
}

var currentHost = '', timer;

function init() {
	// 保存域名
	currentHost = document.location.host.split('.').join('-dot-');

	check();

	// 设置改变时重新读取设置
	chrome.storage.onChanged.addListener(check);
}

// GO
init();