import fitz  # PyMuPDF
from docx import Document as DocxReader
import os

def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    try:
        if ext == ".pdf":
            with fitz.open(file_path) as doc:
                for page in doc:
                    text += page.get_text()
        
        elif ext == ".docx":
            doc = DocxReader(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        
        else:
            return f"Unsupported file type: {ext}"

        # cleaning up the text (remove excessive whitespace)
        return " ".join(text.split())

    except Exception as e:
        
        print(f"Error parsing {file_path}: {str(e)}")
        return ""