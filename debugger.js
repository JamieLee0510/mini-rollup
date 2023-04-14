const path  = require('path')
const rollup = require('./lib/rollup')

// 入口文件的絕對路徑
let entry = path.resolve(__dirname,'./src/main.js')

rollup(entry, 'bundle.js') // 源碼為異步，目前為了可讀性先寫同步

