import os
import chromadb
from chromadb.utils import embedding_functions
from PyPDF2 import PdfReader

# --- Configuration ---
# 1. Make sure you have an OpenAI API key set as an environment variable:
#    export OPENAI_API_KEY="sk-..."
# 2. Place your PDF file in a 'data' subfolder.
PDF_FILE_PATH = "data/GPlus_Elevator_Product_Catalog.pdf"
COLLECTION_NAME = "gplus_product_catalog"

def ingest_pdf():
    """
    Reads a PDF, splits it into chunks, generates embeddings, and stores them in ChromaDB.
    """
# Check if the PDF file exists
    try:
        if not os.path.exists(PDF_FILE_PATH):
            raise FileNotFoundError(f"PDF file not found at '{PDF_FILE_PATH}'.\nPlease create a 'data' folder in this directory and place your PDF inside it.")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return
    # --- 1. Load and Chunk the PDF ---
    print(f"📚 Reading PDF: {PDF_FILE_PATH}")
    reader = PdfReader(PDF_FILE_PATH)
    text_chunks = []
    for i, page in enumerate(reader.pages):
        # Simple chunking: one chunk per page.
        # For more advanced chunking, consider libraries like LangChain.
        text = page.extract_text()
        if text:
            text_chunks.append(text)
    
    if not text_chunks:
        print("❌ Error: No text could be extracted from the PDF.")
        return

    print(f"📄 Found {len(text_chunks)} pages to process.")

    # --- 2. Setup ChromaDB and Embedding Function ---
    # Using OpenAI's embedding model. Requires OPENAI_API_KEY.
    openai_ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=os.getenv("OPENAI_API_KEY"),
        model_name="text-embedding-ada-002"
    )

    # Initialize ChromaDB client. This will store data in a '.chroma' directory.
    client = chromadb.PersistentClient(path="./chroma_db")
    
    # Get or create the collection
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=openai_ef
    )

    # --- 3. Add Documents to ChromaDB ---
    print("🧠 Generating embeddings and storing in ChromaDB... (This may take a moment)")
    collection.add(
        documents=text_chunks,
        ids=[f"page_{i+1}" for i in range(len(text_chunks))] # Unique ID for each chunk
    )

    print(f"✅ Success! Ingested {len(text_chunks)} chunks into the '{COLLECTION_NAME}' collection.")

if __name__ == "__main__":
    ingest_pdf()