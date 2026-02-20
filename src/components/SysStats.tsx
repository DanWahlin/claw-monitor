import React from 'react';
import { Box, Text } from 'ink';
import type { SysStats } from '../hooks/useSysStats.js';
import { WARN_THRESHOLD, CRIT_THRESHOLD, BAR_WIDTH } from '../utils/config.js';
import { fit } from '../utils/cronUtils.js';

interface SysStatsProps {
  stats: SysStats;
  boxWidth: number;
}

/** Extract the k3s/k8s label from a container name like "pod-name (k3s)" */
function k8sLabelFromName(name: string): string {
  const m = name.match(/\((k[38]s)\)$/);
  return m ? m[1] : 'k8s';
}

function barColor(percent: number): string {
  if (percent >= CRIT_THRESHOLD) return 'red';
  if (percent >= WARN_THRESHOLD) return 'yellow';
  return 'green';
}

// Render a compact bar string: "LABEL [████░░░░] pct%  detail"
function barLine(
  label: string,
  percent: number,
  detail: string,
  barWidth: number,
  colWidth: number,
): { chars: JSX.Element; length: number } {
  const filled = Math.round((percent / 100) * barWidth);
  const empty = barWidth - filled;
  const color = barColor(percent);
  const pctStr = `${percent}%`.padStart(4);

  // "LABEL [████░░] pct%  detail"
  const fixedLen = label.length + 1 + 1 + barWidth + 1 + 1 + pctStr.length + 2;
  const maxDetail = Math.max(0, colWidth - fixedLen);
  const trimDetail = detail.length > maxDetail
    ? (maxDetail > 1 ? detail.substring(0, maxDetail - 1) + '~' : '')
    : detail;
  const textLen = fixedLen + trimDetail.length;
  const pad = Math.max(0, colWidth - textLen);

  const el = (
    <>
      <Text bold>{label}</Text>
      <Text>{' '}</Text>
      <Text dimColor>{'['}</Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text dimColor>{']'}</Text>
      <Text>{' '}</Text>
      <Text bold color={color}>{pctStr}</Text>
      <Text>{'  '}</Text>
      <Text dimColor>{trimDetail}</Text>
      <Text>{' '.repeat(pad)}</Text>
    </>
  );

  return { chars: el, length: Math.max(textLen, colWidth) };
}

