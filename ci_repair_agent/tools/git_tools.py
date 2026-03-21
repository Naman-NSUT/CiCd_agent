import subprocess
from typing import Tuple, List

def run_git_command(cmd: str) -> Tuple[int, str, str]:
    """Runs a git shell command and returns code, stdout, stderr."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr

def apply_commands(commands: List[str]) -> List[Tuple[int, str, str]]:
    """Runs a list of shell commands sequentially. Stops and raises on non-zero return code."""
    results = []
    for cmd in commands:
        code, out, err = run_git_command(cmd)
        results.append((code, out, err))
        if code != 0:
            raise RuntimeError(f"Command failed: {cmd}\nStdout: {out}\nStderr: {err}")
    return results
