document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('upload-input');
    const b64Textarea = document.getElementById('b64-textarea');

    fileInput.addEventListener('change', convertAndOutput);

    function convertAndOutput() {
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file.');
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const base64String = e.target.result.split(',')[1];
                b64Textarea.value = base64String;

                // Get the MIME type
                const mimeType = file.type || 'application/octet-stream';
                document.getElementById('mime-type-output').textContent = mimeType;
            } catch (error) {
                console.error('Error processing file:', error);
                alert('An error occurred while processing the file.');
            }
        };

        reader.onerror = function(e) {
            console.error('Error reading file:', e);
            alert('An error occurred while reading the file.');
        };

        reader.readAsDataURL(file);
    }
});
