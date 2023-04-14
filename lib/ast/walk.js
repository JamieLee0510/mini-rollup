
// 遍歷AST語法樹的所有節點
function walk(ast, {enter, leave}){
    // 訪問節點
    visit(ast, null, enter, leave)
}

function visit(node, parent, enter, leave){
    // 調用enter方法，並將節點與父節點傳進去
    if(enter){
        enter(node, parent)
    }
    // 再遍歷子節點,子節點可能是array、可能是object
    let childKeys = Object.keys(node).filter(key => typeof node[key] == 'object')
    childKeys.forEach(childKey=>{
        const value = node[childKey]
        // 只會是array or object
        if(Array.isArray(value)){
            // 還要再遍歷數組
            value.forEach(val=>{
                visit(val, node, enter, leave)
            })
        }else{
            visit(value, node, enter, leave)
        }
    })

    // 然後離開
    if(leave){
        leave(node, parent)
    }
}

module.exports = walk