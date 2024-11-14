const process = require("child_process")
const WebSocket = require("ws")

const wss = new WebSocket.Server({ port: 8080 })
wss.on("connection", (ws) => {
    console.log("client connected")
    const adb = process.spawn('adb', ['exec-out', 'screenrecord', '--output-format', 'mp4', '-'])
    const ffmpeg = process.spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-f', 'mjpeg',
        '-q:v', '5',
        'pipe:1'
    ])
    adb.stdout.pipe(ffmpeg.stdin)
    ffmpeg.stdout.on('data', (data) => {
        ws.send(data)
    })

    ws.on("close", () => {
        adb.kill()
        ffmpeg.kill()
        console.log("client disconnected")
    })
})
console.log("wensocket server running on 8080")