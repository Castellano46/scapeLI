# Guía de Ejecución - Escape Room: Boda de Ignacio & Lucía 💍

Esta guía contiene los pasos necesarios para iniciar y jugar al Escape Room de manera correcta en cualquier ordenador con Windows, **sin necesidad de instalar Python, Pygame ni ninguna otra librería**. Todo está precompilado y empaquetado para que funcione al 100% en modo portable.

---

## 🛠️ Requisitos Previos

¡Ninguno! No necesitas tener instalado Python, Pygame ni configurar variables de entorno. El juego es 100% portable y autónomo.

---

## 🚀 Cómo Iniciar el Escape Room

Para jugar, simplemente inicia el servidor local y abre la dirección web. Tienes dos formas muy sencillas de hacerlo:

### Opción A: Inicio Automático y Silencioso (Recomendado 🌟)
He creado un lanzador silencioso que arranca el juego en segundo plano sin mostrar ninguna ventana de consola negra:

1. **Doble clic en [Arrancar_Servidor_Silencioso.vbs](file:///c:/Users/Pedro/Desktop/Proyectos/Scape/Arrancar_Servidor_Silencioso.vbs)**.
2. El servidor se iniciará de forma invisible en segundo plano y **abrirá automáticamente tu navegador web** predeterminado en `http://localhost:8082/`.
3. ¡Comienza a jugar de inmediato!
4. *(Opcional)* Si quieres que el juego esté siempre disponible en ese ordenador sin pulsar nada:
   - Presiona las teclas `Win + R` en tu teclado.
   - Escribe `shell:startup` y pulsa Enter. Se abrirá la carpeta de "Inicio" de Windows.
   - Copia o mueve el archivo `Arrancar_Servidor_Silencioso.vbs` a esa carpeta.
   - El servidor se encenderá de forma invisible cada vez que enciendas el ordenador.

### Opción B: Inicio con Ventana de Control (Consola)
Si quieres ver el estado del servidor y cerrarlo manualmente cuando termines:

1. **Doble clic en [Iniciar_Escape_Room.exe](file:///c:/Users/Pedro/Desktop/Proyectos/Scape/Iniciar_Escape_Room.exe)** en la carpeta raíz.
2. Se abrirá una ventana de consola que te indicará que el servidor está encendido y **lanzará automáticamente tu navegador web** en `http://localhost:8082/`.
3. Deja la ventana de consola abierta mientras juegues. Al terminar de jugar, simplemente ciérrala pulsando la cruz `[X]` de la ventana para apagar el servidor.

---

## 🎮 Flujo del Juego y Solución de las Salas

1. **Sala I (Canon in D):**
   - Escucha la melodía y deduce el nombre de la canción (`Canon in D`).
   - Introduce el valor numérico deducido de la letra D (A=1, B=2, C=3, **D=4**).
2. **Sala II (Marcianitos):**
   - Pulsa sobre **"Jugar a Maya Invaders"** para abrir el juego en tu pantalla.
   - Juega hasta alcanzar un mínimo de **100 puntos**. La puntuación se registrará automáticamente en vivo.
   - Vuelve a la web, donde el casillero se habrá desbloqueado solo. Introduce el dígito **8** (o escribe *"OCHO"*).
3. **Sala III (Descifrador César y Rueda de Monedas):**
   - Gira la rueda césar hasta un desplazamiento de `+3` y descifra el texto para obtener la pista del tercer dígito.
   - Para resolver la pirámide de monedas, muévelas en 3 movimientos para invertir su orientación (el vértice debe apuntar hacia abajo). El dígito correcto a introducir es el **6**.
4. **Sala IV (El Astrolabio del Destino):**
   - Haz girar los 4 anillos concéntricos interconectados para alinear las letras en la vertical superior y deletrear **`A M O R`** (de dentro hacia fuera).
   - Solución rápida: Haz clic **3 veces en el Anillo 1** (centro), **2 veces en el Anillo 2** y **3 veces en el Anillo 3**.
   - El dígito correcto a introducir es el **5**.
5. **Caja Fuerte (Código Final):**
   - Introduce el código **`4658`** (puedes usar el teclado físico o hacer clic en los botones) y pulsa **Ok**.
   - El cofre se abrirá y revelará el pergamino de victoria. Pulsar **"Finalizar Aventura"** para acceder al último reto.
6. **Último Reto:**
   - Escribe en mayúsculas las leyendas detrás de los números 46 y 58 de la caja fuerte: **`ROSSI`** y **`SIMONCELLI`** (en cualquier orden). ¡Y habrás terminado!

---

## 🔍 Solución de Problemas Comunes

### ❌ El juego no se abre al pulsar "Jugar"
- **Causa:** El servidor de control no está encendido o se cerró accidentalmente.
- **Solución:** Ejecuta `Iniciar_Escape_Room.exe` o `Arrancar_Servidor_Silencioso.vbs`.

### 📥 Al pulsar "Jugar" se descarga el archivo `.exe` en lugar de abrirse
- **Causa:** Has abierto la web haciendo doble clic directo en el archivo `index.html` (mostrando `file:///` en la barra del navegador) en lugar de usar el servidor local.
- **Solución:** Ejecuta `Iniciar_Escape_Room.exe` o `Arrancar_Servidor_Silencioso.vbs` para abrir el navegador de forma correcta en la dirección local `http://localhost:8082/`.

### 🎵 Suena la música de fondo pero el juego no se ve en pantalla
- **Causa:** Quedó un proceso zombi de `Maya Invaders` ejecutándose en segundo plano de una partida anterior.
- **Solución:** Abre el Administrador de Tareas de Windows (Ctrl+Shift+Esc), localiza y finaliza cualquier proceso con el nombre `Maya Invaders` o `python`, y vuelve a iniciar el servidor.
