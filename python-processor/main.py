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
def read_root():
    return {"status": "Python processor is running"}

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

            # 2. Convert presentation slides to PNG images
            image_output_dir = os.path.join(temp_dir, "images")
            os.makedirs(image_output_dir)
            
            conversion_result = convert_pptx_to_png_libreoffice(temp_pptx_path, image_output_dir)
            if conversion_result.get("error"):
                raise HTTPException(status_code=500, detail=conversion_result["error"])
            
            # Here you would typically upload PNGs to a cloud storage (like S3 or Vercel Blob)
            # and get back public URLs. For this MVP, we will return local paths as a placeholder.
            # In a real deployment, this part needs to be implemented.
            image_paths = conversion_result.get("image_paths", [])

            return JSONResponse(content={
                "filename": file.filename,
                "text_data": text_data,
                "image_paths": image_paths # Placeholder: these are temporary paths
            })

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            # The 'with' statement handles cleanup of the temporary directory
            pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 