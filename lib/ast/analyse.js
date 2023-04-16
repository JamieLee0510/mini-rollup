
const Scope = require('./scope')
const walk = require('./walk')
/**
 * 
 * @param {*} ast 語法樹
 * @param {*} magicStr 源代碼
 * @param {*} module 屬於哪個模塊
 * 假如要tree-shaking，就要找到當前module使用了哪些變量
 * 還要知道哪些變量是當前module聲明好的、哪些是導入的
 */
function analyse(ast, magicStr, module){
    // 先創建模塊內的全局作用域
    let scope = new Scope()

    /**
     * 遍歷當前語法樹的頂級節點,找到節點內的聲明變量
     */
    ast.body.forEach(statement=>{
        // 給作用域添加在該模塊中聲明的變量，如const, let, var, functio
        function addToScope(declaration){
            const declaredName = declaration.id.name

            // 把變量添加到當前的作用域中
            scope.add(declaredName)

            // 當前作用域是全局作用域的話
            if(!scope.parent){
                // 在全局作用域下聲明該變量
                // scope._defines[declaredName] = true
                statement._defines[declaredName] = true
            }
        }
        Object.defineProperties(statement, {
            _defines:{value:{}}, // 存放當前模塊內定義的所有全局變量
            _dependsOn:{value:{}}, // 當前模塊定義但是沒有使用到的變量，也就是依賴的外部變量

            _included:{value:false, writable:true},// 此語句是否已經被包含在打包輸出當中

            // 將ast body 下的頂級節點加上 _source屬性
            // start為此源代碼節點的起始索引；end為結束索引
            _source:{ value : magicStr.snip(statement.start, statement.end)}
        })

        // 用walk構建作用域鏈
        walk(statement, {
            enter(node){
                let newScope;

                switch(node.type){
                    case 'FunctionDeclaration':
                        const params = node.params.map(x=>x.name)
                        addToScope(node)
                        // 為該函數創建新作用域，綁定parents、並把params加入到該作用域內
                        newScope = new Scope({
                            parent:scope,
                            params
                        })
                        break;
                    case 'VariableDeclaration': //‘var’不會生成新的作用域，目前先這樣處理
                        // 變量聲明可能在一row裡面有多個聲明，所以是個數組
                        node.declarations.forEach(addToScope)
                        break;
                }

                // 假如當前節點有新的作用域
                if(newScope){
                    // 如果此節點生成了一個新的作用域，聲明一個_scope成員來綁定
                    Object.defineProperty(node, "_scope", {value: newScope})

                    // 替換當前作用域，因為此作用域下可能也會有新的函數聲明之類的
                    // 在leave階段再往回退
                    scope = newScope
                }
            },
            leave(node){
                if(node._scope){ // 如果此節點有產生新的作用域
                    scope = scope.parent //離開時，把 scope 回退到父作用域
                }
            }
        })
    })

    /**
    * 遍歷當前語法樹的頂級節點,找到節點內的外部依賴
    * _dependsOn
    */
    ast.body.forEach(statement=>{
        walk(statement, {
            enter(node){
                if(!!node._scope){ //假如這個節點有_scope,代表產生了新的作用域
                    scope = node._scope
                }
                if(scope && node.type === "Identifier"){ //假如節點是變量
                    // 在當前作用域向上遞歸，找出變量在那個作用域
                    const definingScope = scope.findDefiningScope(node.name)
                    // 假如找不到，就代表該變量為外部依賴變量
                    if(!definingScope){
                        statement._dependsOn[node.name] = true
                    }
                }
            },
            leave(node){
                if(node._scope){ //假如這個節點有_scope,代表產生了新的作用域
                    scope = scope.parent
                }
            }
        })
    })

}

module.exports = analyse