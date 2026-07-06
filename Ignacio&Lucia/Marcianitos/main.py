import os
import sys
import json
import math
import random
import wave
import struct
import pygame

# Initialize Pygame Mixer before general initialization to ensure audio parameters
try:
    pygame.mixer.pre_init(44100, -16, 2, 512)
except Exception:
    pass

pygame.init()

def get_base_path():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

# Constants
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 768
FPS = 60

# Design Color Palette
COLOR_BG = (165, 205, 175)        # Medium-light sage green for high contrast with white bones
COLOR_PINK = (210, 40, 80)        # Deep rose-gold
COLOR_LIGHT_PINK = (255, 192, 203) # Soft pink
COLOR_RED = (230, 20, 60)         # Crimson red
COLOR_WHITE = (255, 255, 255)     # Clean contrast white
COLOR_GOLD = (255, 215, 0)        # Gold
COLOR_GRAY = (120, 120, 120)      # Gray
COLOR_ACCENT = (141, 19, 65)      # Deep magenta-red for container borders

# New dark text colors for beige background readability
COLOR_TEXT_DARK = (45, 15, 35)    # Deep plum/charcoal
COLOR_TEXT_MUTED = (110, 50, 80)  # Muted plum
COLOR_GOLD_DARK = (160, 95, 10)   # Visible dark gold/bronze

# -------------------------------------------------------------
# 1. PROCEDURAL AUDIO GENERATION (Fallback Sound FX Builder)
# -------------------------------------------------------------
def make_default_audio_assets():
    """Generates synthetic wav files for the game if they do not exist."""
    assets_dir = os.path.join(get_base_path(), "assets")
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
        
    sounds = {
        "shoot.wav": ("shoot", 0.15),
        "hit.wav": ("hit", 0.20),
        "gameover.wav": ("gameover", 1.2),
        "love_music.wav": ("music", 8.0)
    }
    
    for filename, (sound_type, duration) in sounds.items():
        filepath = os.path.join(assets_dir, filename)
        if not os.path.exists(filepath):
            try:
                generate_wav(filepath, sound_type, duration)
            except Exception as e:
                print(f"Error generating procedural sound {filename}: {e}")

def generate_wav(filepath, sound_type, duration):
    """Writes standard PCM mono WAV files using wave and struct modules."""
    sample_rate = 44100
    if sound_type == "music":
        sample_rate = 22050  # Lower sample rate to speed up generating the 8-second music loop
        
    num_frames = int(sample_rate * duration)
    
    with wave.open(filepath, 'w') as w:
        w.setnchannels(1)  # Mono
        w.setsampwidth(2)  # 16-bit
        w.setframerate(sample_rate)
        
        if sound_type == "shoot":
            # Upward frequency sweep (400Hz to 1200Hz)
            for i in range(num_frames):
                t = i / sample_rate
                # Linear frequency sweep: f(t) = f0 + k * t
                # Integrated phase = 2 * pi * (f0 * t + 0.5 * k * t^2)
                phase = 2 * math.pi * (400 * t + 0.5 * (1200 - 400) * (t**2 / duration))
                envelope = 1.0 - (t / duration)
                val = int(envelope * 16384 * math.sin(phase))
                w.writeframesraw(struct.pack('<h', val))
                
        elif sound_type == "hit":
            # Downward pitch sweep with noise
            for i in range(num_frames):
                t = i / sample_rate
                phase = 2 * math.pi * (800 * t - 0.5 * 700 * (t**2 / duration))
                noise = random.uniform(-0.15, 0.15)
                envelope = (1.0 - (t / duration)) ** 1.5
                val = int(envelope * 16384 * (math.sin(phase) + noise))
                val = max(-32768, min(32767, val))
                w.writeframesraw(struct.pack('<h', val))
                
        elif sound_type == "gameover":
            # Sad minor chord progression (C5 -> A4 -> F4 -> E4)
            notes = [523.25, 440.00, 349.23, 329.63]
            note_dur = duration / len(notes)
            for freq in notes:
                note_frames = int(sample_rate * note_dur)
                for i in range(note_frames):
                    t = i / sample_rate
                    phase = 2 * math.pi * freq * t
                    envelope = max(0.0, 1.0 - (t / note_dur))
                    val = int(envelope * 16384 * math.sin(phase))
                    w.writeframesraw(struct.pack('<h', val))
                    
        elif sound_type == "music":
            # Romantic chiptune arpeggiator chord loop
            # C Maj (C, E, G, C5), A min (A, C, E, A4), F Maj (F, A, C, F4), G Maj (G, B, D, G4)
            chords = [
                [261.63, 329.63, 392.00, 523.25], # C major
                [220.00, 261.63, 329.63, 440.00], # A minor
                [174.61, 220.00, 261.63, 349.23], # F major
                [196.00, 246.94, 293.66, 392.00]  # G major
            ]
            chord_dur = 2.0
            for chord_idx, chord_freqs in enumerate(chords):
                chord_frames = int(sample_rate * chord_dur)
                for i in range(chord_frames):
                    t = i / sample_rate
                    # Arpeggiator note index (switches every 0.25 seconds)
                    note_idx = int((t * 4) % len(chord_freqs))
                    freq = chord_freqs[note_idx]
                    
                    # Main arpeggio voice
                    val = 0.35 * math.sin(2 * math.pi * freq * t)
                    
                    # Pluck envelope for the arpeggiator
                    note_t = t % 0.25
                    envelope = math.exp(-8.0 * note_t)
                    
                    # Sustained warm base tone
                    bass_freq = chord_freqs[0] / 2.0
                    bass_val = 0.25 * math.sin(2 * math.pi * bass_freq * t)
                    
                    mixed = (val * envelope) + bass_val
                    sample = int(mixed * 16384)
                    sample = max(-32768, min(32767, sample))
                    w.writeframesraw(struct.pack('<h', sample))


