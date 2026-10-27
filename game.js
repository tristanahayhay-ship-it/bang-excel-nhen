const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// CẤU HÌNH NHÂN VẬT CONTRA (MÀU XANH)
const player = {
    x: 100,
    y: 300,
    width: 30,
    height: 50,
    speed: 5,
    velX: 0,
    velY: 0,
    jumping: false,
    grounded: true,
    health: 3,
    score: 0
};

// CÁC MẢNG CHỨA ĐẠN VÀ KẺ ĐỊCH
let bullets = [];
let enemies = [];
const keys = {};

const gravity = 0.6;
const friction = 0.8;

// LẮNG NGHE BÀN PHÍM
document.addEventListener("keydown", (e) => { keys[e.code] = true; });
document.addEventListener("keyup", (e) => { keys[e.code] = false; });

// LOGIC BẮN ĐẠN (NHẤN PHÍM J ĐỂ BẮN)
let lastShot = 0;
function shoot() {
    const now = performance.now();
    if (now - lastShot > 150) { // Tốc độ bắn đạn (150ms 1 viên)
        bullets.push({
            x: player.x + player.width,
            y: player.y + player.height / 3,
            radius: 4,
            speed: 10
        });
        lastShot = now;
    }
}

// LOGIC TẠO QUÂN ĐỊCH TỰ ĐỘNG (LAO TỪ PHẢI SANG TRÁI)
function spawnEnemy() {
    if (Math.random() < 0.02 && enemies.length < 5) {
        enemies.push({
            x: canvas.width,
            y: 320, // Đi trên mặt đất
            width: 25,
            height: 30,
            speed: Math.random() * 2 + 2
        });
    }
}

// HÀM CẬP NHẬT TRẠNG THÁI GAME LOOP
function update() {
    // Di chuyển Trái / Phải (A / D hoặc Mũi tên)
    if (keys["KeyA"] || keys["ArrowLeft"]) {
        if (player.velX > -player.speed) player.velX--;
    }
    if (keys["KeyD"] || keys["ArrowRight"]) {
        if (player.velX < player.speed) player.velX++;
    }
    
    // Nhảy (Phím W, Space hoặc Mũi tên lên)
    if ((keys["KeyW"] || keys["Space"] || keys["ArrowUp"]) && !player.jumping && player.grounded) {
        player.jumping = true;
        player.grounded = false;
        player.velY = -player.speed * 2.5; // Lực nhảy
    }

    // Bắn đạn (Đè phím J)
    if (keys["KeyJ"]) {
        shoot();
    }

    // Áp dụng vật lý: trọng lực và ma sát sàn
    player.velX *= friction;
    player.velY += gravity;

    player.x += player.velX;
    player.y += player.velY;

    // Giữ nhân vật không rơi khỏi sàn nhà (mặt đất ở y = 350)
    if (player.y >= 350 - player.height) {
        player.y = 350 - player.height;
        player.jumping = false;
        player.grounded = true;
        player.velY = 0;
    }

    // Giới hạn biên màn hình trái phải
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // Cập nhật vị trí đạn bay
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.speed;
        if (bullet.x > canvas.width) bullets.splice(index, 1);
    });

    // Cập nhật quân địch di chuyển
    spawnEnemy();
    enemies.forEach((enemy, eIndex) => {
        enemy.x -= enemy.speed;

        // Kiểm tra đạn bắn trúng quân địch
        bullets.forEach((bullet, bIndex) => {
            if (bullet.x > enemy.x && bullet.x < enemy.x + enemy.width &&
                bullet.y > enemy.y && bullet.y < enemy.y + enemy.height) {
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);
                player.score += 100; // Cộng điểm
            }
        });

        // Kiểm tra va chạm giữa quân địch và Contra
        if (enemy.x < player.x + player.width && enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height && enemy.y + enemy.height > player.y) {
            enemies.splice(eIndex, 1);
            player.health--; // Trừ mạng
        }

        // Xóa lính địch khi đi hết màn hình bên trái
        if (enemy.x < -enemy.width) enemies.splice(eIndex, 1);
    });
}

// HÀM VẼ ĐỒ HỌA LÊN CANVAS
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ Mặt đất (Dòng kẻ màu đỏ phong cách Contra)
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 350);
    ctx.lineTo(canvas.width, 350);
    ctx.stroke();

    // Vẽ Người chơi Contra (Khối màu xanh dương, băng đô đỏ)
    if (player.health > 0) {
        ctx.fillStyle = "#3366ff";
        ctx.fillRect(player.x, player.y, player.width, player.height);
        // Băng đô đỏ
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(player.x + 5, player.y + 5, player.width - 5, 6);
    } else {
        // Game Over hiển thị giữa màn hình
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 40px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
        return;
    }

    // Vẽ các viên Đạn (Hình cầu màu cam neon cực sáng)
    ctx.fillStyle = "#ff9900";
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Vẽ Lính địch (Khối màu đỏ đậm nguy hiểm)
    ctx.fillStyle = "#cc0000";
    enemies.forEach(enemy => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });

    // Vẽ Thông số Điểm và Mạng lên góc trái màn hình
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial";
    ctx.fillText("SCORE: " + player.score, 20, 30);
    ctx.fillText("LIVES: " + player.health, 20, 60);
}

// VÒNG LẶP CHÍNH CỦA GAME (GAME LOOP)
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Kích hoạt chạy game ngay lập tức khi tải trang
gameLoop();
