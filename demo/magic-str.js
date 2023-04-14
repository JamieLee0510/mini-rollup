const MagicStr = require('magic-string')
const fs = require('fs')
const path = require('path')

function demo(){
    const route = path.resolve(__dirname, './demo.js')
    const code = fs.readFileSync(route,'utf-8')
    const magicStr = new MagicStr(code, { filename:route })

  
    console.log('code:',code)
    console.log('magicStr:',magicStr.toString())
}

demo()