const fs = require('fs');

function getAllEntityNames(){
    //TODO 获取所有自定义标签的名称
    let arrEntityNames = [];
    return arrEntityNames.join(', ');
}

export default 
`const $filterNullChildren = (children) => {
	return children.filter(child => child != null);
}

export default (data, opt) => {
	const {View, Text, Image, Navigator, Location, Picker, ${getAllEntityNames()}} = opt;
	{{code}};
}`


