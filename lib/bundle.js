const fs = require('fs')
const MagicString = require('magic-string')
const Module = require('./module')
// const { default: MagicString } = require('magic-string')

class Bundle{
    constructor(options = {}){
        //入口文件的絕對路徑+後綴；不管原先是不是'.js'結尾，先替換成空，再加上‘.js’
        this.entryPath = options.entry.replace(/\.js$/,'')+'.js'

        // 存放所有模塊，入口文件和它依賴的模塊
        this.modules = {}
    }
    build(outputFileName){
        // 從入口文件出發找到它的模塊定義
        let entryModule = this.fetchModule(this.entryPath)

        // 把這個入口文件的所有語句進行展開，返回所有語句組成的array
        // 此語句集合是順著作用域鏈查找的結果，這過程包含了tree-shaking的含義
        this.statements = entryModule.expandAllStatements()

        const { code } = this.generate()
        fs.writeFileSync(outputFileName, code, 'utf-8')
    }

    // 獲取模塊信息，返回模塊
    fetchModule(importee){
        // 入口文件的絕對路徑
        let route = importee

        if(route){
            // 讀取源代碼
            const code = fs.readFileSync(route,'utf-8')
            const module = new Module({
                code, //模塊的源代碼
                path:route, //模塊的絕對路徑
                bundle:this //屬於哪個Bundle
            })
            return module
        }

        let module = new Module()
        return module
    }

    // 把 this.statements 生成源代碼
    generate(){
        const magicStrBundle = new MagicString.Bundle()
        this.statements.forEach(statement =>{
            
            const source = statement._source.clone() //在analyse的過程中加入的
            magicStrBundle.addSource({
                content: source,
                separator: '\n'
            
            })
        })
        return {code: magicStrBundle.toString()}
    }
}

module.exports = Bundle