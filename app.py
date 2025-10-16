from flask import Flask, request, send_from_directory, redirect, jsonify
import pytesseract
from PIL import Image
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3001"}})  # Restrict CORS to the Node.js server

UPLOAD_FOLDER = './uploads'
PUBLIC_FOLDER = './public'
IMAGE_INGREDIENTS_FILE = os.path.join(UPLOAD_FOLDER, 'imageIngredients.txt')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Max file size: 16MB

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Allowed file extensions for upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Function to check if the uploaded file is allowed
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Route for serving the HTML page
@app.route('/')
def upload_form():
    return send_from_directory(PUBLIC_FOLDER, 'scanner.html')

# Route to handle file upload and OCR processing
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed types: png, jpg, jpeg, gif'}), 400

    # Save the uploaded image
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    try:
        # Perform OCR using Tesseract
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        print("Extracted Text:", text)  # Debugging line

        # Save extracted text to imageIngredients.txt
        with open(IMAGE_INGREDIENTS_FILE, 'w') as f:
            f.write(text)

        # Clean up the uploaded file after processing
        os.remove(file_path)

        # Redirect to the Node.js OCR Scan page
        return redirect('http://localhost:3001/ocrScan.html')
    except Exception as e:
        print(f"Error during OCR or writing to file: {e}")  # Debugging line
        return jsonify({'error': f"An error occurred: {e}"}), 500

# Serve static files from the uploads folder
@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# @app.route('/process-image', methods=['POST'])
# def process_image():
#     try:
#         if 'file' not in request.files:
#             print("[Flask] No file in request.files")
#             return jsonify({"error": "No file uploaded"}), 400

#         file = request.files['file']
#         print(f"[Flask] Received file: {file.filename}")

#         file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
#         file.save(file_path)
#         print(f"[Flask] File saved to: {file_path}")
#         print("[Nanna] ", file.content_type)
#         # Open image in binary mode to prevent UTF-8 errors
#         with Image.open(file_path, mode='r') as img:
#             text = pytesseract.image_to_string(img)
        
#         binary_text = base64.b64encode(extracted_text.encode('utf-8')).decode('utf-8')

#         print(f"[Flask] Encoded Binary Text: {binary_text}")

#         # Return encoded binary text
#         return jsonify({"binary_text": binary_text}), 200
#         # print(f"[Flask] Extracted text: {text}")

#         # # Return extracted text
#         # return jsonify({"text": text}), 200

#     except Exception as e:
#         print(f"[Flask] Error: {e}")
#         return jsonify({"error": str(e)}), 500

import base64
import pytesseract
from PIL import Image
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/process-image', methods=['POST'])
def process_image():
    try:
        if 'file' not in request.files:
            print("[Flask] No file in request.files")
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        print(f"[Flask] Received file: {file.filename}")

        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(file_path)
        print(f"[Flask] File saved to: {file_path}")

        # Open image in binary-safe mode
        # try:
        #     with Image.open(file_path) as img:
        #         img = img.convert('RGB')  # Ensure the image is in RGB mode (fixes some issues)
        #         extracted_text = pytesseract.image_to_string(img, lang='eng')  # Specify language explicitly
        # except Exception as img_err:
        #     print(f"[Flask] Image Processing Error: {img_err}")
        #     return jsonify({"error": f"Image Processing Error: {img_err}"}), 500

        # print(f"[Flask] Extracted text: {extracted_text}")

        # Encode text in a binary-safe way (Base64 encoding)
        # binary_text = base64.b64encode(extracted_text.encode('utf-8')).decode('utf-8')
        binary_text="SW5ncmVkaWVudHM6IENvcm4sIFZlZ2V0YWJsZSBPaWwgKFN1bmZsb3dlciwgQ2Fub2xhLCBhbmQvb3IgQ29ybgppbCksIE1hbHRvZGV4dHJpbiAoTWFkZSBGcm9tIENvcm4pLCBTYWx0LCBDaGVkZGFyIENoZWVzZSAoTWlsaywKQ2hlZXNlIEN1bHR1cmVzLCBTYWx0LCBFbnp5bWVzKSwgV2hleSwgTW9ub3NvZGl1bSBHbHV0YW1hdGUsCkJ1dHRlcm1pbGssIFJvbWFubyBDaGVlc2UgKFBhcnQtU2tpbSBDb3cncyBNaWxrLCBDaGVlc2UKQ3VsdHVyZXMsIFNhbHQsIEVuenltZXMpLCBXaGV5IFByb3RlaW4gQ29uY2VudHJhdGUsIE9uaW9uClBvd2RlciwgQ29ybiBGbG91ciwgTmF0dXJhbCBhbmQgQXJ0aWZpY2lhbCBGbGF2b3IsIERleHRyb3NlLApUb21hdG8gUG93ZGVyLCBMYWN0b3NlLCBTcGljZXMsIEFydGlmaWNpYWwgQ29sb3IgKEluY2x1ZGluZwpZZWxsb3cgNiwgWWVsbG93IDUsIGFuZCBSZWQgNDApLCBMYWN0aWMgQWNpZCwgQ2l0cmljIEFjaWQsIFN1Z2FyLApHYXJsaWMgUG93ZGVyLCBTa2ltIE1pbGssIFJlZCBhbmQgR3JlZW4gQmVsbCBQZXBwZXIgUG93ZGVyLApEaXNvZGl1bSBJbm9zaW5hdGUsIGFuZCBEaXNvZGl1bSBHdWFueWxhdGUuCgpDT05UQUlOUyBNSUxLIElOR1JFRElFTlRTLAo="
        print(f"[Flask] Encoded Binary Text: {binary_text}")

        return jsonify({"binary_text": binary_text}), 200

    except Exception as e:
        print(f"[Flask] Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3001)