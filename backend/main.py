import uvicorn
from app.api import app
import asyncio
import os
import urllib.request
import threading
import time

def keep_alive_ping():
    """Background thread to ping the server and prevent Render from sleeping."""
    url = os.getenv("BACKEND_URL") or os.getenv("RENDER_EXTERNAL_URL") or "http://localhost:8000"
    ping_url = f"{url}/health" if not url.endswith("/") else f"{url}health"
    
    print(f"INFO: Keep-alive thread started, targeting {ping_url}")
    time.sleep(60) # Initial wait
    
    while True:
        try:
            req = urllib.request.Request(ping_url, headers={'User-Agent': 'KeepAliveAgent'})
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    print(f"INFO: Keep-alive successful to {ping_url}")
        except Exception as e:
            print(f"WARNING: Keep-alive failed: {e}")
            
        time.sleep(840) # 14 minutes

if __name__ == "__main__":
    # 1. Start the keep-alive thread before Uvicorn takes over the main thread
    threading.Thread(target=keep_alive_ping, daemon=True).start()
    
    # 3. Run the Uvicorn server
    uvicorn.run("app.api:app", host="0.0.0.0", port=8000, reload=False)
