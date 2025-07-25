from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pytesseract
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Menu OCR Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Menu OCR Service is running"}

@app.post("/ocr")
async def ocr_image(file: UploadFile = File(...)):
    try:
        logger.info(f"Processing image: {file.filename}, size: {file.size if hasattr(file, 'size') else 'unknown'}")
        
        # Read image bytes
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        logger.info(f"Image loaded: {image.format}, size: {image.size}, mode: {image.mode}")
        
        # Convert to RGB if necessary (for better OCR results)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # OCR with Tesseract
        logger.info("Starting OCR extraction...")
        text = pytesseract.image_to_string(image, config='--psm 6')  # Assume uniform block of text
        
        if not text or not text.strip():
            logger.warning("No text extracted from image")
            return JSONResponse(
                status_code=400, 
                content={"success": False, "error": "No text found in image"}
            )
        
        logger.info(f"OCR completed. Text length: {len(text)}")
        logger.info(f"OCR preview: {text[:200]}...")
        
        return {
            "success": True, 
            "text": text
        }
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500, 
            content={"success": False, "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
