// --- 1. KHỞI TẠO PYTHON VỚI THƯ VIỆN PYODIDE ---
let pyodideObj = null;
async function startPython() {
    try {
        pyodideObj = await loadPyodide();
        document.getElementById('output').textContent = "Môi trường đã sẵn sàng. Hãy viết code và bấm nút 'CHẠY CODE (RUN)'.";
    } catch (e) {
        document.getElementById('output').textContent = "Lỗi hệ thống: Không thể khởi chạy lõi Python.";
    }
}
startPython();

// Hàm xử lý việt hóa nội dung báo lỗi kỹ thuật của máy tính
function thongBaoLoiTiengViet(msg) {
    if (msg.includes("SyntaxError")) return "Lỗi cú pháp nghiêm trọng! Hãy xem lại xem bạn có quên đóng ngoặc '()', thiếu dấu nháy '\"' hoặc sai cấu trúc lệnh không nhé.";
    if (msg.includes("NameError")) return "Lỗi từ khóa rồi! Hàm hoặc tên biến này nhìn lạ quá, kiểm tra lại xem có viết sai chính tả chữ nào không nha.";
    if (msg.includes("IndentationError")) return "Thụt lề bị lỗi rồi! Hãy nhớ các dòng lệnh thuộc cùng một khối trong Python phải thụt lề bằng nhau.";
    if (msg.includes("TypeError")) return "Sai kiểu dữ liệu rồi! Không thể thực hiện các phép toán hoặc nối chuỗi chéo giữa chữ viết và số đâu.";
    if (msg.includes("ZeroDivisionError")) return "Lỗi toán học: Hệ thống không cho phép thực hiện phép chia dữ liệu cho số 0.";
    return "Phát hiện mã nguồn bất thường tại vị trí này! Mau kiểm tra lại cấu trúc.";
}

// --- 2. LOGIC ĐIỀU HƯỚNG BẮT LỖI KHI BẤM NÚT RUN ---
async function runPython() {
    if (!pyodideObj) return;
    const codeBox = document.getElementById('code');
    const mirror = document.getElementById('textarea-mirror');
    const outputBox = document.getElementById('output');
    const bubble = document.getElementById('spider-bubble');
    
    outputBox.textContent = "Đang quét dữ liệu...";
    bubble.style.display = "none";
    
    // Reset vị trí nhện xuất phát bò từ đỉnh màn hình xuống
    spider.x = window.innerWidth / 2;
    spider.y = 40;
    spider.state = "WALKING";

    pyodideObj.runPython(`
        import sys, io
        sys.stdout = io.StringIO()
    `);

    try {
        await pyodideObj.runPythonAsync(codeBox.value);
        outputBox.textContent = pyodideObj.runPython("sys.stdout.getvalue()");
        spider.state = "IDLE";
    } catch (err) {
        // Màn hình run bên phải vẫn giữ nguyên log hệ thống gốc của Programiz
        outputBox.textContent = err.message;

        // Định vị số dòng phát sinh lỗi
        let errorLine = 1;
        const match = err.message.match(/line (\d+)/);
        if (match) errorLine = parseInt(match);

        // Thuật toán đo đạc pixel tọa độ hình học của ký tự lỗi trong Textarea
        const lines = codeBox.value.split('\n');
        let targetTextIndex = 0;
        for (let i = 0; i < errorLine - 1; i++) {
            targetTextIndex += lines[i].length + 1;
        }
        
        const textBeforeError = codeBox.value.substring(0, targetTextIndex + (lines[errorLine-1] ? lines[errorLine-1].search(/\S/) : 0));
        
        mirror.style.width = codeBox.clientWidth + "px";
        mirror.textContent = textBeforeError;
        
        const marker = document.createElement('span');
        marker.textContent = "X";
        mirror.appendChild(marker);

        const boxRect = codeBox.getBoundingClientRect();
        
        // Tọa độ đích đến để nhện dừng lại bò bám và vươn chân chỉ điểm
        spider.targetX = boxRect.left + marker.offsetLeft + 10;
        spider.targetY = boxRect.top + marker.offsetTop + 10;
        
        spider.state = "FOUND_ERROR";
        spider.errorText = thongBaoLoiTiengViet(err.message);
    }
}

