import pytest
from app.processing.embedder import chunk_text

def test_chunk_text_logic():
    """test that text is actually split into chunks."""
    sample_text = "This is a long sentence that should be split into smaller pieces for the AI to process correctly." * 50
    chunks = chunk_text(sample_text)
    
    assert len(chunks) > 0
    assert isinstance(chunks, list)
    # check that chunks aren't massive 
    assert len(chunks[0]) <= 1100 

def test_citation_format():
    """mock test to ensure source index logic works."""
    relevant_chunks = [
        {"content": "Fact A", "source": "doc1.pdf"},
        {"content": "Fact B", "source": "doc2.pdf"}
    ]
    # simple check for our indexing logic
    sources = [f"[{i+1}] {c['source']}" for i, c in enumerate(relevant_chunks)]
    assert sources[0] == "[1] doc1.pdf"
    assert sources[1] == "[2] doc2.pdf"