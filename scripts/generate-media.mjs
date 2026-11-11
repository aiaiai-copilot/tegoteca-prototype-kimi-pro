import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const outputDirectory = path.resolve('public/media');
await mkdir(outputDirectory, { recursive: true });

function makeWav() {
  const sampleRate = 22_050;
  const durationSeconds = 1.2;
  const samples = Math.floor(sampleRate * durationSeconds);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.min(1, time * 30, (durationSeconds - time) * 30);
    const sample = Math.round(Math.sin(2 * Math.PI * 440 * time) * 0.22 * envelope * 32_767);
    buffer.writeInt16LE(sample, 44 + index * 2);
  }
  return buffer;
}

await writeFile(path.join(outputDirectory, 'demo-tone.wav'), makeWav());
await writeFile(
  path.join(outputDirectory, 'demo-note.txt'),
  'Это локальный пример файла Теготеки.\nЕго можно скачать и открыть в другом приложении.\n',
  'utf8',
);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const gradient = context.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, '#173f3a');
    gradient.addColorStop(1, '#e58b4c');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 640, 360);
    context.fillStyle = 'rgba(255,255,255,0.16)';
    context.beginPath();
    context.arc(490, 90, 120, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fffaf2';
    context.font = 'bold 48px sans-serif';
    context.fillText('Теготека', 48, 175);
    context.font = '26px sans-serif';
    context.fillText('локальный пример изображения', 48, 225);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await writeFile(path.join(outputDirectory, 'demo-image.png'), Buffer.from(pngBase64, 'base64'));

  const webmBase64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
    recorder.start(100);
    const startedAt = performance.now();
    await new Promise((resolve) => {
      function draw(now) {
        const elapsed = now - startedAt;
        const progress = Math.min(1, elapsed / 2000);
        context.fillStyle = '#132f2c';
        context.fillRect(0, 0, 640, 360);
        context.fillStyle = '#e58b4c';
        context.fillRect(50 + progress * 430, 90, 110, 110);
        context.fillStyle = '#fffaf2';
        context.font = 'bold 36px sans-serif';
        context.fillText('Теготека · видео', 48, 285);
        if (progress < 1) requestAnimationFrame(draw);
        else resolve();
      }
      requestAnimationFrame(draw);
    });
    recorder.stop();
    await stopped;
    for (const track of stream.getTracks()) track.stop();
    const blob = new Blob(chunks, { type: 'video/webm' });
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return dataUrl.split(',')[1];
  });
  await writeFile(path.join(outputDirectory, 'demo-video.webm'), Buffer.from(webmBase64, 'base64'));
} finally {
  await browser.close();
}

console.log('Созданы public/media/demo-image.png, demo-tone.wav, demo-video.webm и demo-note.txt');
