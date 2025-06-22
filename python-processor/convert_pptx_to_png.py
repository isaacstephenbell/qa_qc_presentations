import sys
import os
import subprocess
import json
import shutil

def convert_pptx_to_png_libreoffice(pptx_path, output_dir):
    """
    Converts a .pptx file to a series of .png images using the LibreOffice CLI.
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

        command = [
            cmd_base,
            "--headless",
            "--convert-to",
            "png",
            pptx_path,
            "--outdir",
            output_dir,
        ]
        
        process = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120  # 2-minute timeout
        )

        if process.returncode != 0:
            error_message = f"LibreOffice conversion failed with exit code {process.returncode}."
            return {"error": error_message, "stderr": process.stderr, "stdout": process.stdout}

        # On successful conversion of a multi-slide presentation, LibreOffice may create
        # a single PNG file. If multiple slides need to be handled, exporting to PDF first
        # and then converting PDF pages to PNGs is a more reliable pattern, but for now
        # we adhere to the simpler direct PNG conversion.
        
        # The output PNG will have the same basename as the input pptx.
        base_name = os.path.splitext(os.path.basename(pptx_path))[0]
        expected_png = os.path.join(output_dir, f"{base_name}.png")

        if not os.path.exists(expected_png):
            # Fallback to find any generated png, as behavior might differ
            png_files = sorted([os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.lower().endswith(".png")])
            if not png_files:
                 return {
                    "error": "LibreOffice ran but no PNG file was created.",
                    "stdout": process.stdout,
                    "stderr": process.stderr
                }
            return {"image_paths": png_files}

        return {"image_paths": [expected_png]}

    except subprocess.TimeoutExpired:
        return {"error": "LibreOffice conversion timed out after 120 seconds."}
    except Exception as e:
        return {"error": f"An unexpected error occurred during conversion: {str(e)}"}

# The __main__ block is no longer needed for the service.
# if __name__ == "__main__":
#    ... 