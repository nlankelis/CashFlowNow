from fastapi import FastAPI, File, UploadFile, HTTPException
import requests

app = FastAPI(title="BulkFlow AI")

# ... (Keep your CORS middleware here)

@app.post("/process-invoice")
async def process_invoice(file: UploadFile = File(...)):
    # 1. Basic Validation
    if file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or Image.")

    # 2. Prepare the file for the OCR API
    # We read the file content into memory
    file_content = await file.read()

    # 3. Call your OCR Provider (Example: Mindee or Veryfi)
    # Note: You would store these in an .env file later for security!
    OCR_API_URL = "https://api.mindee.net/v1/products/mindee/invoices/v4/predict"
    headers = {"Authorization": "Token YOUR_API_KEY_HERE"}
    files = {"document": (file.filename, file_content, file.content_type)}

    try:
        response = requests.post(OCR_API_URL, headers=headers, files=files)
        response.raise_for_status() # Check for API errors
        ocr_data = response.json()
        
        # 4. Run your Proprietary Risk Logic here
        # Example: if ocr_data['total'] > 10000: flag_for_review()
        
        return {
            "filename": file.filename,
            "extracted_data": ocr_data,
            "status": "Success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR Processing failed: {str(e)}")