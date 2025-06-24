from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import tempfile
import os
import shutil

# Import the logic from your scripts
from parse_pptx import parse_pptx
from convert_pptx_to_png import convert_pptx_to_png_libreoffice

app = FastAPI()

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.post("/process/")
async def process_presentation(file: UploadFile = File(...)):
    # Create a temporary directory to work in
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save the uploaded file temporarily
            temp_pptx_path = os.path.join(temp_dir, file.filename)
            with open(temp_pptx_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # 1. Extract text from the presentation
            text_data = parse_pptx(temp_pptx_path)

            # 2. Convert presentation slides to PNG images (DISABLED FOR NOW)
            # image_output_dir = os.path.join(temp_dir, "images")
            # os.makedirs(image_output_dir)
            # conversion_result = convert_pptx_to_png_libreoffice(temp_pptx_path, image_output_dir)
            # if conversion_result.get("error"):
            #     raise HTTPException(status_code=500, detail=conversion_result["error"])
            # image_paths = conversion_result.get("image_paths", [])
            image_paths = [] # Return an empty array for now

            return JSONResponse(content={
                "filename": file.filename,
                "text_data": text_data,
                "image_paths": image_paths
            })

        except Exception as e:
            # This is a broad catch-all to ensure we see the error
            # In a real production app, you might want more specific error handling
            return JSONResponse(
                status_code=500,
                content={"error": "An unexpected error occurred in the Python service.", "details": str(e)}
            )
        finally:
            # The 'with' statement handles cleanup of the temporary directory
            pass

@app.post("/vision/")
async def vision_presentation(file: UploadFile = File(...)):
    # Create a temporary directory to work in
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save the uploaded file temporarily
            temp_pptx_path = os.path.join(temp_dir, file.filename)
            with open(temp_pptx_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Convert presentation slides to PNG images
            image_output_dir = os.path.join(temp_dir, "images")
            os.makedirs(image_output_dir)
            conversion_result = convert_pptx_to_png_libreoffice(temp_pptx_path, image_output_dir)
            if conversion_result.get("error"):
                raise HTTPException(status_code=500, detail=conversion_result["error"])
            image_paths = conversion_result.get("image_paths", [])

            # Optionally, you could return base64-encoded images or serve them via a static file server
            return JSONResponse(content={
                "filename": file.filename,
                "image_paths": image_paths
            })

        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"error": "An unexpected error occurred in the Vision service.", "details": str(e)}
            )
        finally:
            pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000) 