
/**
 * 為何要創建作用域物件？畢竟在AST中應該就已經會標示節點的各個內容
 * 為了tree-shaking！假如該變量找不到作用域，就不要打包；
 * 在遍歷源代碼的過程中，會先忽略import語句、函數和變量聲明
 * 直到使用了函數或變量，才會順著作用域鏈查找
 */
class Scope{
    constructor(options = {}){
        // 給作用域起個名，沒啥用處
        this.name = options.name 

        // 父作用域
        this.parent = options.parent

        // 此作用域內有哪些變量
        this.names = options.params || []
    }

    // 在此作用域添加變量
    add(name){
        this.names.push(name)
    }

    // 查找變量在哪個作用域
    findDefiningScope(name){
        if(this.names.includes(name)){
            return this
        }

        if(this.parent){
            return this.parent.findDefiningScope(name)
        }

        return null
    }
}

module.exports = Scope