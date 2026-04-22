import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, SafeAreaView, StatusBar,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Rect, Circle } from 'react-native-svg';
import { SK, SketchCircle, SketchHatch, SketchCheck } from './sketch';

const { width: SCREEN_W } = Dimensions.get('window');

// viewBox kept identical to the wireframe so all math transfers directly
const VB_W = 376;
const VB_H = 480; // extra 40px below 440 so bottom sparklines aren't clipped
const CX = 188, CY = 260, R = 92, ARC_R = 140;

// Synthesise a 7-element week array from done/total counts.
// Index 6 = today, index 0 = 6 days ago.
// We mark the most-recent 'done' days as completed.
function buildWeek(done, total) {
  const week = Array(7).fill(0);
  const days = Math.min(total, 7);
  for (let i = 0; i < days; i++) {
    week[6 - i] = i < done ? 1 : 0;
  }
  return week;
}

export default function RingScreen({ habits, onToggle, onAddPress }) {
  const doneCount = habits.filter(h => h.today_done).length;
  const total = habits.length;
  const pct = total > 0 ? doneCount / total : 0;

  // Progress arc endpoints (stop just before full circle to avoid arc collapse)
  const clampedPct = Math.min(pct, 0.9999);
  const arcStart = -Math.PI / 2;
  const arcEnd = arcStart + clampedPct * Math.PI * 2;
  const largeArc = pct > 0.5 ? 1 : 0;
  const ax1 = CX + Math.cos(arcStart) * ARC_R;
  const ay1 = CY + Math.sin(arcStart) * ARC_R;
  const ax2 = CX + Math.cos(arcEnd) * ARC_R;
  const ay2 = CY + Math.sin(arcEnd) * ARC_R;

  // Place habits evenly around the orbit circle
  const placed = habits.map((h, i) => {
    const a = -Math.PI / 2 + (i / total) * Math.PI * 2;
    return {
      ...h,
      week: buildWeek(h.done, h.total),
      x: CX + Math.cos(a) * R,
      y: CY + Math.sin(a) * R,
      angle: a,
    };
  });

  const now = new Date();
  const dateLabel = now
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toLowerCase()
    .replace(',', ' ·');

  const svgH = SCREEN_W * (VB_H / VB_W);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={SK.PAPER} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.dateTag}>{dateLabel}</Text>
        </View>

        <Svg width={SCREEN_W} height={svgH} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {/* Faint guide ring */}
          <SketchCircle cx={CX} cy={CY} r={ARC_R} stroke={SK.FAINT} strokeWidth={1} seed={1} />

          {/* Progress arc */}
          {pct > 0 && pct < 0.9999 && (
            <Path
              d={`M ${ax1.toFixed(1)} ${ay1.toFixed(1)} A ${ARC_R} ${ARC_R} 0 ${largeArc} 1 ${ax2.toFixed(1)} ${ay2.toFixed(1)}`}
              stroke={SK.ACCENT}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="2 4"
              opacity={0.85}
            />
          )}
          {pct >= 0.9999 && total > 0 && (
            <SketchCircle cx={CX} cy={CY} r={ARC_R} stroke={SK.ACCENT} strokeWidth={4} seed={99} />
          )}

          {/* Orbit guide circle */}
          <SketchCircle cx={CX} cy={CY} r={R} stroke={SK.FAINT} strokeWidth={0.9} seed={3} />

          {/* Center count */}
          <SvgText
            x={CX} y={CY - 8}
            textAnchor="middle"
            fontFamily="Caveat_700Bold"
            fontSize={78}
            fill={SK.INK}
          >
            {doneCount}
          </SvgText>
          <SvgText
            x={CX} y={CY + 24}
            textAnchor="middle"
            fontFamily="JetBrainsMono_400Regular"
            fontSize={11}
            letterSpacing={1.5}
            fill={SK.MUTED}
          >
            {`OF ${total} TODAY`}
          </SvgText>

          {/* Habit nodes */}
          {placed.map((h, i) => {
            const done = h.today_done;
            // Only the top-most node (sin < -0.7) flips its label above;
            // all others put the label below to avoid crossing the center digit.
            const above = Math.sin(h.angle) < -0.7;
            const labelY = above ? h.y - 20 : h.y + 32;
            const sparkY = above ? labelY - 16 : labelY + 6;

            return (
              <G key={h.id}>
                {done ? (
                  <>
                    <SketchCircle cx={h.x} cy={h.y} r={13} stroke={SK.ACCENT} strokeWidth={1.8} fill="none" seed={i + 10} />
                    <SketchHatch x={h.x - 11} y={h.y - 11} w={22} h={22} stroke={SK.ACCENT} spacing={3} seed={i + 30} opacity={0.4} />
                    <SketchCheck cx={h.x} cy={h.y} size={6} stroke={SK.ACCENT} strokeWidth={2} seed={i + 40} />
                  </>
                ) : (
                  <SketchCircle cx={h.x} cy={h.y} r={13} stroke={SK.INK} strokeWidth={1.4} fill={SK.PAPER} seed={i + 10} />
                )}

                <SvgText
                  x={h.x} y={labelY}
                  textAnchor="middle"
                  fontFamily="Caveat_700Bold"
                  fontSize={18}
                  fill={done ? SK.MUTED : SK.INK}
                >
                  {h.name}
                </SvgText>

                {/* 7-day sparkline */}
                <G transform={`translate(${h.x - 17}, ${sparkY})`}>
                  {h.week.map((d, k) => (
                    <Rect
                      key={k}
                      x={k * 5}
                      y={d ? 0 : 2}
                      width={3}
                      height={d ? 6 : 1.5}
                      fill={d ? SK.ACCENT : SK.FAINT}
                      rx={0.5}
                    />
                  ))}
                </G>

                {/* Invisible 30px touch target over node */}
                <Circle
                  cx={h.x} cy={h.y} r={30}
                  fill="transparent"
                  onPress={() => onToggle(h.id, done)}
                />
              </G>
            );
          })}
        </Svg>

        <View style={styles.footer}>
          <Text style={styles.footerTag}>tap a node to toggle</Text>
          <TouchableOpacity style={styles.addPill} onPress={onAddPress} activeOpacity={0.7}>
            <Text style={styles.addPillText}>+ habit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SK.PAPER,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 0,
  },
  dateTag: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: SK.MUTED,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  footerTag: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: SK.MUTED,
  },
  addPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.6,
    borderColor: SK.INK,
    borderRadius: 3,
  },
  addPillText: {
    fontFamily: 'Kalam_400Regular',
    fontSize: 15,
    color: SK.INK,
    lineHeight: 18,
  },
});
