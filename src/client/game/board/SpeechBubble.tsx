import { axialToPixel } from './hexMath';

type Props = {
  message: string;
  visible: boolean;
  generalPosition?: { q: number; r: number } | null;
};

export function SpeechBubble({ message, visible, generalPosition }: Props) {
  if (!visible || !generalPosition) return null;

  const { x, y } = axialToPixel(generalPosition);
  const padX = 14;
  const padY = 8;
  const fontSize = 12;
  const charWidth = fontSize * 0.55;
  const lineHeight = fontSize + 4;
  const maxCharsPerLine = 28;
  const words = message.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (test.length > maxCharsPerLine && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  const textW = Math.min(maxCharsPerLine * charWidth, Math.max(...lines.map(l => l.length)) * charWidth);
  const boxW = Math.min(260, Math.max(80, textW + padX * 2));
  const boxH = Math.max(28, lines.length * lineHeight + padY * 2);

  // Position: above and to the right of the general
  const triangleH = 10;
  const gap = 6;
  const boxX = x + 18;
  const boxY = y - boxH - gap - triangleH;

  const clampedX = Math.max(-380, Math.min(380 - boxW, boxX));
  const clampedY = Math.max(-380, Math.min(380 - boxH, boxY));

  // Right triangle: 90° at top-left, pointing down toward general
  const triOffset = 5;
  const triW = 12;
  const triX = clampedX + triOffset;
  const triY = clampedY + boxH;

  return (
    <g opacity={visible ? 1 : 0} style={{ transition: 'opacity 0.25s' }}>
      <rect
        x={clampedX}
        y={clampedY}
        width={boxW}
        height={boxH}
        rx={6}
        fill="white"
        stroke="#cbd5e1"
        strokeWidth={1.5}
        pointerEvents="none"
      />
      <polygon
        points={`${triX},${triY} ${triX + triW},${triY} ${triX},${triY + triangleH}`}
        fill="white"
        stroke="none"
        pointerEvents="none"
      />
      <line
        x1={triX} y1={triY + triangleH}
        x2={triX + triW} y2={triY}
        stroke="#cbd5e1" strokeWidth={1.5}
        pointerEvents="none"
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={clampedX + padX}
          y={clampedY + padY + (i + 1) * lineHeight - 4}
          textAnchor="start"
          fill="#1e293b"
          fontSize={fontSize}
          fontWeight={600}
          fontFamily="sans-serif"
          pointerEvents="none"
        >
          {line}
        </text>
      ))}
    </g>
  );
}
