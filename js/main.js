/**
 * 获取元素样式
 *
 */
var getStyle = function(dom, attr) {
	return window.getComputedStyle(dom, null)[attr];
}
var setStyle = function(dom, attr, value) {
	// 获取原始样式
	var originalStyle = getStyle(dom, attr),
		styleObjectEncoded = dom.getAttribute('eye-protector-original-style'),
		styleObject;

	// 带上class注明这个dom是被修改过样式的
	if( !styleObjectEncoded ) {
		styleObject = {};
		dom.classList.add('eye-protector-processed');
	} else {
		styleObject = JSON.parse(styleObjectEncoded);
	}

	// 新增样式
	if( !styleObject[attr] ) styleObject[attr] = originalStyle;

	// 写回去
	dom.setAttribute('eye-protector-original-style', JSON.stringify(styleObject));

	dom.style[attr] = value;
}

/**
 * 获取rgba数组
 *
 */
var parseRGBA = function(str) {
	var rgba = str.match(/[\d\.]+/g),
		r = parseInt(rgba[0]),
		g = parseInt(rgba[1]),
		b = parseInt(rgba[2]);
		
		if( rgba.length == 4 )
			a = parseFloat(rgba[3]);
		else
			a = 1;

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

/**
 * 根据预设的class列表跳过特定div，直接用IndexOf是因为这样highlight/highlight/highlighter之类的不用重复了
 * @return true dom中包含需要跳过的class
 * @return false 不包含
 * 
 */
var hasIgnoreClass = function(dom) {
	var classList = dom.className,
		ignoreClassList = option.ignoreClass;

	for(var i in ignoreClassList) {
		if( classList.indexOf(ignoreClassList[i]) > -1 ) {
			return true;
		}
	}
	return false;
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
	// 规避hightlighted/code等代码区块
	if( hasIgnoreClass(dom) ) return 0;

	// 根据亮度判断是否需要替换
	var brightness = calcBrightness(dom, 'background-color');
	if( brightness === false ) return 1;

	if ( brightness > option.bgColorBrightnessThreshold ) {
		dom.style.webkitTransition = 'background .3s ease';
		setStyle(dom, 'background-color', option.replaceBgWithColor);
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
	var prefixs = ['top', 'bottom', 'left', 'right'];

	var _borderWidthAttr = 'border-%s-width', borderWidthAttr,
		_borderColorAttr = 'border-%s-color', borderColorAttr, 
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
			setStyle(dom, borderColorAttr, option.replaceBorderWithColor);

			// 是否替换边框样式
			if( option.replaceBorderStyle && Math.round(parseFloat(borderWidth)) == 1 ) {
				setStyle(dom, 'border-' + prefix + '-style', 'dashed');
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
	var bgImage = getStyle(dom, 'background-image');
	if( brightness > option.borderColorBrightnessThreshold &&
		( !bgImage || bgImage == 'none') ) {
		// 替换文字颜色
		setStyle(dom, 'color', '#000');
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

/**
 * 回复页面原始样式
 * 
 */
function restoreColor() {
	var nodes = document.querySelectorAll('.eye-protector-processed'),
		len = nodes.length,
		i, j, node, originStyleEncoded, originalStyle;

	for( i = 0; i < len; i++ ) {
		node = nodes[i];
		originStyleEncoded = node.getAttribute('eye-protector-original-style');
		if( !originStyleEncoded ) continue;

		originalStyle = JSON.parse(originStyleEncoded);
		for( j in originalStyle ) {
			node.style[j] = originalStyle[j];
		}
	}
}

function protectEye() {
	// 替换body
	var bodyBgBrightness = calcBrightness(document.body);
	if( !bodyBgBrightness || bodyBgBrightness > option.bgColorBrightnessThreshold ) {
		setStyle(document.body, 'background-color', option.replaceBgWithColor);
	}
	// 遍历DOM替换成目标色
	replaceColor(document.body);
}

function start() {
	protectEye();
	timer = setInterval(protectEye, 1000);
}

function pause() {
	clearInterval(timer);
	restoreColor();
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
	currentHost = getHost(document.location.href);

	// GO
	check();

	// 设置改变时重新读取设置
	chrome.storage.onChanged.addListener(check);
}

// GO
init();