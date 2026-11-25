"""Rebuild licensed, content-addressed audio; requires imageio-ffmpeg locally."""
import hashlib
import json
import math
from pathlib import Path
import random
import subprocess
import urllib.request
import wave
import struct
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/audio-source'
DEST = ROOT / 'public/media/audio'
SOURCE.mkdir(parents=True, exist_ok=True)
DEST.mkdir(parents=True, exist_ok=True)
ENCODER = imageio_ffmpeg.get_ffmpeg_exe()
KENNEY = 'https://raw.githubusercontent.com/Calinou/kenney-ui-audio/8c3d81b9159d058c444f89d12d518276b0b09345/'
MUSIC = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Floating%20Cities.mp3'


def download(url, name):
    target = SOURCE / name
    if not target.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'RoadToGlory-audio-build'})
        with urllib.request.urlopen(request, timeout=60) as response:
            target.write_bytes(response.read())
    return target


def tone(name, notes, length, noise=False):
    rate = 44100
    rng = random.Random(42)
    samples = []
    for index in range(int(rate * length)):
        t = index / rate
        envelope = min(1, t / 0.01) * max(0, 1 - t / length) ** 2
        value = rng.uniform(-1, 1) if noise else sum(
            math.sin(2 * math.pi * frequency * t) for frequency in notes
        ) / len(notes)
        samples.append(struct.pack('<h', int(value * envelope * 11000)))
    target = SOURCE / f'{name}.wav'
    with wave.open(str(target), 'wb') as audio:
        audio.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        audio.writeframes(b''.join(samples))
    return target


assets = {
    'click': download(KENNEY + 'addons/kenney_ui_audio/click1.wav', 'kenney-click1.wav'),
    'tick': download(KENNEY + 'addons/kenney_ui_audio/rollover2.wav', 'kenney-rollover2.wav'),
    'confirm': download(KENNEY + 'addons/kenney_ui_audio/switch3.wav', 'kenney-switch3.wav'),
    'transition': download(KENNEY + 'addons/kenney_ui_audio/switch10.wav', 'kenney-switch10.wav'),
    'spin': tone('spin', [], 0.22, noise=True),
    'success': tone('success', [523.25, 659.25, 783.99], 0.45),
    'award': tone('award', [392, 523.25, 659.25, 783.99], 1.1),
    'negative': tone('negative', [196, 233.08], 0.35),
    'music': download(MUSIC, 'floating-cities.mp3'),
    'cipher': download('https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cipher2.mp3', 'cipher.mp3'),
}
manifest = {}
for name, source in assets.items():
    target = SOURCE / f'{name}-encoded.mp3'
    is_music = name in ('music', 'cipher')
    filters = 'loudnorm=I=-22:TP=-2:LRA=7,afade=t=in:d=0.1,areverse,afade=t=in:d=0.6,areverse' if is_music else 'alimiter=limit=0.7'
    subprocess.run([ENCODER, '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                    '-map_metadata', '-1', '-vn', '-af', filters, '-ar', '44100',
                    '-ac', '2' if is_music else '1', '-c:a', 'libmp3lame',
                    '-b:a', '80k' if is_music else '64k', str(target)], check=True)
    data = target.read_bytes()
    digest = hashlib.sha256(data).hexdigest()[:12]
    filename = f'{name}.{digest}.mp3'
    (DEST / filename).write_bytes(data)
    manifest[name] = f'/media/audio/{filename}'
    print(name, len(data), filename)
(ROOT / 'features/audio/audio-assets.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
license_text = download(KENNEY + 'addons/kenney_ui_audio/LICENSE.txt', 'kenney-LICENSE.txt').read_text()
(DEST / 'KENNEY-LICENSE.txt').write_text(license_text, encoding='utf-8')
