import sys
import os
import subprocess
import json
import shutil

def convert_pptx_to_png_libreoffice(pptx_path, output_dir):
    """
    Converts a .pptx file to a series of .png images using LibreOffice and pdftoppm.
    1. Convert PPTX to PDF with LibreOffice.
    2. Convert PDF pages to PNGs with pdftoppm (one PNG per slide).
    """
    try:
        # LibreOffice can be called via 'libreoffice' or 'soffice'
        cmd_base = None
        for cmd in ["libreoffice", "soffice"]:
            if shutil.which(cmd):
                cmd_base = cmd
                break
        if not cmd_base:
            return {
                "error": "LibreOffice not found. Please install it and ensure its executable is in your system's PATH."
            }
        # Step 1: Convert PPTX to PDF
        pdf_path = os.path.join(output_dir, "slides.pdf")
        command_pdf = [
            cmd_base,
            "--headless",
            "--convert-to",
            "pdf",
            pptx_path,
            "--outdir",
            output_dir,
        ]
        process_pdf = subprocess.run(
            command_pdf,
            capture_output=True,
            text=True,
            timeout=120
        )
        if process_pdf.returncode != 0:
            error_message = f"LibreOffice PDF conversion failed with exit code {process_pdf.returncode}."
            return {"error": error_message, "stderr": process_pdf.stderr, "stdout": process_pdf.stdout}
        # Find the generated PDF (LibreOffice may change the name)
        pdf_files = [f for f in os.listdir(output_dir) if f.lower().endswith(".pdf")]
        if not pdf_files:
            return {"error": "No PDF file was created during conversion."}
        pdf_path = os.path.join(output_dir, pdf_files[0])
        # Step 2: Convert PDF to PNGs (one per page)
        if not shutil.which("pdftoppm"):
            return {"error": "pdftoppm not found. Please install poppler-utils (pdftoppm) and ensure it's in your PATH."}
        png_prefix = os.path.join(output_dir, "slide")
        command_png = [
            "pdftoppm",
            "-png",
            pdf_path,
            png_prefix
        ]
        process_png = subprocess.run(
            command_png,
            capture_output=True,
            text=True,
            timeout=120
        )
        if process_png.returncode != 0:
            error_message = f"pdftoppm conversion failed with exit code {process_png.returncode}."
            return {"error": error_message, "stderr": process_png.stderr, "stdout": process_png.stdout}
        # Collect all PNGs in order
        png_files = sorted([os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.lower().endswith(".png")])
        if not png_files:
            return {"error": "No PNG files were created from PDF conversion."}
        return {"image_paths": png_files}
    except subprocess.TimeoutExpired:
        return {"error": "Conversion timed out after 120 seconds."}
    except Exception as e:
        return {"error": f"An unexpected error occurred during conversion: {str(e)}"}

# The __main__ block is no longer needed for the service.
# if __name__ == "__main__":
#    ... 