// --- 3. ĐỒ HỌA ĐỘNG HỌC ĐẢO VÀ HIỆU ỨNG TƠ NHỆN ĐỎ ---
const canvas = document.getElementById("spider-layer");
const ctx = canvas.getContext("2d");

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener("resize", resize);
resize();

let spider = {
    x: 200, y: 200,
    targetX: 200, targetY: 200,
    state: "IDLE",
    errorText: "",
    legStretch: 0
};

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bubble = document.getElementById('spider-bubble');

    let dx = spider.targetX - spider.x;
    let dy = spider.targetY - spider.y;
    let dist = Math.hypot(dx, dy);

    if (spider.state === "FOUND_ERROR" || spider.state === "WALKING") {
        if (dist > 5) {
            spider.x += (dx / dist) * 6;
            spider.y += (dy / dist) * 6;
            spider.legStretch = 0;
            bubble.style.display = "none";
        } else if (spider.state === "FOUND_ERROR") {
            // Khi tiếp cận điểm lỗi: chân trước duỗi dài ra chỉ chữ và hiện hộp thoại nói chuyện tiếng Việt
            spider.legStretch = Math.min(spider.legStretch + 1.8, 50);
            
            bubble.style.left = `${spider.x - 30}px`;
            bubble.style.top = `${spider.y - 75}px`;
            bubble.innerHTML = `🕷️ <b>Nhện Kiểm Lỗi:</b><br>${spider.errorText}`;
            bubble.style.display = "block";

            // Giăng hiệu ứng mạng tơ quét đỏ rực bao quanh vùng chữ lỗi giống ảnh mẫu
            const pulseTime = Date.now() * 0.005;
            ctx.strokeStyle = "rgba(255, 71, 87, 0.4)";
            ctx.lineWidth = 1;
            for (let k = 0; k < 6; k++) {
                ctx.beginPath();
                ctx.moveTo(spider.x, spider.y);
                ctx.lineTo(spider.x + Math.cos(pulseTime + k) * 70, spider.y + Math.sin(pulseTime + k) * 70);
                ctx.stroke();
            }
        }
    } else {
        // Lúc rảnh rỗi bò ngẫu nhiên quanh thanh công cụ
        if (Math.random() < 0.003) {
            spider.targetX = Math.random() * (window.innerWidth * 0.4) + 40;
            spider.targetY = Math.random() * 250 + 80;
            spider.state = "WALKING";
        }
    }

    const time = Date.now() * 0.007;

    // Thiết lập hệ thống chân nhện toán học co duỗi linh hoạt
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
        let angle = (i * Math.PI / 4) + Math.sin(time + i) * 0.12;
        let jointX = spider.x + Math.cos(angle) * 15;
        let jointY = spider.y + Math.sin(angle) * 15;
        
        let isFrontLeg = (i === 3 || i === 4 || i === 2);
        let currentLength = 28 + (isFrontLeg ? spider.legStretch : 0);

        let footX = spider.x + Math.cos(angle) * currentLength;
        let footY = spider.y + Math.sin(angle) * currentLength;

        // Đổi màu chân nhện sang đỏ rực khi bắt lỗi
        ctx.strokeStyle = spider.state === "FOUND_ERROR" ? "#ff4757" : "#2f3542";
        
        ctx.beginPath();
        ctx.moveTo(spider.x, spider.y);
        ctx.lineTo(jointX, jointY);
        ctx.lineTo(footX, footY);
        ctx.stroke();

        // Tạo chấm tròn ghim định vị lỗi tại đầu ngón chân tiếp xúc chữ
        if (spider.state === "FOUND_ERROR" && isFrontLeg) {
            ctx.fillStyle = "#ff4757";
            ctx.beginPath();
            ctx.arc(footX, footY, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Vẽ phần thân trung tâm của nhện
    ctx.fillStyle = "#1e1e2f";
    ctx.beginPath();
    ctx.arc(spider.x, spider.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Đôi mắt nhện phát sáng công nghệ
    ctx.fillStyle = spider.state === "FOUND_ERROR" ? "#ff4757" : "#2ed573";
    ctx.beginPath(); ctx.arc(spider.x - 3, spider.y - 3, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(spider.x + 3, spider.y - 3, 1.5, 0, Math.PI * 2); ctx.fill();

    requestAnimationFrame(draw);
}
draw();