# -------------------------------------------------------------
# 2. SCORE PERSISTENCE MANAGER
# -------------------------------------------------------------
class ScoreManager:
    """Handles saving, loading and sorting of high scores in data/scores.json."""
    def __init__(self):
        self.data_dir = os.path.join(get_base_path(), "data")
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
        self.filepath = os.path.join(self.data_dir, "scores.json")
        self.scores = []
        self.load_scores()

    def load_scores(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, 'r') as f:
                    data = json.load(f)
                    self.scores = data.get("high_scores", [])
                    # Sort scores descending
                    self.scores.sort(key=lambda x: x.get("score", 0), reverse=True)
            except Exception as e:
                print(f"Error loading scores.json: {e}")
                self.scores = []
        else:
            self.scores = []

    def get_best_score(self):
        if self.scores:
            return self.scores[0].get("score", 0)
        return 0

    def qualifies_as_high_score(self, score):
        if len(self.scores) < 5:
            return True
        return score > self.scores[-1].get("score", 0)

    def save_score(self, name, new_score):
        """Saves score to list if it qualifies. Keeps only top 5 scores."""
        # Find if score should be saved
        self.scores.append({"name": name, "score": new_score, "date": pygame.time.get_ticks()})
        self.scores.sort(key=lambda x: x.get("score", 0), reverse=True)
        self.scores = self.scores[:5] # Keep top 5
        
        try:
            with open(self.filepath, 'w') as f:
                json.dump({"high_scores": self.scores}, f, indent=4)
        except Exception as e:
            print(f"Error saving scores.json: {e}")


