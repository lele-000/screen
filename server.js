const {spawn} = require("child_process")
const { error } = require("console")
const WebSocket = require("ws")

const wss = new WebSocket.Server({ port: 8080 })
wss.on("connection", (ws) => {
    const adb = spawn('adb',[
        'exec-out','screenrecord',
        '--output-format=h264','-'
    ])
    const ffmpeg = spawn('ffmpeg',[
        '-i','pipe:0',
        '-vf','fps=30',
        '-loglevel','error',
        '-f', 'image2pipe', 
        '-vcodec', 'mjpeg', 
        'pipe:1'
    ])

    adb.stdout.pipe(ffmpeg.stdin); //将adb的标准输出传给ffmpeg

    adb.stderr.on("error",(error)=>{console.log(error)})
    ffmpeg.stderr.on("error",(error)=>{console.log(error)})

    let buffer = Buffer.alloc(0)
    ffmpeg.stdout.on("data",(data)=>{
        console.log(data)
        buffer = Buffer.concat([buffer,data])

        let start = buffer.indexOf(Buffer.from([0xFF,0xD8]))
        let end = buffer.indexOf(Buffer.from(0xFF,0XD9),start)

        while (start !== -1 & end !== -1) {
            const frame = buffer.slice(start,end+2)
            ws.send(frame)
            console.log("已发送")

            buffer = buffer.slice(end+2)
            start = buffer.indexOf(Buffer.from([0xFF,0xD8]))
            end = buffer.indexOf(Buffer.from([0xFF,0xD9]),start)
        }
    })

    ws.on("close", () => {
        adb.kill()
        ffmpeg.kill()
        console.log("关闭子进程")
    })
})
console.log("wensocket server running on 8080")