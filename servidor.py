import http.server
import socketserver
import subprocess
import os
import sys

PORT = 8082

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for all requests so it works even if loaded via file:///
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/launch-game':
            try:
                # Determinar rutas
                base_dir = os.path.dirname(os.path.abspath(__file__))
                exe_path = os.path.join(base_dir, "Ignacio&Lucia", "Marcianitos", "Maya Invaders ❤️.exe")
                py_path = os.path.join(base_dir, "Ignacio&Lucia", "Marcianitos", "main.py")
                
                # Priorizar el script .py para desarrollo, o usar Jugar.bat para autodetección de dependencias
                bat_path = os.path.join(base_dir, "Ignacio&Lucia", "Marcianitos", "Jugar.bat")
                if os.path.exists(py_path):
                    subprocess.Popen(["python", "main.py"], cwd=os.path.dirname(py_path))
                    status_msg = "Launched Python main.py"
                elif os.path.exists(bat_path):
                    subprocess.Popen(["cmd.exe", "/c", "Jugar.bat"], cwd=os.path.dirname(bat_path), shell=True)
                    status_msg = "Launched Jugar.bat"
                elif os.path.exists(exe_path):
                    subprocess.Popen([exe_path], cwd=os.path.dirname(exe_path))
                    status_msg = "Launched EXE"
                else:
                    status_msg = "Game files not found"
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(status_msg.encode())
                    return

                self.send_response(200)
                self.end_headers()
                self.wfile.write(status_msg.encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        elif self.path == '/reset-scores':
            try:
                base_dir = os.path.dirname(os.path.abspath(__file__))
                score_path = os.path.join(base_dir, "Ignacio&Lucia", "Marcianitos", "data", "scores.json")
                if os.path.exists(score_path):
                    os.remove(score_path)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"Scores reset successfully")
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == '/check-score':
            try:
                base_dir = os.path.dirname(os.path.abspath(__file__))
                score_path = os.path.join(base_dir, "Ignacio&Lucia", "Marcianitos", "data", "scores.json")
                
                if os.path.exists(score_path):
                    with open(score_path, 'r', encoding='utf-8') as f:
                        data = f.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data.encode('utf-8'))
                else:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{"high_scores": []}')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            super().do_GET()

# Iniciar servidor
if __name__ == '__main__':
    # Cambiar al directorio del script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
            print(f"Servidor del Escape Room iniciado en http://localhost:{PORT}")
            print("Puedes abrir el juego en tu navegador o hacer doble click en index.html")
            print("Presiona Ctrl+C para salir.")
            httpd.serve_forever()
    except Exception as e:
        print(f"Error al iniciar el servidor: {e}")
        input("Presiona Enter para cerrar...")
