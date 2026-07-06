# Guía de Ejecución - Escape Room: Boda de Ignacio & Lucía 💍

Esta guía contiene los pasos necesarios para iniciar y jugar al Escape Room de manera correcta en cualquier ordenador con Windows, asegurando que la interacción entre la interfaz web y el juego de marcianitos (`Maya Invaders ❤️.exe`) funcione al 100% sin problemas de bloqueos ni descargas del archivo.

---

## 🛠️ Requisitos Previos

El juego utiliza un servidor de control en segundo plano escrito en Python. Asegúrate de tener instalado:
1. **Python 3.x** (puedes descargarlo desde la Microsoft Store o la web oficial de Python).
2. **Pygame** (se instalará de forma automática la primera vez que se ejecute el juego).

---

## 🚀 Cómo Iniciar el Escape Room

Para jugar, sigue estos dos sencillos pasos:

Hay dos formas de iniciar el servidor de control para que el juego se pueda abrir y comunicarse con la web:

#### Opción A: Modo Automático y Silencioso (Recomendado 🌟)
He creado un script llamado `Arrancar_Servidor_Silencioso.vbs` que inicia el servidor en segundo plano ocultando por completo cualquier ventana de consola negra.

1. **Doble clic en [Arrancar_Servidor_Silencioso.vbs](file:///c:/Users/Pedro/Desktop/Proyectos\Scape\Arrancar_Servidor_Silencioso.vbs)**. El servidor se iniciará de forma invisible en tu sesión de usuario.
2. *(Opcional)* Si quieres que funcione **siempre de forma automática** sin tener que pulsar nada:
   - Presiona las teclas `Win + R` en tu teclado.
   - Escribe `shell:startup` y pulsa Enter. Se abrirá la carpeta de "Inicio" de Windows.
   - Copia o mueve el archivo `Arrancar_Servidor_Silencioso.vbs` a esa carpeta. 
   - **¡Listo!** El servidor se encenderá solo en segundo plano de forma invisible cada vez que enciendas el ordenador.

#### Opción B: Modo Manual (Consola)
1. Abre una ventana de la consola de comandos (**PowerShell** o **CMD**).
2. Navega a la carpeta de tu proyecto.
3. Ejecuta el servidor escribiendo:
   ```bash
   python servidor.py
   ```
4. Deja la ventana minimizada mientras juegues.

### Paso 2: Abrir el Escape Room en el Navegador
Una vez que el servidor esté encendido:
1. Abre tu navegador web (Chrome, Edge o Firefox).
2. Escribe en la barra de direcciones:
   **`http://localhost:8082/`**
3. ¡Comienza a jugar!

---

## 🎮 Flujo del Juego y Solución de las Salas

1. **Sala I (Canon in D):**
   - Escucha la melodía y deduce el nombre de la canción (`Canon in D`).
   - Introduce el valor numérico deducido de la letra D (A=1, B=2, C=3, **D=4**).
2. **Sala II (Marcianitos):**
   - Pulsa sobre **"Jugar a Maya Invaders"** para abrir el juego en tu pantalla.
   - Juega hasta alcanzar un mínimo de **100 puntos**. La puntuación se registrará automáticamente en vivo.
   - Vuelve a la web, donde el casillero se habrá desbloqueado solo. Introduce el dígito **8** (o escribe *"OCHO"*).
3. **Sala III (Descifrador César):**
   - Gira la rueda césar hasta un desplazamiento de `+3` y descifra el texto para obtener la pista del tercer dígito.
   - El dígito correcto a introducir es el **6**.
4. **Sala IV (Pilares del Matrimonio):**
   - Ordena los cuatro pilares según las runas en el orden correcto: **Fuego (Rojo) ➔ Agua (Azul) ➔ Tierra (Verde) ➔ Aire (Gris)**.
   - El dígito correcto a introducir es el **5**.
5. **Caja Fuerte (Código Final):**
   - Introduce el código **`4658`** (puedes usar el teclado físico o hacer clic en los botones) y pulsa **Ok**.
   - El cofre se abrirá y revelará el pergamino de victoria. Pulsar **"Finalizar Aventura"** para acceder al último reto.
6. **Último Reto:**
   - Escribe en mayúsculas las leyendas detrás de los números 46 y 58 de la caja fuerte: **`ROSSI`** y **`SIMONCELLI`** (en cualquier orden). ¡Y habrás terminado!

---

## 🔍 Solución de Problemas Comunes

### ❌ El juego no se abre al pulsar "Jugar"
- **Causa:** El servidor `servidor.py` no está encendido o lo cerraste por error.
- **Solución:** Vuelve al paso 1 y ejecuta `python servidor.py` en tu consola.

### 📥 Al pulsar "Jugar" se descarga el archivo `.exe` en lugar de abrirse
- **Causa:** Has abierto la web haciendo doble clic directo en el archivo `index.html` (lo que muestra `file:///` en la barra del navegador) sin tener el servidor encendido.
- **Solución:** Asegúrate de arrancar `servidor.py` en la consola e ingresar a la web mediante la dirección **`http://localhost:8082/`**.

### 🎵 Suena la música de fondo pero el juego no se ve en pantalla
- **Causa:** El servidor fue iniciado en segundo plano por una herramienta de desarrollo o servicio aislado (Sesión 0 de Windows).
- **Solución:** Cierra todas las ventanas del juego invisibles matando los procesos (puedes reiniciar el ordenador para asegurarte o usar el Administrador de Tareas para cerrar procesos llamados `python` o `Maya Invaders`). Después, abre una consola física normal tú mismo y ejecuta `python servidor.py`.
