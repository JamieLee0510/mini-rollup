
function analyse(ast, magicStr, bundle){
    ast.body.forEach(statement=>{
        Object.defineProperties(statement, {
            // 將ast body 下的頂級節點加上 _source屬性
            // start為此源代碼節點的起始索引；end為結束索引
            _source:{ value : magicStr.snip(statement.start, statement.end)}
        })
    })

}

module.exports = analyse