// Khai báo các biến toàn cục cho hệ thống 3D và di chuyển
let scene, camera, renderer, score = 0;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let targets = []; // Mảng chứa các mục tiêu bia đỏ

const blocker = document.getElementById('blocker');
const scoreElement = document.getElementById('score');

// Tạo các đối tượng quản lý góc nhìn chuột (FPS Style)
let pitchObject = new THREE.Object3D();
let yawObject = new THREE.Object3D();

// 1. XỬ LÝ KHÓA CHUỘT (POINTER LOCK)
blocker.addEventListener('click', () => {
    document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
        blocker.style.display = 'none';
    } else {
        blocker.style.display = 'flex';
    }
});

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== document.body) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    yawObject.rotation.y -= movementX * 0.002;
    pitchObject.rotation.x -= movementY * 0.002;
    // Giới hạn góc nhìn lên/xuống không bị lật ngược đầu
    pitchObject.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitchObject.rotation.x));
});

// 2. LẮNG NGHE BÀN PHÍM DI CHUYỂN (WASD)
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
});

// 3. KHỞI TẠO THẾ GIỚI GAME 3D
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11141a); // Màu trời đêm tối phong cách CF
    scene.fog = new THREE.FogExp2(0x11141a, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    pitchObject.add(camera);
    yawObject.add(pitchObject);
    yawObject.position.y = 2; // Chiều cao mắt người chơi
    scene.add(yawObject);

    // Thêm ánh sáng cho bản đồ
    const ambientLight = new THREE.AmbientLight(0x666666);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // Tạo mặt đất
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x22252c, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Tạo các thùng hàng chướng ngại vật ngẫu nhiên
    for(let i = 0; i < 30; i++) {
        const boxGeo = new THREE.BoxGeometry(3, Math.random() * 4 + 2, 3);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x4a536b });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(Math.random() * 80 - 40, boxGeo.parameters.height/2, Math.random() * 80 - 40);
        scene.add(box);
    }

    // Tạo sẵn 10 bia bắn hình cầu màu đỏ
    for(let i = 0; i < 10; i++) spawnTarget();

    // Tự dựng mô hình khẩu súng cơ bản ghép từ các khối hình học
    const gunGroup = new THREE.Group();
    const nongSung = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), new THREE.MeshStandardMaterial({color: 0x111111}));
    nongSung.rotation.x = Math.PI / 2;
    nongSung.position.set(0.2, -0.25, -0.5);
    gunGroup.add(nongSung);
    
    const thanSung = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.4), new THREE.MeshStandardMaterial({color: 0x222222}));
    thanSung.position.set(0.2, -0.28, -0.3);
    gunGroup.add(thanSung);
    
    camera.add(gunGroup); // Gắn chặt súng vào camera góc nhìn

    // Lắng nghe click chuột trái để bắn súng
    document.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement !== document.body) return;
        if (e.button === 0) shot(gunGroup);
    });

    // Cấu hình bộ render đồ họa hiển thị lên trình duyệt
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);
    animate();
}

// 4. LOGIC TẠO MỤC TIÊU BIA BẮN
function spawnTarget() {
    const targetGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x330000 });
    const target = new THREE.Mesh(targetGeo, targetMat);
    target.position.set(Math.random() * 60 - 30, Math.random() * 4 + 1.5, Math.random() * 60 - 30);
    scene.add(target);
    targets.push(target);
}

// 5. LOGIC KHI BẮN SÚNG (TÍNH VA CHẠM TIA ĐẠN)
function shot(gunGroup) {
    // Hiệu ứng súng giật lùi về sau rồi hồi lại
    gunGroup.position.z += 0.05;
    setTimeout(() => gunGroup.position.z -= 0.05, 50);

    // Bắn ra một tia laser từ giữa màn hình (tâm ngắm) ra không gian
    const raycaster = new THREE.Raycaster();
    const centerMouse = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(centerMouse, camera);

    // Kiểm tra xem tia đạn có xuyên qua bia bắn nào không
    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
        const hitTarget = intersects[0].object; // Lấy đúng vật thể đầu tiên trúng đạn
        
        // Xóa bia bắn bị trúng khỏi map
        scene.remove(hitTarget);
        targets = targets.filter(t => t !== hitTarget);
        
        // Cộng 10 điểm
        score += 10;
        scoreElement.innerText = score;
        
        // Hồi sinh bia bắn mới ở vị trí ngẫu nhiên khác
        spawnTarget();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 6. VÒNG LẶP HÌNH ẢNH GAME (GAME LOOP)
function animate() {
    requestAnimationFrame(animate);

    if (document.pointerLockElement === document.body) {
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        // Cơ chế giảm tốc mượt mà (Ma sát)
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); 

        // Tính toán vận tốc di chuyển dựa trên phím bấm
        if (moveForward || moveBackward) velocity.z -= direction.z * 120.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 120.0 * delta;

        // Di chuyển người chơi theo hướng đang nhìn của chuột
        yawObject.translateX(-velocity.x * delta);
        yawObject.translateZ(velocity.z * delta);

        // Chặn không cho người chơi đi vượt quá ranh giới bản đồ (100x100)
        yawObject.position.x = Math.max(-48, Math.min(48, yawObject.position.x));
        yawObject.position.z = Math.max(-48, Math.min(48, yawObject.position.z));

        prevTime = time;
    }

    renderer.render(scene, camera);
}

// Tự động chạy game khi trang web tải xong toàn bộ
window.onload = init;
