const {spawn} = require("child_process")
const { error } = require("console")
const WebSocket = require("ws")

const wss = new WebSocket.Server({ port: 8080 })
wss.on("connection", (ws) => {
    const adb = spawn('adb',[
        'exec-out','screenrecord',
        '--output-format=h264','-'
    ])

    adb.stderr.on("error",(error)=>{console.log(error)})

    adb.stdout.on("data",(data)=>{
        ws.send(data)
        console.log("已发送")
    })

    ws.on("close", () => {
        adb.kill()
        console.log("关闭子进程")
    })
})
console.log("wensocket server running on 8080")