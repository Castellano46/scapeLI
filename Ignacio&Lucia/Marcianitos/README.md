# Marcianitos de San Valentín ❤️ (Cupid Attack)

Un divertido y romántico clon del clásico **Space Invaders (Marcianitos)**, desarrollado en Python utilizando **Pygame**. 

Ayuda a Cupido a lanzar flechas de amor en forma de corazones para derrotar a los descendientes "Mari" antes de que lleguen a la parte inferior de la pantalla. El juego cuenta con efectos visuales modernos, música y efectos sonoros retro auto-generados, y un diseño dinámico adaptado para celebrar San Valentín.

---

## 🚀 Requisitos e Instalación

El único requisito externo es tener instalado Python (versión 3.7 o superior recomendada) y la biblioteca **Pygame**.

1. Instala Pygame usando pip:
   ```bash
   pip install pygame
   ```

2. Ejecuta el juego en la raíz del proyecto:
   ```bash
   python main.py
   ```

---

## 🎮 Controles del Juego

* **Moverse a la Izquierda:** `Flecha Izquierda` o tecla `A` (Cupido se inclinará suavemente hacia la izquierda al moverse).
* **Moverse a la Derecha:** `Flecha Derecha` o tecla `D` (Cupido se inclinará suavemente hacia la derecha al moverse).
* **Disparar Corazones:** Tecla `Espacio`.
* **Volver/Salir de pantallas:** Tecla `Esc`.
* **Tecla Truco / Depuración:** Presiona `K` durante la partida para lanzar una descarga instantánea de amor que elimina a todos los enemigos en pantalla (¡ideal para pruebas!).

---

## 💖 Características Destacadas

### 🎯 Dificultad Progresiva
La velocidad del juego aumenta automáticamente con tu puntuación para mantener el desafío:
* **0-100 puntos:** Velocidad normal (Frecuencia de enemigos cada 1.5s).
* **100-250 puntos:** Velocidad de enemigos +20%, recarga de proyectil un 10% más rápida (Enemigos cada 1.2s).
* **250-500 puntos:** Velocidad de enemigos +40%, recarga de proyectil un 20% más rápida (Enemigos cada 1.0s).
* **Más de 500 puntos:** Velocidad de enemigos +60%, recarga de proyectil un 30% más rápida (Enemigos cada 0.8s).

### 🏆 Sistema de Puntuación y Vidas
* Tienes **3 vidas** representadas por iconos de corazones animados que palpitan.
* Si un enemigo supera la línea inferior de la pantalla o choca contigo, pierdes una vida.
* Las puntuaciones se guardan localmente de forma automática en `data/scores.json`, manteniendo un récord de los 5 mejores marcadores históricos.

### ✨ Efectos Visuales y Micro-animaciones
* **Partículas Ambientales:** Corazones translúcidos que flotan en el fondo con velocidades y trayectorias oscilantes.
* **Efectos de Impacto:** Animaciones de explosión de micro-corazones de colores al eliminar un enemigo.
* **Interactividad:** Botones elegantes con bordes brillantes y escalado dinámico al pasar el cursor (efecto hover).

### 🎵 Audio e Imágenes Adaptativos
Si ejecutas el juego sin los archivos de recursos, el sistema **genera de forma autónoma efectos de sonido sintetizados y música chiptune en formato WAV**, y dibuja vectores suaves para los personajes de forma que el juego **nunca falle y siempre sea jugable**.

---

## 📂 Organización del Código

El juego sigue un diseño limpio y orientado a objetos:

* `main.py`: Punto de entrada del juego. Contiene el bucle principal y las siguientes clases y módulos:
  * `Player`: Representa a Cupido con físicas de rotación/inclinación.
  * `Enemy`: Representa a los "Mari" con patrones de balanceo sinusoidal.
  * `Bullet`: Proyectiles de corazones del jugador.
  * `Particle`: Controla partículas de ambiente y de explosión.
  * `ScoreManager`: Carga y guarda records en `data/scores.json`.
  * `AssetManager`: Maneja la carga de texturas y el renderizado alternativo por vectores.
  * `SoundManager`: Administra efectos y música.
  * `Menu` y `Game`: Centralizan la lógica de pantallas y transiciones de estados del juego.
* `assets/`: Carpeta con gráficos y sonidos.
* `data/`: Registro persistente de récords locales.
