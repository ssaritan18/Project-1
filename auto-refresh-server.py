#!/usr/bin/env python3
"""
Auto-refresh static server for Expo builds
Monitors dist/ folder and serves fresh content when updated
"""

import os
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class BuildWatcher(FileSystemEventHandler):
    def __init__(self):
        self.last_build_time = time.time()
        
    def on_modified(self, event):
        if event.is_directory:
            return
            
        # Check if it's a build file
        if any(pattern in event.src_path for pattern in ['.html', '.js', '.css']):
            self.last_build_time = time.time()
            print(f"🔄 Build updated: {os.path.basename(event.src_path)}")

class RefreshHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="/app/frontend/dist", **kwargs)
    
    def end_headers(self):
        # Disable caching for immediate updates
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def start_server():
    os.chdir('/app/frontend/dist')
    server = HTTPServer(('0.0.0.0', 3000), RefreshHandler)
    print("🚀 Auto-refresh server started on port 3000")
    print("📁 Serving from: /app/frontend/dist")
    server.serve_forever()

def start_watcher():
    event_handler = BuildWatcher()
    observer = Observer()
    observer.schedule(event_handler, '/app/frontend/dist', recursive=True)
    observer.start()
    print("👁️ Watching for build changes...")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    # Start watcher in background
    watcher_thread = threading.Thread(target=start_watcher, daemon=True)
    watcher_thread.start()
    
    # Start server
    start_server()