export function SysStatsSection({ stats, boxWidth }: SysStatsProps) {
  // Two columns inside the box.  Layout per row:
  //   │(border, not counted) + "  " (2) + left (leftW) + " │ " (3) + right (rightW) + │(border)
  // So leftW + rightW + 5 must equal boxWidth.
  const leftW = Math.floor((boxWidth - 5) / 2);
  const rightW = boxWidth - 5 - leftW;
  const barW = Math.max(8, Math.min(BAR_WIDTH, Math.floor(leftW * 0.45)));

  const cpuDetail = `${stats.cpu.cores} cores`;
  const memDetail = `${stats.mem.usedGB}/${stats.mem.totalGB} GB`;
  const diskDetail = `${stats.disk.usedGB}/${stats.disk.totalGB} GB`;

  const gpuDetail = stats.gpu
    ? `${stats.gpu.memUsedMB}/${stats.gpu.memTotalMB} MB`
    : '';

  // Build left-column rows (resource bars)
  const leftRows: { label: string; percent: number; detail: string }[] = [
    { label: 'CPU ', percent: stats.cpu.percent, detail: cpuDetail },
    { label: 'MEM ', percent: stats.mem.percent, detail: memDetail },
    { label: 'DISK', percent: stats.disk.percent, detail: diskDetail },
  ];
  if (stats.gpu) {
    leftRows.push({ label: 'GPU ', percent: stats.gpu.percent, detail: gpuDetail });
  }

  // Build right-column rows (docker/k8s containers)
  const hasDocker = stats.docker.available && stats.docker.running > 0;
  const nameW = Math.max(8, Math.floor(rightW * 0.55));

  const dockerHdr = hasDocker
    ? `${stats.docker.running} container${stats.docker.running !== 1 ? 's' : ''}`
    : '';

  const maxRows = Math.max(leftRows.length, hasDocker ? 1 + stats.docker.containers.length : 0);

  // Build display rows: interleave blank spacer lines between left-column bars,
  // while right-column rows flow continuously.
  type RowEntry = { leftIdx: number | null; rightIdx: number; isSpacer: boolean };
  const displayRows: RowEntry[] = [];
  let rightCursor = 0;

  for (let li = 0; li < leftRows.length; li++) {
    // Spacer before each bar (except the first)
    if (li > 0) {
      displayRows.push({ leftIdx: null, rightIdx: rightCursor, isSpacer: true });
      rightCursor++;
    }
    displayRows.push({ leftIdx: li, rightIdx: rightCursor, isSpacer: false });
    rightCursor++;
  }
  // Any remaining right-column rows that didn't pair with a left bar
  const rightTotal = hasDocker ? 1 + stats.docker.containers.length : 0;
  while (rightCursor < rightTotal) {
    displayRows.push({ leftIdx: null, rightIdx: rightCursor, isSpacer: false });
    rightCursor++;
  }

  function renderRightCol(rIdx: number): JSX.Element {
    if (!hasDocker || rIdx >= rightTotal) return <Text>{' '.repeat(rightW)}</Text>;

    if (rIdx === 0) {
      // 🐳 is 2 visual cols + 1 space = 3 visual cols, but only 2 JS chars
      const rPad = Math.max(0, rightW - dockerHdr.length - 3);
      return (
        <>
          <Text>{'🐳 '}</Text>
          <Text dimColor>{dockerHdr}</Text>
          <Text>{' '.repeat(rPad)}</Text>
        </>
      );
    }
    const c = stats.docker.containers[rIdx - 1];
    if (!c) return <Text>{' '.repeat(rightW)}</Text>;
    // Ensure (k3s)/(k8s) suffix is always visible after the name
    const suffix = c.source === 'k8s' ? ` (${k8sLabelFromName(c.name)})` : '';
    const baseName = suffix ? c.name.replace(/\s*\(k[38]s\)$/, '') : c.name;
    const nameAvail = nameW - suffix.length;
    const cName = nameAvail > 3
      ? fit(baseName, nameAvail) + suffix
      : fit(c.name, nameW);
    const paddedName = cName.padEnd(nameW);
    const statusMax = Math.max(1, rightW - nameW - 1);
    const cStatus = c.status.length > statusMax ? c.status.substring(0, statusMax - 1) + '~' : c.status;
    const rowStr = `${paddedName} ${cStatus}`;
    const rPad = Math.max(0, rightW - rowStr.length);
    return (
      <>
        <Text>{paddedName}</Text>
        <Text>{' '}</Text>
        <Text dimColor>{cStatus}</Text>
        <Text>{' '.repeat(rPad)}</Text>
      </>
    );
  }

  return (
    <Box flexDirection="column">
      {displayRows.map((row, i) => (
        <Text key={i}>
          <Text dimColor>{'│  '}</Text>
          {row.leftIdx !== null
            ? barLine(leftRows[row.leftIdx].label, leftRows[row.leftIdx].percent, leftRows[row.leftIdx].detail, barW, leftW).chars
            : <Text>{' '.repeat(leftW)}</Text>
          }
          <Text dimColor>{' │ '}</Text>
          {renderRightCol(row.rightIdx)}
          <Text dimColor>{'│'}</Text>
        </Text>
      ))}

      {/* Warnings from failed stat commands */}
      {stats.warnings.length > 0 && (
        <>
          <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
          {stats.warnings.map((w, i) => {
            const warnText = `  ⚠ ${w}`;
            const wPad = Math.max(0, boxWidth - warnText.length);
            return (
              <Text key={i}>
                <Text dimColor>{'│'}</Text>
                <Text color="yellow">{warnText}</Text>
                <Text dimColor>{' '.repeat(wPad) + '│'}</Text>
              </Text>
            );
          })}
        </>
      )}
    </Box>
  );
}
