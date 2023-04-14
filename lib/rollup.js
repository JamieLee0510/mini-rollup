
const Bundle = require('./bundle')

function rollup(entry, outputFileName){

    // Bundle為打包對象，裡面會包含所有的模塊信息
    const bundle = new Bundle({entry})

    // 調用Bundle方法，進行編譯
    bundle.build(outputFileName)
}

module.exports = rollup
