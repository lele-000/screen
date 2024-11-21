const {spawn} = require("child_process")
const { error } = require("console")
const WebSocket = require("ws")
const FfmpegCommand = require("fluent-ffmpeg")
const {Client} = require("adb-ts")

const wss = new WebSocket.Server({ port: 8080 })
wss.on("connection",async (ws) => {
    console.log("websocket已连接")

    const adb = new Client()

    try {
        const devices =await adb.listDevices()
        if(devices.length == 0) {
            console.error("没有手机设备连接")
            ws.close()
            return
        }

        const device = devices[0].id
        console.log(`设备id:${device}`)

        const adbStream = adb.shell(
            device,
            "screenrecord --output-format=h264 -"
        )

        const ffmpeg = new FfmpegCommand(adbStream)
        .inputFormat("h264") // 输入流格式
        .videoCodec("libx264") // 使用 H.264 编码
        .outputOptions([
          "-movflags frag_keyframe+empty_moov", // 适用于实时流的选项
          "-preset ultrafast", // 使用快速预设
        ])
        .format("mp4") // 输出为 MP4 格式
        .on("start", () => {
          console.log("FFmpeg started");
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err.message);
          ws.close();
        })
        .on("end", () => {
          console.log("FFmpeg finished");
          ws.close();
        })

        ffmpeg.pipe(ws,{end:true})

        ws.on("close", () => {
            console.log("WebSocket连接关闭");
            adbStream.end();
            ffmpeg.kill("SIGINT");
          });

    } catch (err) {
        console.error("错误",err.message)
        ws.close()
    }

})
console.log("wensocket server running on 8080")