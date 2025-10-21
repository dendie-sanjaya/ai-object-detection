// Variabel global tunggal untuk model AI saja
let model = undefined;

document.addEventListener('DOMContentLoaded', () => {
    // Gunakan const untuk mendeklarasikan semua variabel DOM secara LOKAL
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const statusElement = document.getElementById('status');
    const startButton = document.getElementById('startButton');
    const cameraContainer = document.getElementById('cameraContainer');
    
    // Pengecekan Kritis
    if (!video || !canvas || !statusElement || !startButton || !cameraContainer) {
        console.error("Kesalahan Fatal: Elemen HTML tidak ditemukan. Periksa ID!");
        if (statusElement) statusElement.textContent = "ERROR FATAL: Elemen HTML hilang. Cek ID.";
        return; 
    }
    
    const ctx = canvas.getContext('2d');
    statusElement.textContent = 'Tekan tombol untuk memulai deteksi.';

    // Event listener memanggil fungsi utama
    startButton.addEventListener('click', async () => {
        if (!model) {
            await runDetection(video, canvas, statusElement, startButton, cameraContainer, ctx);
        }
    });
});


/**
 * Fungsi Utama: Menginisialisasi Kamera dan Memuat Model AI.
 */
async function runDetection(video, canvas, statusElement, startButton, cameraContainer, ctx) {
    
    // UI Update
    startButton.disabled = true;
    startButton.textContent = 'Memuat...';
    cameraContainer.classList.remove('hidden'); 
    statusElement.textContent = 'Meminta izin kamera...';
    
    try {
        // 1. AKSES KAMERA (Dioptimalkan untuk Kamera Depan Laptop)
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user', 
                width: { ideal: 640 }, 
                height: { ideal: 480 } 
            }, 
            audio: false 
        });
        video.srcObject = stream;

        // Tunggu video siap
        await new Promise((resolve) => {
            video.onloadeddata = resolve;
        });

        // Konfigurasi Canvas agar ukurannya sesuai dengan stream video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        statusElement.textContent = 'Model AI sedang dimuat...';

        // 2. MUAT MODEL
        model = await cocoSsd.load({base: 'lite_mobilenet_v2'}); 

        statusElement.textContent = 'Deteksi siap! Arahkan kamera Anda.';
        startButton.style.display = 'none'; 
        
        // 3. MULAI LOOP DETEKSI
        detectFrame(video, canvas, ctx);

    } catch (error) {
        console.error("Kesalahan saat menjalankan deteksi:", error);
        
        // Penanganan Error
        startButton.disabled = false;
        startButton.textContent = 'Coba Lagi (Kamera Gagal)';
        cameraContainer.classList.add('hidden'); 

        let errorMessage = 'ERROR: Gagal. ';
        if (error.name === "NotFoundError") {
            errorMessage += 'Kamera tidak ditemukan. Pastikan kamera laptop aktif.';
        } else if (error.name === "NotAllowedError" || error.name === "SecurityError") {
            errorMessage += 'Akses kamera DIBLOKIR. Cek izin OS dan browser.';
        } else {
             errorMessage += `Detail: ${error.message}`; 
        }
        statusElement.textContent = errorMessage;
    }
}

/**
 * Fungsi loop deteksi objek real-time.
 */
async function detectFrame(video, canvas, ctx) {
    if (model && video && ctx) {
        const predictions = await model.detect(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        predictions.forEach(prediction => {
            drawBox(prediction, ctx);
        });
    }
    // Panggil diri sendiri untuk frame berikutnya (Meneruskan referensi elemen)
    requestAnimationFrame(() => detectFrame(video, canvas, ctx)); 
}

/**
 * Fungsi untuk menggambar kotak deteksi (bounding box) dan label di canvas.
 */
function drawBox(prediction, ctx) {
    if (!ctx) return;
    
    let [x, y, width, height] = prediction.bbox;
    const label = prediction.class;
    const score = Math.round(prediction.score * 100);

    // Filter deteksi dengan skor rendah
    if (score < 65) return; 

    // *******************************************************************
    // PERBAIKAN TEKS TERBALIK: BALIK KOORDINAT X
    // Karena video dibalik, kita harus menggeser kotak ke posisi yang benar
    // Posisi X baru = lebar canvas - (posisi X lama + lebar kotak)
    x = ctx.canvas.width - x - width;
    // *******************************************************************

    // Gambar Kotak
    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Teks
    ctx.fillStyle = 'lime';
    ctx.font = 'bold 16px sans-serif';
    const text = `${label} (${score}%)`;
    
    // Gambar background kotak teks
    const textWidth = ctx.measureText(text).width;
    ctx.fillRect(x, y - 24, textWidth + 10, 24);
    
    // Teks label
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x + 5, y - 5);
}