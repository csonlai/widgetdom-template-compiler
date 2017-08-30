import fs from 'fs';
import path from 'path';
import compiler from './lib/compiler';
import codeTplStr from './lib/codeTemplate';
import recursive from 'recursive-readdir';
import { Watcher } from 'watch-fs';

const tplExtName = '.wxml';
// 用户模版路径
const tplPath = process.argv[2];
// 文件列表
const fileList = fs.readdirSync('./');

// 生成编译模版文件
const createCompileFile = (file) => {
    // 用户模版
    const tplStr = fs.readFileSync(file, 'utf-8');
    const codeStr = compiler.compileTpl(tplStr);

    fs.writeFile(getCompileFileName(file), codeTplStr.replace(/\{\{code\}\}/, codeStr));
}
const isTplFile = (file) => {
    return path.extname(file) === tplExtName;
}

const getCompileFileName = (file) => {
    const destFile = path.basename(file, tplExtName) + '.compile.js';
    return path.dirname(file) + '/' + destFile;
}


// 文件监听
const watcher = new Watcher({
    paths: ['./'],
    filters: {
        includeFile: function(file) {
            return isTplFile(file);
        }
    }
});

watcher.on('create', function(file) {
    console.log('File Created: ' + file);
    createCompileFile(file);
});

watcher.on('change', function(file) {
    console.log('File Changed: ' + file);
    createCompileFile(file);
});

watcher.on('delete', function(file) {
    console.log('File Deleted: ' + file);
    const compleFileName = getCompileFileName(file);
    if (fs.existsSync(compleFileName)) {
        fs.unlinkSync(compleFileName);
    }
});

watcher.start(function(err, failed) {
    console.log('Start Watching...');
    recursive('./', ['node_modules/*'], (err, files) => {
        // 批量生成模版对应的compile.js
        files.forEach(file => {
            if (isTplFile(file)) {
                createCompileFile(file)
            }
        });        
    });

});










