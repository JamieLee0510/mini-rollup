
const MagicStr = require('magic-string')
const path = require('path')
const {parse} = require('acorn')

const analyse = require('./ast/analyse')

/**
 * 每個文件，都是一個模塊
 * 每個模塊，都對應一個Module實例
 */
class Module{
    constructor({code, path, bundle}){
        this.code = new MagicStr(code, {filename:path})

        //模塊的路徑
        this.path = path 

        //屬於哪個bundle實例
        this.bundle = bundle 

        // 把源碼轉換成AST
        this.ast = parse(code, { 
            sourceType: 'module',
            ecmaVersion:8
        })

        this.analyse()
    }

    analyse(){
        analyse(this.ast, this.code, this)
    }

    /**
     * 展開這個模塊裡的語句，把這些語句中定義變量的語句都放到打包結果
     */
    expandAllStatements(){
        const allStatements = []
        this.ast.body.forEach(statement=>{
            // 展開一個節點
            const statements = this.expendStatement(statement)
            allStatements.push(...statements)
        })
        return allStatements
    }
    

    /**
     * 展開一個節點、找到當前節點依賴的變量；
     * 它訪問的變量，找到它的聲明語句
     * 可能在當前模塊內、也有可能在導入的模塊內聲明
     * @param {*} statement 
     */
    expendStatement(statement){
        // 表示這個節點已確定被納入打包結果
        // 以後就不需要重複打包
        statement._include = true

        const result = []

        // tree-shaking的核心在此
        result.push(statement)
        return result
    }
}

module.exports = Module