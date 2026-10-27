const codeInput = document.getElementById('code-input');
const canvas = document.getElementById('spider-canvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');

// Cấu hình Canvas kích thước đầy màn hình
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Trạng thái mục tiêu mà nhện cần bò tới
let targetX = window.innerWidth / 2;
let targetY = window.innerHeight / 2;
let isBugFound = false;
let errorMessage = "";

// Cấu trúc thực thể Nhện (Spider Object)
const spider = {
    x: 100,
    y: 100,
    size: 14,
    color: '#58a6ff',
    speed: 0.08, // Tốc độ nội suy chuyển động (Lerp)
    legs: []
};

// Khởi tạo 8 chân cho con nhện với các khớp xương
for (let i = 0; i < 8; i++) {
    spider.legs.push({
        currentX: spider.x,
        currentY: spider.y,
        targetX: spider.x,
        targetY: spider.y,
        cycle: Math.random() * Math.PI * 2
    });
}

// 1. LOGIC PHÂN TÍCH CODE (Dùng thư viện Acorn)
function checkCodeQuality(code) {
    try {
        acorn.parse(code, { ecmaVersion: 2020, locations: true });
        // Nếu thành công, không có lỗi cú pháp
        isBugFound = false;
        statusDiv.textContent = "✔ Code hợp lệ. Nhện đang ngủ...";
        statusDiv.className = "status-ok";
        spider.color = '#58a6ff'; // Nhện màu xanh hiền hòa
        
        // Khi không có lỗi, nhện bò về góc phải màn hình ẩn nấp
        targetX = canvas.width - 80;
        targetY = 80;
    } catch (err) {
        // Nếu phát hiện lỗi cú pháp
        isBugFound = true;
        errorMessage = err.message;
        
        // Lấy dòng số mấy bị lỗi
        const loc = err.loc;
        if (loc) {
            statusDiv.textContent = `❌ Lỗi: ${err.message}`;
            statusDiv.className = "status-error";
            spider.color = '#ff7b72'; // Nhện đổi sang màu đỏ rực khi có lỗi
            
            // Tính toán tọa độ hiển thị tương đối của dòng bị lỗi trên màn hình
            calculateErrorCoordinate(loc.line, loc.column);
        }
    }
}

// Tính toán vị trí pixel (X,Y) của ký tự lỗi dựa trên thuộc tính văn bản ô Textarea
function calculateErrorCoordinate(line, column) {
    const fontSize = 15;
    const lineHeight = 1.6;
    const padding = 25;
    
    // Ước tính tọa độ Y dựa trên số dòng
    targetY = padding + ((line - 0.5) * fontSize * lineHeight) - codeInput.scrollTop;
    // Ước tính tọa độ X dựa trên vị trí cột ký tự
    targetX = padding + (column * (fontSize * 0.6)) - codeInput.scrollLeft;

    // Giới hạn tọa độ trong phạm vi hiển thị hợp lý
    targetX = Math.max(50, Math.min(canvas.width - 50, targetX));
    targetY = Math.max(50, Math.min(canvas.height - 50, targetY));
}

// Lắng nghe sự kiện người dùng gõ code hoặc cuộn trang (scroll)
codeInput.addEventListener('input', (e) => checkCodeQuality(e.target.value));
codeInput.addEventListener('scroll', () => {
    if (isBugFound) {
        // Cập nhật lại tọa độ nhện nếu người dùng cuộn màn hình khi đang có lỗi
        checkCodeQuality(codeInput.value);
    }
});

