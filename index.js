document.addEventListener('DOMContentLoaded', () => {
    const imageInput   = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewCard  = document.getElementById('previewCard');
    const uploadCard   = document.getElementById('uploadCard');
    const resultCard   = document.getElementById('resultCard');
    const predictBtn   = document.getElementById('predictBtn');
    const btnText      = document.getElementById('btnText');
    const changeBtn    = document.getElementById('changeBtn');
    const retryBtn     = document.getElementById('retryBtn');
    const dropZone     = document.getElementById('dropZone');
    const imageOverlay = document.getElementById('imageOverlay');

    // --- Drag & Drop ---
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) loadImage(file);
    });

    // --- File input ---
    imageInput.addEventListener('change', function () {
        if (this.files[0]) loadImage(this.files[0]);
    });

    function loadImage(file) {
        const reader = new FileReader();
        reader.onload = e => {
            imagePreview.src = e.target.result;
            uploadCard.style.display   = 'none';
            previewCard.style.display  = 'block';
            resultCard.style.display   = 'none';
        };
        reader.readAsDataURL(file);
    }

    // --- Change / Retry ---
    changeBtn.addEventListener('click', resetToUpload);
    retryBtn.addEventListener('click', resetToUpload);

    function resetToUpload() {
        imageInput.value = '';
        uploadCard.style.display  = 'block';
        previewCard.style.display = 'none';
        resultCard.style.display  = 'none';
    }

    // --- Predict ---
    predictBtn.addEventListener('click', async () => {
        const file = imageInput.files[0];
        if (!file) return;

        // Loading state
        predictBtn.disabled = true;
        btnText.textContent  = 'Analyse en cours…';
        imageOverlay.style.display = 'flex';
        imagePreview.style.filter  = 'blur(3px)';

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/predict', { method: 'POST', body: formData });
            const data = await response.json();

            if (data.error) {
                showError(data.error);
            } else {
                showResult(data);
            }
        } catch {
            showError('Impossible de contacter le serveur.');
        } finally {
            predictBtn.disabled = false;
            btnText.textContent  = 'Analyser l\'image';
            imageOverlay.style.display = 'none';
            imagePreview.style.filter  = 'none';
        }
    });

    function showResult(data) {
        const isCat = data.class === 'Cat';

        document.getElementById('resultIcon').textContent        = isCat ? '🐱' : '🐶';
        document.getElementById('resultLabel').textContent       = isCat ? 'Chat' : 'Chien';
        document.getElementById('resultLabel').className         = 'result-label ' + (isCat ? 'cat' : 'dog');
        document.getElementById('resultConfidence').textContent  = data.confidence
            ? `Confiance : ${(data.confidence * 100).toFixed(1)} %`
            : isCat ? 'C\'est un chat !' : 'C\'est un chien !';

        // Bar fill: Cat = left side (0–50%), Dog = right side (50–100%)
        const pct = data.confidence_cat !== undefined
            ? Math.round(data.confidence_cat * 100)
            : (isCat ? 75 : 25);
        document.getElementById('resultBar').style.width = pct + '%';

        previewCard.style.display = 'none';
        resultCard.style.display  = 'block';
    }

    function showError(msg) {
        document.getElementById('resultIcon').textContent       = '⚠️';
        document.getElementById('resultLabel').textContent      = 'Erreur';
        document.getElementById('resultLabel').className        = 'result-label';
        document.getElementById('resultConfidence').textContent = msg;
        document.getElementById('resultBar').style.width        = '0%';

        previewCard.style.display = 'none';
        resultCard.style.display  = 'block';
    }
});
