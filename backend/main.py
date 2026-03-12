import uvicorn

# ── Fix for passlib/bcrypt compatibility ───────────────────────────
try:
    import bcrypt
    from unittest.mock import MagicMock
    if not hasattr(bcrypt, "__about__"):
        bcrypt.__about__ = MagicMock()
        bcrypt.__about__.__version__ = bcrypt.__version__
except ImportError:
    pass
# ───────────────────────────────────────────────────────────────────

from app.api import app


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
