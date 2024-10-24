function convertAndOutput() {
    const fileInput = document.getElementById('upload-input');
    const b64Textarea = document.getElementById('b64-textarea');

    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const base64String = e.target.result.split(',')[1];
        b64Textarea.value = base64String;

        // Get the MIME type
        const mimeType = file.type || 'application/octet-stream';
        document.getElementById('mime-type-output').textContent = mimeType;
    };

    reader.onerror = function(e) {
        console.error('Error reading file:', e);
    };

    reader.readAsDataURL(file);
}
