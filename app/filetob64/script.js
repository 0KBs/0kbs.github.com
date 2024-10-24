function convertAndOutput() {
    const fileInput = document.getElementById('upload-input');
    const base64Output = document.getElementById('base64-output');
    const mimeTypeOutput = document.getElementById('mime-type-output');

    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const base64String = e.target.result.split(',')[1];
        base64Output.textContent = base64String;

        // Get the MIME type
        const mimeType = file.type || 'application/octet-stream';
        mimeTypeOutput.textContent = mimeType;
    };

    reader.onerror = function(e) {
        console.error('Error reading file:', e);
    };

    reader.readAsDataURL(file);
}
