import http.server
import socketserver
import subprocess
import os
import sys
import threading
import ctypes

PORT = 8082

def run_game_thread(exe_path, py_path, bat_path, browser_hwnd):
    try:
        # Minimizar el navegador (browser_hwnd) para dejar ver el juego
        if browser_hwnd:
            ctypes.windll.user32.ShowWindow(browser_hwnd, 6) # SW_MINIMIZE = 6
        
        # Lanzar el proceso y esperar
        p = None
        if os.path.exists(exe_path):
            p = subprocess.Popen([exe_path], cwd=os.path.dirname(exe_path))
        elif os.path.exists(py_path):
            p = subprocess.Popen(["python", "main.py"], cwd=os.path.dirname(py_path))
        elif os.path.exists(bat_path):
            p = subprocess.Popen(["cmd.exe", "/c", "Jugar.bat"], cwd=os.path.dirname(bat_path), shell=True)
            
        if p:
            p.wait() # Esperar a que se cierre el juego
            
        # Restaurar y poner al frente el navegador (browser_hwnd) al cerrar el juego
        if browser_hwnd:
            ctypes.windll.user32.ShowWindow(browser_hwnd, 9) # SW_RESTORE = 9
            ctypes.windll.user32.SetForegroundWindow(browser_hwnd)
    except Exception as e:
        print(f"Error en hilo de juego: {e}")

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

    def launch_game(self):
        try:
            # Determinar rutas
            base_dir = os.path.dirname(os.path.abspath(__file__))
            exe_path = os.path.join(base_dir, "Ignacio&Lucia", "Marcianitos", "Maya Invaders ❤️.exe")
            py_path = os.path.join(base_dir, "Ignacio&Lucia", "Marcianitos", "main.py")
            bat_path = os.path.join(base_dir, "Ignacio&Lucia", "Marcianitos", "Jugar.bat")
            
            # Cerrar cualquier instancia anterior de la ventana del juego (incluso sin ventana gráfica) para evitar música duplicada
            try:
                subprocess.run(["powershell", "-Command", "Get-Process | Where-Object { $_.Name -like '*Maya*' } | Stop-Process -Force"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass

            # Obtener ventana actual activa (el navegador)
            browser_hwnd = ctypes.windll.user32.GetForegroundWindow()

            # Ejecutar sincrónicamente en este hilo de petición (el servidor ThreadingTCPServer
            # atenderá otras peticiones como /check-score en paralelo)
            run_game_thread(exe_path, py_path, bat_path, browser_hwnd)

            self.send_response(200)
            self.send_header('Content-Type', 'image/gif')
            self.end_headers()
            # Retornar un pixel transparente de 1x1 GIF
            self.wfile.write(b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

    def do_POST(self):
        if self.path == '/launch-game':
            self.launch_game()
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
        if self.path.startswith('/launch-game'):
            self.launch_game()
        elif self.path == '/check-score':
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
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    try:
        with socketserver.ThreadingTCPServer(("", PORT), CustomHandler) as httpd:
            print(f"Servidor del Escape Room iniciado en http://localhost:{PORT}")
            print("Puedes abrir el juego en tu navegador o hacer doble click en index.html")
            print("Presiona Ctrl+C para salir.")
            httpd.serve_forever()
    except Exception as e:
        print(f"Error al iniciar el servidor: {e}")
        input("Presiona Enter para cerrar...")
