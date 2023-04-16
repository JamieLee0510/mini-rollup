
const MagicStr = require('magic-string')
const path = require('path')
const {parse} = require('acorn')

const analyse = require('./ast/analyse')

/**
 * 判斷obj上是否有prop屬性
 * @param {*} obj 
 * @param {*} prop 
 * @returns 
 */
function ownProperty(obj, prop){
    return Object.prototype.hasOwnProperty.call(obj, prop)
}

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
        // 分析導入導出
        this.imports = {} //存放當前模塊所有導入
        this.exports = {} //存放當前模塊所有導出

        this.ast.body.forEach(statement=>{
            // 為導入語句
            if(statement.type == "ImportDeclaration"){
                // 從哪個模塊進行的導入
                let source = statement.source.value

                // 導入的東西，是一個array(因為可能一次導入很多)
                let specifiers = statement.specifiers
                specifiers.forEach((specifier)=>{
                    // name有可能在導入的時候用了別名
                    const name = specifier.imported.name
                    const localName = specifier.local.name

                    // 把本地的變量紀錄到 imports 裡
                    // 假設 import {data as myData} from './demo'
                    // 這裡就會是  this.imports[myData] = {name:'data', localName:'myData', source:'./demo'}
                    this.imports[localName] = {name, localName, source}
                })
            }
            // else if(/^Export/.test(statement.type)){
            //     // 用正則是因為 export 的方式有很多
            else if(statement.type == "ExportNamedDeclaration"){
                // 先簡單一個一個寫
                const declaration = statement.declaration
                if(declaration.type == 'VariableDeclaration'){
                    const name = declaration.declarations[0].id.name
                    // expresstion--紀錄變量的聲明，可以透過ast反向編譯
                    // 這裡就會是  this.exports[myData] = {name:'myData', localName:'myData', expresstion}
                    this.exports[name] = {name, localName:name, expresstion:declaration}
                }
            }
        })

        analyse(this.ast, this.code, this)

        
        this.definiations = {}//存放所有全局變量的定義語句
        this.ast.body.forEach(statement=>{
            Object.keys(statement._defines).forEach(name=>{
                //key為全局變量名，value為全局變量語句
                // TODO: 這邊不太懂
                this.definiations[name] = statement
            })
        })
    }

    /**
     * 展開這個模塊裡的語句，把這些語句中定義變量的語句都放到打包結果
     */
    expandAllStatements(){
        const allStatements = []
        this.ast.body.forEach(statement=>{
            // 拋棄導入語句
            if(statement.type == "ImportDeclaration"){
                return;
            }

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
        const result = []

        //外部依賴   
        const dependenies = Object.keys(statement._dependsOn)     
        dependenies.forEach(name=>{
            // 找到這個變量的聲明節點，可能在內部模塊、或者外部
            let definiation = this.define(name)
            result.push(...definiation)
        })


        // 表示這個節點已確定被納入打包結果
        // 以後就不需要重複打包
        if(!statement._included ){
            statement._included = true
            // tree-shaking的核心在此
            result.push(statement)
        }

        return result
    }

    define(name){
        // 在存放導入object中查找有沒有name
        if(ownProperty(this.imports, name)){
             // 這裡就會是  this.imports[myData] = {name:'data', localName:'myData', source:'./demo'}
            const importData = this.imports[name]

            // 找到‘./demo’的模塊
            const module = this.bundle.fetchModule(importData.source, this.path)
            
            // this.exports[myData] = {name:'myData', localName:'myData', expresstion}
            const exportData = module.exports[importData.name]

            // 遞歸 ‘./demo’模塊的define方法，目的是為了返回該變量的定義語句
            return module.define(exportData.localName)
        }else{
            // 如果不在導入object中，就代表聲明應該是在該模塊內
            let statement = this.definiations[name]

            if(statement && !statement._included){
                return this.expendStatement(statement)
            }

            return []
        }


    }
}

module.exports = Module