// 2. LOGIC ĐỒ HỌA HOẠT ẢNH NHỆN BÒ (Inverse Kinematics & Procedural Animation)
function updateSpider() {
    // Nhện di chuyển mượt mà bám theo mục tiêu (Lerp toán học)
    spider.x += (targetX - spider.x) * spider.speed;
    spider.y += (targetY - spider.y) * spider.speed;

    // Tính toán góc hướng đầu của nhện dựa trên hướng di chuyển
    let angle = Math.atan2(targetY - spider.y, targetX - spider.x);
    if (Math.abs(targetX - spider.x) < 2 && Math.abs(targetY - spider.y) < 2) {
        angle = -Math.PI / 2; // Đứng yên thì hướng đầu lên trên
    }

    // Cập nhật từng chân của nhện
    const distToTarget = Math.hypot(targetX - spider.x, targetY - spider.y);
    const isMoving = distToTarget > 5;

    for (let i = 0; i < 8; i++) {
        const leg = spider.legs[i];
        leg.cycle += isMoving ? 0.25 : 0.02; // Tốc độ nhịp bước chân

        // Góc xòe tự nhiên của các chân nhện xung quanh thân
        const legAngleOffset = ((i % 4) - 1.5) * 0.4 + (i < 4 ? Math.PI : 0);
        const baseAngle = angle + legAngleOffset;

        // Tầm với xa của chân nhện
        const reach = spider.size * 2.5;
        
        // Tính toán vị trí lý tưởng mà chân muốn bám xuống mặt đất
        let idealX = spider.x + Math.cos(baseAngle) * reach;
        let idealY = spider.y + Math.sin(baseAngle) * reach;

        if (isMoving) {
            // Thêm hiệu ứng sinh động khi nhện di chuyển (nhấc chân lên xuống)
            idealX += Math.cos(leg.cycle) * 8;
            idealY += Math.sin(leg.cycle) * 8;
        }

        // Cập nhật vị trí thực tế của đầu ngón chân tiến về điểm bám lý tưởng
        leg.currentX += (idealX - leg.currentX) * 0.3;
        leg.currentY += (idealY - leg.currentY) * 0.3;
    }
}

function drawSpider() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ 8 chân nhện (Gồm Khớp Thân -> Khớp Đầu Gối -> Đầu Ngón Chân)
    ctx.strokeStyle = spider.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < 8; i++) {
        const leg = spider.legs[i];
        
        ctx.beginPath();
        // Xuất phát từ tâm thân nhện
        ctx.moveTo(spider.x, spider.y);
        
        // Tính toán vị trí "đầu gối" nhọn nhô lên cao đặc trưng của loài nhện
        const midX = (spider.x + leg.currentX) / 2 + Math.sin(leg.cycle + i) * 6;
        const midY = (spider.y + leg.currentY) / 2 - 12; // Khớp gối hướng lên trên
        
        ctx.lineTo(midX, midY);
        // Nối xuống điểm tiếp xúc chữ
        ctx.lineTo(leg.currentX, leg.currentY);
        ctx.stroke();

        // Vẽ một điểm nhỏ tại đầu ngón chân bám vào code
        ctx.fillStyle = spider.color;
        ctx.beginPath();
        ctx.arc(leg.currentX, leg.currentY, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Vẽ thân nhện
    ctx.fillStyle = spider.color;
    ctx.beginPath();
    ctx.arc(spider.x, spider.y, spider.size, 0, Math.PI * 2);
    ctx.fill();

    // Vẽ đầu nhện nhỏ phía trước
    let angle = Math.atan2(targetY - spider.y, targetX - spider.x);
    const headX = spider.x + Math.cos(angle) * (spider.size * 0.8);
    const headY = spider.y + Math.sin(angle) * (spider.size * 0.8);
    ctx.beginPath();
    ctx.arc(headX, headY, spider.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Nếu phát hiện lỗi và nhện đã bò đến nơi, vẽ bong bóng thông báo lỗi ngay tại nhện
    if (isBugFound && Math.hypot(targetX - spider.x, targetY - spider.y) < 15) {
        ctx.fillStyle = 'rgba(248, 81, 73, 0.15)';
        ctx.strokeStyle = '#ff7b72';
        ctx.lineWidth = 1;
        
        // Vẽ khung bo góc cảnh báo lỗi
        const rectX = spider.x + 20;
        const rectY = spider.y - 45;
        const rectW = Math.min(320, canvas.width - rectX - 20);
        const rectH = 35;
        
        if (rectW > 50) {
            ctx.beginPath();
            ctx.roundRect(rectX, rectY, rectW, rectH, 4);
            ctx.fill();
            ctx.stroke();

            // Viết chữ mô tả lỗi thu gọn
            ctx.fillStyle = '#ff7b72';
            ctx.font = '12px monospace';
            const shortMsg = errorMessage.replace(/\(\d+:\d+\)/, ''); // Xóa bớt ký tự thừa
            ctx.fillText(shortMsg.substring(0, 38) + (shortMsg.length > 38 ? '...' : ''), rectX + 10, rectY + 22);
        }
    }
}

// Vòng lặp Render (Game Loop) liên tục cập nhật hoạt ảnh 60fps
function loop() {
    updateSpider();
    drawSpider();
    requestAnimationFrame(loop);
}

// Chạy khởi động ứng dụng
checkCodeQuality(codeInput.value);
loop();
