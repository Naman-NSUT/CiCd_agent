def read_file(path: str) -> str:
    """Reads a file and returns its content as a string."""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_patch(file_path: str, original_snippet: str | None, patched_snippet: str) -> bool:
    """
    Applies a patch to a file.
    Uses str.replace if original_snippet is provided.
    Raises ValueError if original_snippet not found.
    """
    try:
        content = read_file(file_path)
    except FileNotFoundError:
        # If the file doesn't exist and original_snippet is None, we attempt to create it.
        if original_snippet is not None:
            raise ValueError(f"File not found: {file_path}")
        content = ""
        
    if original_snippet:
        if original_snippet not in content:
            raise ValueError(f"Original snippet not found in {file_path}")
        content = content.replace(original_snippet, patched_snippet, 1)
    else:
        # Original snippet is null -> create/overwrite
        content = patched_snippet
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    return True
