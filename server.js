const process = require("child_process")
const WebSocket = require("ws")

const wss = new WebSocket.Server({port:8080})
wss.on("connection",(ws)=>{
    console.log("client connected")
    const sendScreenshot = () => {
        const adb = process.spawn('adb',['exec-out','screencap','-p'])
        let chunks = []
        adb.stdout.on("data",(data)=>{
            chunks.push(data)
        })
        adb.on("close",()=>{
            const buffer = Buffer.concat(chunks)
            const base64Image = buffer.toString('base64')
            ws.send(base64Image)
        })
        adb.on("error",(error)=>{
            console.error("no capture",error)
        })
    }
    const intervalId = setInterval(sendScreenshot,100)
    ws.on("close",()=>{
        clearInterval(intervalId);
        console.log("client disconnected")
    })
})
console.log("wensocket server running on 8080")