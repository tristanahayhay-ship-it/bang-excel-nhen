const codeInput = document.getElementById('code-input');
const lineBox = document.getElementById('line-box');
const consoleOutput = document.getElementById('console-output');
const runBtn = document.getElementById('run-btn');
const canvas = document.getElementById('spider-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Quản lý trạng thái
let targetX = window.innerWidth - 100;
let targetY = 100;
let isBugActive = false;
let tiengVietError = "";

// Cấu trúc hoạt ảnh con nhện máy
const spider = {
    x: window.innerWidth - 100,
    y: 100,
    size: 13,
    color: '#3b82f6',
    speed: 0.07,
    legs: []
};

for (let i = 0; i < 8; i++) {
    spider.legs.push({ currentX: spider.x, currentY: spider.y, cycle: Math.random() * 10 });
}

// Hàm cập nhật thanh số dòng (Line Numbers) chạy mượt theo ô nhập liệu
function updateLineNumbers() {
    const lines = codeInput.value.split('\n').length;
    let lineStr = '';
    for (let i = 1; i <= Math.max(lines, 1); i++) {
        lineStr += i + '<br>';
    }
    lineBox.innerHTML = lineStr;
}

// BỘ ĐIỀU PHỐI DỊCH THÔNG BÁO LỖI SANG TIẾNG VIỆT THUẦN TÚY
function dịchLỗiTiếngViệt(englishMsg) {
    if (englishMsg.includes("Unexpected token")) {
        return "Cú pháp không hợp lệ: Xuất hiện ký tự lạ hoặc gõ sai từ khóa.";
    }
    if (englishMsg.includes("Missing semicolon")) {
        return "Thiếu dấu chấm phẩy (;) ở cuối câu lệnh.";
    }
    if (englishMsg.includes("Unterminated string constant") || englishMsg.includes("Unterminated string")) {
        return "Lỗi chuỗi văn bản: Bạn quên chưa đóng dấu ngoặc kép hoặc ngoặc đơn.";
    }
    if (englishMsg.includes("Unexpected number")) {
        return "Lỗi số học: Vị trí đặt con số không hợp lệ.";
    }
    return "Lỗi cấu trúc cú pháp mã nguồn: Vui lòng kiểm tra lại.";
}

// HÀM KIỂM TRA LỖI CODE TỰ ĐỘNG
function scanForBugs() {
    const code = codeInput.value;
    updateLineNumbers();

    try {
        acorn.parse(code, { ecmaVersion: 2020, locations: true });
        
        // Code sạch, không có lỗi
        isBugActive = false;
        spider.color = '#3b82f6'; // Nhện chuyển màu xanh dương thư giãn
        // Nhện tự động bò sang góc bảng điều khiển bên phải để ẩn nấp nghỉ ngơi
        targetX = canvas.width - 50;
        targetY = 100;
    } catch (err) {
        // Phát hiện lỗi code
        isBugActive = true;
        spider.color = '#ef4444'; // Nhện tức giận đổi sang màu đỏ rực
        
        // Dịch thông báo sang tiếng Việt và in ra màn hình Console bên phải
        tiengVietError = dịchLỗiTiếngViệt(err.message);
        consoleOutput.innerHTML = `<span class="error-text">❌ PHÁT HIỆN BUG (Dòng ${err.loc.line}, Cột ${err.loc.column}):\n👉 ${tiengVietError}</span>`;

        // Định vị tọa độ của lỗi trên màn hình bên trái
        const fontSize = 15;
        const lineHeight = 24;
        const startTop = 20;
        const startLeft = 45 + 15; // Kích thước của thanh số dòng + padding

        targetY = startTop + ((err.loc.line - 0.5) * lineHeight) - codeInput.scrollTop;
        targetX = startLeft + (err.loc.column * (fontSize * 0.55)) - codeInput.scrollLeft;

        // Đảm bảo tọa độ nhện bò không bị văng ra khỏi khu vực hiển thị của Editor
        const maxEditorWidth = canvas.width * 0.6; // Editor chiếm 60% bên trái
        targetX = Math.max(60, Math.min(maxEditorWidth - 30, targetX));
        targetY = Math.max(30, Math.min(canvas.height - 30, targetY));
    }
}

// Bấm nút chạy code theo kiểu Programiz
runBtn.addEventListener('click', () => {
    if (!isBugActive) {
        consoleOutput.innerHTML = `<span style="color: #10b981;">[Hệ thống] Chạy chương trình thành công!\n-----------------------\nHiển thị: Hệ thống hoạt động tốt!</span>`;
    } else {
        consoleOutput.innerHTML = `<span class="error-text">❌ Không thể chạy chương trình vì mã nguồn vẫn còn lỗi cú pháp! Hãy đợi nhện tìm xong và sửa lại.</span>`;
    }
});

// Sự kiện lắng nghe gõ phím và cuộn trang
codeInput.addEventListener('input', scanForBugs);
codeInput.addEventListener('scroll', () => {
    lineBox.scrollTop = codeInput.scrollTop; // Đồng bộ cuộn thanh số dòng
    if (isBugActive) scanForBugs();
});

// VÒNG LẶP HÌNH ẢNH NHỆN DI CHUYỂN
function loop() {
    // Thuật toán nội suy chuyển động (Lerp) bám mục tiêu
    spider.x += (targetX - spider.x) * spider.speed;
    spider.y += (targetY - spider.y) * spider.speed;

    let angle = Math.atan2(targetY - spider.y, targetX - spider.x);
    const dist = Math.hypot(targetX - spider.x, targetY - spider.y);
    const moving = dist > 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ chân nhện cơ học bám dòng chữ
    ctx.strokeStyle = spider.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    
    for (let i = 0; i < 8; i++) {
        const leg = spider.legs[i];
        leg.cycle += moving ? 0.3 : 0.02;

        const offset = ((i % 4) - 1.5) * 0.4 + (i < 4 ? Math.PI : 0);
        const reach = spider.size * 2.4;
        
        let idealX = spider.x + Math.cos(angle + offset) * reach;
        let idealY = spider.y + Math.sin(angle + offset) * reach;

        if (moving) {
            idealX += Math.cos(leg.cycle) * 6;
            idealY += Math.sin(leg.cycle) * 6;
        }

        leg.currentX += (idealX - leg.currentX) * 0.3;
        leg.currentY += (idealY - leg.currentY) * 0.3;

        ctx.beginPath();
        ctx.moveTo(spider.x, spider.y);
        const kneeX = (spider.x + leg.currentX) / 2 + Math.sin(leg.cycle + i) * 4;
        const kneeY = (spider.y + leg.currentY) / 2 - 10;
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(leg.currentX, leg.currentY);
        ctx.stroke();
    }

    // Vẽ Thân & Đầu
    ctx.fillStyle = spider.color;
    ctx.beginPath();
    ctx.arc(spider.x, spider.y, spider.size, 0, Math.PI * 2);
    ctx.fill();

    const hX = spider.x + Math.cos(angle) * (spider.size * 0.8);
    const hY = spider.y + Math.sin(angle) * (spider.size * 0.8);
    ctx.beginPath();
    ctx.arc(hX, hY, spider.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Hiển thị bong bóng thông báo tiếng Việt nhỏ ngay trên lưng nhện khi bắt được bug
    if (isBugActive && dist < 15) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.beginPath();
        ctx.roundRect(spider.x + 20, spider.y - 40, 160, 26, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';
        ctx.fillText("⚠️ Phát hiện lỗi cú pháp!", spider.x + 28, spider.y - 23);
    }

    requestAnimationFrame(loop);
}

// Khởi chạy hệ thống ban đầu
scanForBugs();
loop();
