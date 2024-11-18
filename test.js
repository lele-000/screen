const { spawn } = require("child_process");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

// 将剩余数据缓存下来，避免分块导致 NAL 单元截断
let leftoverBuffer = Buffer.alloc(0);

wss.on("connection", (ws) => {
    const adb = spawn('adb', [
        'exec-out', 'screenrecord',
        '--output-format=h264', '-',
    ]);

    adb.stderr.on("data", (error) => {
        console.error("ADB 错误:", error.toString());
    });

    adb.stdout.on("data", (data) => {
        // 拼接上上一次的剩余数据
        const buffer = Buffer.concat([leftoverBuffer, data]);

        // 分割 NAL 单元
        const nalUnits = splitNalUnits(buffer);

        // 保留未完整的部分作为下一次数据流的开头
        leftoverBuffer = nalUnits.incomplete;

        // 将完整的 NAL 单元发送给客户端
        nalUnits.complete.forEach((nalUnit) => {
            ws.send(nalUnit);
            console.log("发送完整的 NAL 单元");
        });
    });

    ws.on("close", () => {
        adb.kill();
        console.log("关闭子进程");
    });
});

console.log("WebSocket Server 正在运行在端口 8080");

/**
 * 分割 NAL 单元
 * @param {Buffer} buffer - 输入数据流
 * @returns {{ complete: Buffer[], incomplete: Buffer }}
 */
function splitNalUnits(buffer) {
    const nalSeparator = Buffer.from([0x00, 0x00, 0x00, 0x01]);
    const completeNalUnits = [];
    let start = 0;

    // 查找所有的 NAL 单元分隔符
    for (let i = 0; i <= buffer.length - nalSeparator.length; i++) {
        if (buffer.slice(i, i + nalSeparator.length).equals(nalSeparator)) {
            if (start !== i) {
                completeNalUnits.push(buffer.slice(start, i)); // 提取完整的 NAL 单元
            }
            start = i; // 更新 NAL 单元的起始位置
        }
    }

    // 如果最后还有剩余数据（未完整的部分）
    const incompleteNalUnit = buffer.slice(start);

    return {
        complete: completeNalUnits,
        incomplete: incompleteNalUnit,
    };
}