# -------------------------------------------------------------
# 3. ASSET LOADER WITH VECTOR DRAWING FALLBACK
# -------------------------------------------------------------
class AssetManager:
    """Loads images from folder, falling back to beautiful vector drawings on failure."""
    def __init__(self):
        self.assets_dir = os.path.join(get_base_path(), "assets")
        self.images = {}
        self.load_all_images()

    def load_all_images(self):
        # 1. Cupid Player Sprite
        self.images["cupido"] = self.load_sprite("cupido.png", (96, 96), self.draw_fallback_cupid)
        # 2. Heart Bullet Sprite
        self.images["heart"] = self.load_sprite("heart.png", (36, 36), self.draw_fallback_heart)
        # 3. Mari Enemy Sprite
        self.images["mari"] = self.load_sprite("mari.png", (80, 80), self.draw_fallback_mari)

    def load_sprite(self, filename, size, fallback_func):
        filepath = os.path.join(self.assets_dir, filename)
        if os.path.exists(filepath):
            try:
                # Load image with Pygame
                img = pygame.image.load(filepath).convert_alpha()
                img = pygame.transform.scale(img, size)
                # Clean any white background box
                self.clean_white_background(img)
                return img
            except Exception as e:
                print(f"Failed to load image '{filename}' ({e}). Generating fallback vector graphic...")
        
        # If file missing or corrupted, generate fallback
        surf = pygame.Surface(size, pygame.SRCALPHA)
        fallback_func(surf, size)
        return surf

    def clean_white_background(self, surface, tolerance=120):
        """Clears solid or near-white background pixels starting from the borders using BFS."""
        width, height = surface.get_size()
        visited = [[False for _ in range(height)] for _ in range(width)]
        
        # Start queue with all boundary pixels
        queue = []
        for x in range(width):
            queue.append((x, 0))
            queue.append((x, height - 1))
        for y in range(1, height - 1):
            queue.append((0, y))
            queue.append((width - 1, y))
            
        pixels = pygame.PixelArray(surface)
        transparent_val = surface.map_rgb((0, 0, 0, 0))
        target_color = (255, 255, 255)
        
        while queue:
            cx, cy = queue.pop(0)
            if cx < 0 or cx >= width or cy < 0 or cy >= height:
                continue
            if visited[cx][cy]:
                continue
            visited[cx][cy] = True
            
            color = surface.unmap_rgb(pixels[cx, cy])
            # Manhattan distance in RGB space to white
            dist = abs(color.r - target_color[0]) + abs(color.g - target_color[1]) + abs(color.b - target_color[2])
            
            if dist <= tolerance:
                pixels[cx, cy] = transparent_val
                # 4-way neighbors
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < width and 0 <= ny < height and not visited[nx][ny]:
                        queue.append((nx, ny))
        del pixels

    # VECTOR FALLBACK DRAWING METHODS
    def draw_fallback_cupid(self, surf, size):
        w, h = size
        # Cupid vector representation: cute cherub body, head, hair, and wings
        cx, cy = w // 2, h // 2
        
        # Wings (Left & Right) - white/pink ellipses
        pygame.draw.ellipse(surf, (240, 240, 255, 200), (cx - 28, cy - 20, 20, 25))
        pygame.draw.ellipse(surf, (240, 240, 255, 200), (cx + 8, cy - 20, 20, 25))
        
        # Body (Red Heart-like robe)
        pygame.draw.circle(surf, COLOR_RED, (cx - 8, cy + 8), 12)
        pygame.draw.circle(surf, COLOR_RED, (cx + 8, cy + 8), 12)
        pygame.draw.polygon(surf, COLOR_RED, [(cx - 20, cy + 8), (cx + 20, cy + 8), (cx, cy + 28)])
        
        # Head (Peach circle)
        pygame.draw.circle(surf, (255, 218, 185), (cx, cy - 10), 14)
        
        # Hair (Gold curly circles)
        pygame.draw.circle(surf, COLOR_GOLD, (cx - 10, cy - 22), 6)
        pygame.draw.circle(surf, COLOR_GOLD, (cx, cy - 24), 6)
        pygame.draw.circle(surf, COLOR_GOLD, (cx + 10, cy - 22), 6)
        
        # Cute smiley face details
        pygame.draw.circle(surf, (0, 0, 0), (cx - 5, cy - 10), 2)  # Left eye
        pygame.draw.circle(surf, (0, 0, 0), (cx + 5, cy - 10), 2)  # Right eye
        pygame.draw.arc(surf, COLOR_RED, (cx - 4, cy - 8, 8, 8), math.pi, 2 * math.pi, 2) # Smile

    def draw_fallback_heart(self, surf, size):
        w, h = size
        cx, cy = w // 2, h // 2
        r = w // 4
        # Left circle
        pygame.draw.circle(surf, COLOR_RED, (cx - r, cy - r // 2), r)
        # Right circle
        pygame.draw.circle(surf, COLOR_RED, (cx + r, cy - r // 2), r)
        # Bottom triangle
        pygame.draw.polygon(surf, COLOR_RED, [(cx - w // 2 + 1, cy - r // 2), (cx + w // 2 - 1, cy - r // 2), (cx, cy + h // 2)])

    def draw_fallback_mari(self, surf, size):
        w, h = size
        cx, cy = w // 2, h // 2
        # A cute romantic alien/monster with big eyes and antenna
        # Body (magenta/purple round capsule)
        pygame.draw.ellipse(surf, (255, 20, 147), (2, 8, w - 4, h - 16))
        
        # Antenna
        pygame.draw.line(surf, (255, 20, 147), (cx, 8), (cx, 2), 2)
        pygame.draw.circle(surf, COLOR_RED, (cx, 2), 4)
        
        # Big alien eyes
        pygame.draw.circle(surf, COLOR_WHITE, (cx - 10, cy - 4), 7)
        pygame.draw.circle(surf, COLOR_WHITE, (cx + 10, cy - 4), 7)
        # Heart shaped pupils!
        pygame.draw.circle(surf, COLOR_RED, (cx - 10, cy - 4), 3)
        pygame.draw.circle(surf, COLOR_RED, (cx + 10, cy - 4), 3)
        
        # Cute blushing cheeks
        pygame.draw.circle(surf, COLOR_LIGHT_PINK, (cx - 14, cy + 8), 4)
        pygame.draw.circle(surf, COLOR_LIGHT_PINK, (cx + 14, cy + 8), 4)
        
        # Mouth
        pygame.draw.arc(surf, COLOR_WHITE, (cx - 5, cy + 2, 10, 6), math.pi, 2 * math.pi, 2)


# -------------------------------------------------------------
# 4. SOUND EFFECTS & MUSIC MANAGER
# -------------------------------------------------------------
class SoundManager:
    """Manages playing effects and music, with fail-safe initialization checks."""
    def __init__(self):
        self.assets_dir = os.path.join(get_base_path(), "assets")
        self.sounds = {}
        self.music_path = None
        self.init_audio()

    def init_audio(self):
        # Audio loader wrapper
        sound_files = {
            "shoot": "shoot.wav",
            "hit": "hit.wav",
            "gameover": "gameover.wav"
        }
        
        for key, fname in sound_files.items():
            path = os.path.join(self.assets_dir, fname)
            if os.path.exists(path):
                try:
                    self.sounds[key] = pygame.mixer.Sound(path)
                except Exception as e:
                    print(f"Error loading sound {fname}: {e}")
                    self.sounds[key] = None
            else:
                self.sounds[key] = None
                
        # Check music file priority: love_music.mp3 then love_music.wav
        mp3_path = os.path.join(self.assets_dir, "love_music.mp3")
        wav_path = os.path.join(self.assets_dir, "love_music.wav")
        if os.path.exists(mp3_path):
            self.music_path = mp3_path
        elif os.path.exists(wav_path):
            self.music_path = wav_path

    def play_sound(self, key):
        sound = self.sounds.get(key)
        if sound:
            try:
                sound.play()
            except Exception:
                pass

    def play_music(self):
        if self.music_path:
            try:
                pygame.mixer.music.load(self.music_path)
                pygame.mixer.music.play(-1)  # Loop indefinitely
            except Exception as e:
                print(f"Failed to play music: {e}")

    def stop_music(self):
        try:
            pygame.mixer.music.stop()
        except Exception:
            pass


# -------------------------------------------------------------
# 5. DYNAMIC PARTICLE SYSTEM
# -------------------------------------------------------------
# Colorful romantic palette for background and explosion particles
COLOR_RAINBOW = [
    (255, 105, 180),  # Bright Hot Pink
    (255, 182, 193),  # Soft Light Pink
    (230, 20, 60),    # Crimson Red
    (255, 120, 160),  # Rose Pink
    (255, 218, 185),  # Peach Pink
    (220, 150, 255),  # Soft Purple / Lavender
    (140, 210, 255),  # Sky Blue
    (255, 225, 100),  # Gold Yellow
]

class Particle:
    """Visual juice element representing drifting stars, hearts or impact sparkles."""
    def __init__(self, x, y, particle_type="background"):
        self.x = x
        self.y = y
        self.type = particle_type
        
        if self.type == "background":
            self.vx = random.uniform(-0.3, 0.3)
            self.vy = random.uniform(-1.5, -0.5) # Drift upwards
            self.size = random.uniform(4, 10)
            self.color = random.choice(COLOR_RAINBOW)
            self.alpha = random.randint(50, 150)
            self.life = random.randint(100, 250)
        else: # "explosion" impact particles
            angle = random.uniform(0, 2 * math.pi)
            speed = random.uniform(2, 5)
            self.vx = math.cos(angle) * speed
            self.vy = math.sin(angle) * speed - 1.5  # initial upward bias
            self.size = random.uniform(6, 12)
            self.color = random.choice(COLOR_RAINBOW)
            self.alpha = 255
            self.life = random.randint(30, 60)
            
        self.max_life = self.life
        self.angle_offset = random.uniform(0, 2 * math.pi)

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.life -= 1
        
        if self.type == "background":
            # Float wiggling effect
            self.x += math.sin((self.life + self.angle_offset) * 0.05) * 0.2
            # Handle looping background particles
            if self.y < -20:
                self.y = SCREEN_HEIGHT + 20
                self.life = self.max_life
                self.alpha = random.randint(50, 150)
        else:
            # Explosion particles: decelerate outward blast and float up gently
            self.vx *= 0.94
            self.vy = (self.vy - 0.08) * 0.94  # upward float drift + drag
            self.alpha = max(0, int(255 * (self.life / self.max_life)))

    def draw(self, surface):
        if self.alpha <= 0:
            return
            
        # Draw a little pixelated vector heart shape for particles
        size = int(self.size)
        if size < 2:
            size = 2
            
        # Create small temporary alpha surface for opacity fading
        p_surf = pygame.Surface((size * 2, size * 2), pygame.SRCALPHA)
        color = (self.color[0], self.color[1], self.color[2], self.alpha)
        
        # Simple heart outline drawing
        r = size // 2
        cx, cy = size, size
        pygame.draw.circle(p_surf, color, (cx - r // 2, cy - r // 2), r)
        pygame.draw.circle(p_surf, color, (cx + r // 2, cy - r // 2), r)
        pygame.draw.polygon(p_surf, color, [(cx - size, cy - r // 2), (cx + size, cy - r // 2), (cx, cy + size)])
        
        surface.blit(p_surf, (self.x - size, self.y - size))


# -------------------------------------------------------------
# 6. CORE GAME ENTITIES
# -------------------------------------------------------------
class Player(pygame.sprite.Sprite):
    """Cupid. Can tilt on lateral movement and fires hearts."""
    def __init__(self, image):
        super().__init__()
        self.base_image = image
        self.image = image
        self.rect = self.image.get_rect()
        # Initial position
        self.rect.centerx = SCREEN_WIDTH // 2
        self.rect.bottom = SCREEN_HEIGHT - 30
        self.speed = 9
        self.cooldown = 300  # Shoots every X ms
        self.last_shot_time = 0
        
        # Tilt animations
        self.angle = 0
        self.target_angle = 0

    def update(self, keys):
        dx = 0
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            dx = -self.speed
            self.target_angle = 15  # Tilt left
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            dx = self.speed
            self.target_angle = -15  # Tilt right
        else:
            self.target_angle = 0 # Straighten

        # Apply movement
        self.rect.x += dx
        # Keep inside screens boundaries
        if self.rect.left < 0:
            self.rect.left = 0
        if self.rect.right > SCREEN_WIDTH:
            self.rect.right = SCREEN_WIDTH

        # Smoothly interpolate angle
        self.angle += (self.target_angle - self.angle) * 0.15
        
        # Render rotated image
        if abs(self.angle) > 0.5:
            self.image = pygame.transform.rotate(self.base_image, self.angle)
            # Re-center rect to avoid wobbly offsets
            old_center = self.rect.center
            self.rect = self.image.get_rect()
            self.rect.center = old_center
        else:
            self.image = self.base_image

    def draw(self, surface):
        surface.blit(self.image, self.rect)


class Enemy(pygame.sprite.Sprite):
    """Mari. Descends from above with progressive scaling and a gentle horizontal wiggle."""
    def __init__(self, image, initial_speed):
        super().__init__()
        self.image = image
        self.rect = self.image.get_rect()
        
        # Spawn random placement above top screen
        self.rect.x = random.randint(10, SCREEN_WIDTH - self.rect.width - 10)
        self.rect.y = random.randint(-150, -60)
        
        self.speed_y = initial_speed
        
        # Wiggle parameters (sine wave path)
        self.spawn_time = pygame.time.get_ticks()
        self.wiggle_speed = random.uniform(0.003, 0.006)
        self.wiggle_amplitude = random.uniform(20, 50)
        self.center_x = self.rect.x

    def update(self, speed_multiplier):
        # Move down
        self.rect.y += self.speed_y * speed_multiplier
        
        # Sine wave wiggling path
        elapsed = pygame.time.get_ticks() - self.spawn_time
        offset = math.sin(elapsed * self.wiggle_speed) * self.wiggle_amplitude
        self.rect.x = int(self.center_x + offset)
        
        # Keep within horizontal boundaries during wiggle
        if self.rect.left < 5:
            self.rect.left = 5
        elif self.rect.right > SCREEN_WIDTH - 5:
            self.rect.right = SCREEN_WIDTH - 5

    def draw(self, surface):
        surface.blit(self.image, self.rect)


class Bullet(pygame.sprite.Sprite):
    """Cupid's heart arrows. Travel upwards rapidly."""
    def __init__(self, x, y, image, speed):
        super().__init__()
        self.image = image
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.bottom = y
        self.speed_y = -speed

    def update(self):
        self.rect.y += self.speed_y

    def draw(self, surface):
        # Dibujar una sombra ovalada oscura debajo para mejorar contraste (especialmente útil para huesos blancos)
        shadow_surf = pygame.Surface((self.rect.width, self.rect.height), pygame.SRCALPHA)
        pygame.draw.ellipse(shadow_surf, (30, 20, 35, 100), (0, 0, self.rect.width, self.rect.height))
        surface.blit(shadow_surf, (self.rect.x + 3, self.rect.y + 3))
        # Dibujar el proyectil original
        surface.blit(self.image, self.rect)


# -------------------------------------------------------------
# 7. GAME MENUS AND USER INTERFACE UI
# -------------------------------------------------------------
class UIHelper:
    """Helper module to draw high-end retro text with custom drop shadows and glowing text blocks."""
    @staticmethod
    def draw_text(surface, text, size, color, center_pos, font_style="georgia", shadow_color=None, shadow_offset=(2, 2)):
        # Try finding standard fonts, fallback to default
        font_names = [font_style, "lucidacalligraphy", "georgia", "segoe ui", "arial"]
        font = None
        for fn in font_names:
            try:
                font = pygame.font.SysFont(fn, size)
                break
            except Exception:
                continue
        if not font:
            font = pygame.font.Font(None, size)
            
        if shadow_color:
            s_surf = font.render(text, True, shadow_color)
            s_rect = s_surf.get_rect(center=(center_pos[0] + shadow_offset[0], center_pos[1] + shadow_offset[1]))
            surface.blit(s_surf, s_rect)
            
        txt_surf = font.render(text, True, color)
        txt_rect = txt_surf.get_rect(center=center_pos)
        surface.blit(txt_surf, txt_rect)
        return txt_rect


class MenuButton:
    """Interactive custom buttons with smooth hover text expansion and rounded romantic design."""
    def __init__(self, text, width, height, center_pos, color=COLOR_RED, hover_color=COLOR_PINK):
        self.text = text
        self.width = width
        self.height = height
        self.center_x, self.center_y = center_pos
        self.color = color
        self.hover_color = hover_color
        
        self.rect = pygame.Rect(0, 0, width, height)
        self.rect.center = center_pos
        
        # Scaling state variable for animations
        self.scale = 1.0
        self.is_hovered = False

    def update(self, mouse_pos):
        self.is_hovered = self.rect.collidepoint(mouse_pos)
        
        # Smooth interpolation of button scale
        target_scale = 1.1 if self.is_hovered else 1.0
        self.scale += (target_scale - self.scale) * 0.2

    def draw(self, surface):
        # Compute scaled sizes
        sw = int(self.width * self.scale)
        sh = int(self.height * self.scale)
        
        scaled_rect = pygame.Rect(0, 0, sw, sh)
        scaled_rect.center = (self.center_x, self.center_y)
        
        # Choose background color
        bg_col = self.hover_color if self.is_hovered else self.color
        
        # Draw fancy rounded background button
        pygame.draw.rect(surface, bg_col, scaled_rect, border_radius=15)
        # Draw glowing thin white inner border
        pygame.draw.rect(surface, COLOR_WHITE, scaled_rect, width=2, border_radius=15)
        
        # Dynamic text size based on scale
        text_size = int(24 * self.scale)
        UIHelper.draw_text(surface, self.text, text_size, COLOR_WHITE, (self.center_x, self.center_y), font_style="georgia")


# -------------------------------------------------------------
# 8. MAIN GAME STATE CONTROL MANAGER
# -------------------------------------------------------------
class Game:
    """Central engine managing scene logic, frame rendering, ticks, and state transitions."""
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Maya Invaders ❤️")
        self.clock = pygame.time.Clock()
        
        self.focus_brought = False
        
        # Initial structures
        self.assets = AssetManager()
        self.sounds = SoundManager()
        self.score_mgr = ScoreManager()
        
        # Particle list for ambient look
        self.particles = []
        for _ in range(30):
            # Seed background drifting hearts
            self.particles.append(Particle(random.randint(0, SCREEN_WIDTH), random.randint(0, SCREEN_HEIGHT), "background"))
            
        # States: "MENU", "PLAYING", "GAME_OVER", "HIGH_SCORES"
        self.state = "MENU"
        self.score = 0
        self.lives = 3
        
        # Difficulty scales
        self.enemy_speed_multiplier = 1.0
        self.enemy_spawn_cooldown = 1500  # Spawns every 1.5 seconds
        self.last_enemy_spawn = 0
        self.bullet_speed = 8
        
        # Collections
        self.bullets = pygame.sprite.Group()
        self.enemies = pygame.sprite.Group()
        
        # Main Menu buttons
        self.btn_play = MenuButton("PLAY", 240, 55, (SCREEN_WIDTH // 2, 420))
        self.btn_highscores = MenuButton("HIGH SCORES", 240, 55, (SCREEN_WIDTH // 2, 490))
        self.btn_exit = MenuButton("EXIT", 240, 55, (SCREEN_WIDTH // 2, 560))
        
        # Game over screen buttons
        self.btn_replay = MenuButton("PLAY AGAIN", 240, 55, (SCREEN_WIDTH // 2, 440))
        self.btn_menu = MenuButton("MAIN MENU", 240, 55, (SCREEN_WIDTH // 2, 510))
        self.btn_exit_go = MenuButton("EXIT", 240, 55, (SCREEN_WIDTH // 2, 580))
        
        # Back button for high scores panel
        self.btn_back = MenuButton("BACK", 180, 50, (SCREEN_WIDTH // 2, 600))
        
        # Chest event buttons and flags
        self.chest_event_triggered = False
        self.btn_chest_exit = MenuButton("SALIR", 200, 50, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 40), color=(150, 60, 80), hover_color=(200, 100, 120))
        
        self.player = None
        self.start_music = True

    def run(self):
        """Starts main looping logic."""
        running = True
        while running:
            # Enforce solid 60 FPS
            self.clock.tick(FPS)
            
            # Continuous music loop manager
            if self.start_music:
                self.sounds.play_music()
                self.start_music = False
                
            running = self.handle_events()
            self.update()
            self.draw()
            
        # Quit routine
        self.sounds.stop_music()
        pygame.quit()
        sys.exit()

    def handle_events(self):
        mouse_pos = pygame.mouse.get_pos()
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
                
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                # Handle button clicking per menu state
                if self.state == "MENU":
                    if self.btn_play.rect.collidepoint(mouse_pos):
                        self.start_game()
                    elif self.btn_highscores.rect.collidepoint(mouse_pos):
                        self.state = "HIGH_SCORES"
                    elif self.btn_exit.rect.collidepoint(mouse_pos):
                        return False
                        
                elif self.state == "GAME_OVER":
                    if self.btn_replay.rect.collidepoint(mouse_pos):
                        self.start_game()
                    elif self.btn_menu.rect.collidepoint(mouse_pos):
                        self.state = "MENU"
                    elif self.btn_exit_go.rect.collidepoint(mouse_pos):
                        return False
                        
                elif self.state == "HIGH_SCORES":
                    if self.btn_back.rect.collidepoint(mouse_pos):
                        self.state = "MENU"
                        
                elif self.state == "CHEST_EVENT":
                    if self.btn_chest_exit.rect.collidepoint(mouse_pos):
                        return False
                        
            if event.type == pygame.KEYDOWN:
                if self.state == "ENTER_NAME":
                    if event.key == pygame.K_RETURN:
                        name_to_save = self.input_name.strip()
                        if not name_to_save:
                            name_to_save = "CUPIDO"
                        self.score_mgr.save_score(name_to_save, self.score)
                        self.state = "GAME_OVER"
                        self.sounds.play_sound("shoot")
                    elif event.key == pygame.K_BACKSPACE:
                        self.input_name = self.input_name[:-1]
                    elif event.key == pygame.K_ESCAPE:
                        self.state = "MENU"
                    else:
                        if len(self.input_name) < 10:
                            char = event.unicode
                            if char.isalnum() or char == " ":
                                self.input_name += char.upper()
                
                elif event.key == pygame.K_ESCAPE:
                    if self.state in ["HIGH_SCORES", "GAME_OVER"]:
                        self.state = "MENU"
                    elif self.state == "PLAYING":
                        # Instant forfeit to menu
                        self.sounds.play_sound("gameover")
                        if self.score_mgr.qualifies_as_high_score(self.score):
                            self.state = "ENTER_NAME"
                            self.input_name = ""
                        else:
                            self.state = "GAME_OVER"
                
                # Instant cheats for testing / progressive verification!
                # (Can be documented as a secret debug hotkey)
                elif self.state == "PLAYING" and event.key == pygame.K_k:
                    # Instantly destroy all enemies on board
                    for e in self.enemies:
                        self.trigger_enemy_explosion(e)
                        e.kill()
                        self.add_points(15)

        return True

    def start_game(self):
        self.state = "PLAYING"
        self.score = 0
        self.lives = 3
        self.player = Player(self.assets.images["cupido"])
        self.bullets.empty()
        self.enemies.empty()
        self.last_enemy_spawn = pygame.time.get_ticks()
        # Reset speeds
        self.enemy_speed_multiplier = 1.0
        self.enemy_spawn_cooldown = 1500
        self.bullet_speed = 8
        self.chest_event_triggered = False

    def add_points(self, amount):
        self.score += amount
        self.adjust_difficulty()
        # Trigger chest event at 100 points
        if self.score >= 100 and not self.chest_event_triggered:
            self.chest_event_triggered = True
            self.state = "CHEST_EVENT"
            self.sounds.play_sound("gameover")
            # Auto-guardar puntuación en scores.json de inmediato para que la web lo detecte al instante
            try:
                self.score_mgr.save_score("IGNACIO & LUCIA", self.score)
            except Exception as e:
                print(f"Error auto-saving score: {e}")

    def adjust_difficulty(self):
        """Dynamic game challenge adjuster based on score."""
        # Aumentar dificultad de 10 en 10 puntos progresivamente
        levels = self.score // 10
        
        self.enemy_speed_multiplier = 1.0 + (levels * 0.02)
        self.enemy_spawn_cooldown = max(400, 1500 - (levels * 30))
        self.bullet_speed = min(14, 8 + (levels * 0.1))

    def trigger_enemy_explosion(self, enemy):
        """Creates colorful exploding particles on contact points."""
        self.sounds.play_sound("hit")
        for _ in range(12):
            self.particles.append(Particle(enemy.rect.centerx, enemy.rect.centery, "explosion"))

    def update(self):
        # Forzar la ventana del juego al primer plano en los primeros frames cuando el handle está registrado
        if not self.focus_brought:
            try:
                import ctypes
                hwnds = []
                WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
                
                def enum_windows_callback(hwnd, extra_ptr):
                    length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                    if length > 0:
                        buf = ctypes.create_unicode_buffer(length + 1)
                        ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                        if "Marcianitos" in buf.value:
                            hwnds.append(hwnd)
                    return True
                
                callback = WNDENUMPROC(enum_windows_callback)
                ctypes.windll.user32.EnumWindows(callback, 0)
                if hwnds:
                    hwnd = hwnds[0]
                    # Restaurar y forzar al frente usando AttachThreadInput para saltar el bloqueo de Windows
                    try:
                        fore_hwnd = ctypes.windll.user32.GetForegroundWindow()
                        if fore_hwnd and fore_hwnd != hwnd:
                            fore_thread = ctypes.windll.user32.GetWindowThreadProcessId(fore_hwnd, None)
                            curr_thread = ctypes.windll.kernel32.GetCurrentThreadId()
                            
                            ctypes.windll.user32.AttachThreadInput(curr_thread, fore_thread, True)
                            ctypes.windll.user32.ShowWindow(hwnd, 9) # SW_RESTORE
                            ctypes.windll.user32.SetForegroundWindow(hwnd)
                            ctypes.windll.user32.SetActiveWindow(hwnd)
                            ctypes.windll.user32.SetFocus(hwnd)
                            ctypes.windll.user32.AttachThreadInput(curr_thread, fore_thread, False)
                        else:
                            ctypes.windll.user32.ShowWindow(hwnd, 9)
                            ctypes.windll.user32.SetForegroundWindow(hwnd)
                    except Exception:
                        ctypes.windll.user32.ShowWindow(hwnd, 9)
                        ctypes.windll.user32.SetForegroundWindow(hwnd)
                    self.focus_brought = True
            except Exception:
                self.focus_brought = True

        mouse_pos = pygame.mouse.get_pos()
        
        # 1. Background particles update in every state for visual consistency
        for p in self.particles[:]:
            p.update()
            # Remove short-lived explosion particles when dead
            if p.type == "explosion" and p.life <= 0:
                self.particles.remove(p)

        # 2. State-specific update updates
        if self.state == "MENU":
            self.btn_play.update(mouse_pos)
            self.btn_highscores.update(mouse_pos)
            self.btn_exit.update(mouse_pos)
            
        elif self.state == "GAME_OVER":
            self.btn_replay.update(mouse_pos)
            self.btn_menu.update(mouse_pos)
            self.btn_exit_go.update(mouse_pos)
            
        elif self.state == "HIGH_SCORES":
            self.btn_back.update(mouse_pos)
            
        elif self.state == "CHEST_EVENT":
            self.btn_chest_exit.update(mouse_pos)
            
        elif self.state == "PLAYING":
            keys = pygame.key.get_pressed()
            self.player.update(keys)
            
            # Shooting logic (spacebar triggers heart bullets)
            if keys[pygame.K_SPACE]:
                now = pygame.time.get_ticks()
                if now - self.player.last_shot_time > self.player.cooldown:
                    # Shoot bullet from Cupid's hands
                    new_bullet = Bullet(self.player.rect.centerx, self.player.rect.top, self.assets.images["heart"], self.bullet_speed)
                    self.bullets.add(new_bullet)
                    self.sounds.play_sound("shoot")
                    self.player.last_shot_time = now
                    
            # Update groups
            self.bullets.update()
            self.enemies.update(self.enemy_speed_multiplier)
            
            # Remove offscreen bullets
            for b in self.bullets:
                if b.rect.bottom < 0:
                    b.kill()
                    
            # Spawn new enemies incrementally
            now = pygame.time.get_ticks()
            if now - self.last_enemy_spawn > self.enemy_spawn_cooldown:
                # Spawn base mari enemy speed between 2.0 and 4.0
                new_enemy = Enemy(self.assets.images["mari"], random.uniform(2.0, 3.5))
                self.enemies.add(new_enemy)
                self.last_enemy_spawn = now
                
            # Check for bullet-enemy overlaps
            collisions = pygame.sprite.groupcollide(self.bullets, self.enemies, True, True)
            for bullet, hit_enemies in collisions.items():
                for enemy in hit_enemies:
                    self.trigger_enemy_explosion(enemy)
                    self.add_points(10) # 10 pts per enemy hit
                    
            # Check if enemy hits Cupid or crosses screen base
            for e in self.enemies:
                # Collision: Player meets enemy
                if e.rect.colliderect(self.player.rect):
                    self.trigger_enemy_explosion(e)
                    e.kill()
                    self.lose_life()
                # Cross screen base boundary
                elif e.rect.bottom > SCREEN_HEIGHT:
                    e.kill()
                    self.lose_life()

    def lose_life(self):
        self.lives -= 1
        # Quick sound feedback
        self.sounds.play_sound("hit")
        if self.lives <= 0:
            self.sounds.play_sound("gameover")
            if self.score_mgr.qualifies_as_high_score(self.score):
                self.state = "ENTER_NAME"
                self.input_name = ""
            else:
                self.state = "GAME_OVER"

    def draw(self):
        # Refresh screen to deep dark wine background
        self.screen.fill(COLOR_BG)
        
        # 1. Render all particles first (under UI)
        for p in self.particles:
            p.draw(self.screen)
            
        # 2. Render contents of current state
        if self.state == "MENU":
            self.draw_menu_screen()
        elif self.state == "PLAYING":
            self.draw_playing_screen()
        elif self.state == "GAME_OVER":
            self.draw_gameover_screen()
        elif self.state == "HIGH_SCORES":
            self.draw_highscores_screen()
        elif self.state == "ENTER_NAME":
            self.draw_enter_name_screen()
        elif self.state == "CHEST_EVENT":
            self.draw_playing_screen()
            self.draw_chest_event_screen()
            
        pygame.display.flip()

    def draw_chest_event_screen(self):
        # Semi-transparent wine overlay to dim the frozen game screen
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((18, 2, 16, 200))
        self.screen.blit(overlay, (0, 0))
        
        # Container Box
        panel_rect = pygame.Rect(0, 0, 700, 220)
        panel_rect.center = (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
        pygame.draw.rect(self.screen, COLOR_ACCENT, panel_rect, border_radius=15)
        pygame.draw.rect(self.screen, COLOR_WHITE, panel_rect, width=3, border_radius=15)
        
        # Warning label
        UIHelper.draw_text(self.screen, "Vaya vaya vaya.... parece que se os da bien este juego.", 20, COLOR_WHITE, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 50), font_style="georgia")
        UIHelper.draw_text(self.screen, "Vuestro número es el 8", 24, COLOR_GOLD, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 10), font_style="georgia")
        
        # Action buttons
        self.btn_chest_exit.draw(self.screen)

    def draw_enter_name_screen(self):
        UIHelper.draw_text(self.screen, "¡NUEVO RÉCORD! 🏆", 64, COLOR_GOLD_DARK, (SCREEN_WIDTH // 2, 160), font_style="georgia", shadow_color=(220, 205, 185))
        UIHelper.draw_text(self.screen, f"CONSEGUISTE {self.score} PUNTOS", 24, COLOR_TEXT_DARK, (SCREEN_WIDTH // 2, 230), font_style="georgia")
        
        # Panel container for text entry
        panel_rect = pygame.Rect(0, 0, 500, 220)
        panel_rect.center = (SCREEN_WIDTH // 2, 380)
        pygame.draw.rect(self.screen, COLOR_ACCENT, panel_rect, border_radius=15)
        pygame.draw.rect(self.screen, COLOR_WHITE, panel_rect, width=2, border_radius=15)
        
        # Label
        UIHelper.draw_text(self.screen, "ESCRIBE TU NOMBRE:", 20, COLOR_LIGHT_PINK, (SCREEN_WIDTH // 2, 320), font_style="segoe ui")
        
        # Display name with blinking cursor
        blinking_cursor = "_" if (pygame.time.get_ticks() // 500) % 2 == 0 else " "
        display_name = self.input_name + blinking_cursor
        
        # Drawing box for typed name
        name_box = pygame.Rect(0, 0, 320, 50)
        name_box.center = (SCREEN_WIDTH // 2, 380)
        pygame.draw.rect(self.screen, (18, 2, 16), name_box, border_radius=5)
        pygame.draw.rect(self.screen, COLOR_PINK, name_box, width=1, border_radius=5)
        
        UIHelper.draw_text(self.screen, display_name, 28, COLOR_WHITE, (SCREEN_WIDTH // 2, 380), font_style="segoe ui")
        
        # Instructions
        UIHelper.draw_text(self.screen, "Presiona ENTER para guardar", 18, COLOR_GOLD, (SCREEN_WIDTH // 2, 450), font_style="segoe ui")

    # RENDERING METHODS
    def draw_menu_screen(self):
        # Pulsing romantic game title
        pulse = math.sin(pygame.time.get_ticks() * 0.003) * 5
        title_y = 160 + pulse
        
        UIHelper.draw_text(self.screen, "MARCIANITOS", 72, COLOR_PINK, (SCREEN_WIDTH // 2, title_y), font_style="georgia", shadow_color=(200, 80, 100))
        UIHelper.draw_text(self.screen, "Maya Attacks!", 48, COLOR_TEXT_DARK, (SCREEN_WIDTH // 2, title_y + 70), font_style="georgia", shadow_color=(220, 205, 185))
        
        # High Score banner
        best_score = self.score_mgr.get_best_score()
        UIHelper.draw_text(self.screen, f"BEST SCORE: {best_score}", 28, COLOR_GOLD_DARK, (SCREEN_WIDTH // 2, 330), font_style="segoe ui")
        
        # Render Buttons
        self.btn_play.draw(self.screen)
        self.btn_highscores.draw(self.screen)
        self.btn_exit.draw(self.screen)

    def draw_playing_screen(self):
        # Draw game entities
        self.player.draw(self.screen)
        self.enemies.draw(self.screen)
        self.bullets.draw(self.screen)
        
        # Draw HUD Panel
        # Light line separator
        pygame.draw.line(self.screen, (220, 205, 185), (0, 48), (SCREEN_WIDTH, 48), 2)
        
        # Scores (Current score & Best Score)
        UIHelper.draw_text(self.screen, f"SCORE: {self.score}", 24, COLOR_TEXT_DARK, (120, 25), font_style="segoe ui")
        
        best = self.score_mgr.get_best_score()
        best_display = max(best, self.score)
        UIHelper.draw_text(self.screen, f"BEST: {best_display}", 20, COLOR_GOLD_DARK, (SCREEN_WIDTH // 2, 25), font_style="segoe ui")
        
        # Draw Difficulty Multiplier level indicator
        diff_text = f"DIFFICULTY: {int((self.enemy_speed_multiplier - 1.0) * 100)}%"
        UIHelper.draw_text(self.screen, diff_text, 18, COLOR_TEXT_MUTED, (SCREEN_WIDTH - 320, 25), font_style="segoe ui")
        
        # Lives represented as little pulsing red hearts
        pulse_scale = 1.0 + math.sin(pygame.time.get_ticks() * 0.01) * 0.08
        heart_w = int(24 * pulse_scale)
        heart_h = int(24 * pulse_scale)
        
        # Check if heart image is loaded
        heart_img = self.assets.images["heart"]
        scaled_heart = pygame.transform.scale(heart_img, (heart_w, heart_h))
        
        start_x = SCREEN_WIDTH - 150
        for i in range(3):
            hx = start_x + (i * 32)
            hy = 25 - heart_h // 2
            if i < self.lives:
                self.screen.blit(scaled_heart, (hx, hy))
            else:
                pygame.draw.circle(self.screen, (200, 180, 160), (hx + 12, hy + 12), 10)

    def draw_gameover_screen(self):
        UIHelper.draw_text(self.screen, "GAME OVER", 72, COLOR_RED, (SCREEN_WIDTH // 2, 160), font_style="georgia", shadow_color=(200, 180, 160))
        
        # Love message depending on final score
        msg = "¡Sigue intentándolo, tu Cupido te espera!"
        if self.score > 500:
            msg = "¡Leyenda del Amor! Flechaste corazones como un profesional."
        elif self.score > 250:
            msg = "¡Excelente puntería! Tu amor está en el aire."
        elif self.score > 100:
            msg = "¡Buen intento, el amor requiere práctica!"
            
        UIHelper.draw_text(self.screen, msg, 22, COLOR_TEXT_MUTED, (SCREEN_WIDTH // 2, 230), font_style="georgia")
        
        # Score recap box container
        panel_rect = pygame.Rect(0, 0, 420, 120)
        panel_rect.center = (SCREEN_WIDTH // 2, 320)
        pygame.draw.rect(self.screen, COLOR_ACCENT, panel_rect, border_radius=10)
        pygame.draw.rect(self.screen, COLOR_WHITE, panel_rect, width=2, border_radius=10)
        
        # Draw stats
        UIHelper.draw_text(self.screen, f"YOUR SCORE: {self.score}", 26, COLOR_WHITE, (SCREEN_WIDTH // 2, 300), font_style="segoe ui")
        best_score = self.score_mgr.get_best_score()
        UIHelper.draw_text(self.screen, f"BEST SCORE: {best_score}", 22, COLOR_GOLD, (SCREEN_WIDTH // 2, 340), font_style="segoe ui")
        
        # Buttons
        self.btn_replay.draw(self.screen)
        self.btn_menu.draw(self.screen)
        self.btn_exit_go.draw(self.screen)

    def draw_highscores_screen(self):
        UIHelper.draw_text(self.screen, "HIGH SCORES", 56, COLOR_GOLD_DARK, (SCREEN_WIDTH // 2, 120), font_style="georgia", shadow_color=(220, 205, 185))
        
        # Leaderboard box
        box_rect = pygame.Rect(0, 0, 500, 360)
        box_rect.center = (SCREEN_WIDTH // 2, 380)
        pygame.draw.rect(self.screen, COLOR_ACCENT, box_rect, border_radius=15)
        pygame.draw.rect(self.screen, COLOR_WHITE, box_rect, width=2, border_radius=15)
        
        # Draw Leaderboard scores
        start_y = 240
        if not self.score_mgr.scores:
            UIHelper.draw_text(self.screen, "No scores yet. Play to win!", 24, COLOR_LIGHT_PINK, (SCREEN_WIDTH // 2, 380), font_style="georgia")
        else:
            for idx, score_data in enumerate(self.score_mgr.scores):
                pos_str = f"#{idx + 1}"
                name_str = score_data.get('name', 'CUPIDO')
                score_str = f"{score_data.get('score', 0)} pts"
                
                line_y = start_y + (idx * 55)
                # Left align rank
                UIHelper.draw_text(self.screen, pos_str, 26, COLOR_GOLD if idx == 0 else COLOR_WHITE, (SCREEN_WIDTH // 2 - 170, line_y), font_style="segoe ui")
                # Center-Left name
                UIHelper.draw_text(self.screen, name_str, 26, COLOR_WHITE, (SCREEN_WIDTH // 2 - 30, line_y), font_style="segoe ui")
                # Right align score
                UIHelper.draw_text(self.screen, score_str, 26, COLOR_WHITE, (SCREEN_WIDTH // 2 + 140, line_y), font_style="segoe ui")
                
                # Separation dots
                pygame.draw.line(self.screen, (100, 30, 70), (SCREEN_WIDTH // 2 - 120, line_y), (SCREEN_WIDTH // 2 + 70, line_y), 1)

        self.btn_back.draw(self.screen)


# -------------------------------------------------------------
# 9. EXECUTION TRIGGER
# -------------------------------------------------------------
if __name__ == "__main__":
    # Ensure audio directories and procedurally synthesized WAVs are prepared
    make_default_audio_assets()
    
    # Fire up game
    game = Game()
    game.run()
