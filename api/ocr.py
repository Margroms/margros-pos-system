from http.server import BaseHTTPRequestHandler
import json
import io
import logging
import base64
from PIL import Image
import pytesseract

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Handle CORS
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # Get content length
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_error(400, "No content provided")
                return
            
            # Read the request body
            content_type = self.headers.get('Content-Type', '')
            post_data = self.rfile.read(content_length)
            
            image_data = None
            
            # Handle different content types
            if content_type.startswith('multipart/form-data'):
                # Parse multipart data (simplified)
                boundary = content_type.split('boundary=')[1].encode()
                parts = post_data.split(b'--' + boundary)
                
                for part in parts:
                    if b'Content-Disposition: form-data; name="file"' in part:
                        # Extract image data
                        lines = part.split(b'\r\n\r\n', 1)
                        if len(lines) > 1:
                            image_data = lines[1].rstrip(b'\r\n')
                            break
            
            elif content_type == 'application/json':
                # Handle JSON with base64 encoded image
                try:
                    json_data = json.loads(post_data.decode('utf-8'))
                    if 'image' in json_data:
                        image_data = base64.b64decode(json_data['image'])
                except Exception as e:
                    self._send_error(400, f"Invalid JSON: {str(e)}")
                    return
            
            if not image_data:
                self._send_error(400, "No image file found in request")
                return
            
            logger.info(f"Processing image, size: {len(image_data)} bytes")
            
            # Process image with PIL
            try:
                image = Image.open(io.BytesIO(image_data))
                logger.info(f"Image loaded: {image.format}, size: {image.size}, mode: {image.mode}")
                
                # Convert to RGB if necessary
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # OCR with Tesseract
                logger.info("Starting OCR extraction...")
                text = pytesseract.image_to_string(image, config='--psm 6')
                
                if not text or not text.strip():
                    logger.warning("No text extracted from image")
                    self._send_error(400, "No text found in image")
                    return
                
                logger.info(f"OCR completed. Text length: {len(text)}")
                logger.info(f"OCR preview: {text[:200]}...")
                
                # Send successful response
                response = {
                    "success": True,
                    "text": text
                }
                
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
            except Exception as img_error:
                logger.error(f"Error processing image: {str(img_error)}")
                self._send_error(500, f"Image processing error: {str(img_error)}")
                
        except Exception as e:
            logger.error(f"Error in OCR handler: {str(e)}", exc_info=True)
            self._send_error(500, f"Internal server error: {str(e)}")
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        # Health check endpoint
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {"message": "Menu OCR Service is running on Vercel"}
        self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def _send_error(self, status_code, message):
        """Helper method to send error responses"""
        try:
            self.send_response(status_code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            error_response = {
                "success": False,
                "error": message
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
        except Exception as e:
            logger.error(f"Error sending error response: {e}")
