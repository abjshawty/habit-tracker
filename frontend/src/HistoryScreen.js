import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import Svg, { G } from 'react-native-svg';
import { SK, SketchCircle, SketchHatch, SketchCheck } from './sketch';

const { width: SCREEN_W } = Dimensions.get('window');
const PADDING = 24;
const NAME_W = 100;
const GRID_W = SCREEN_W - PADDING * 2 - NAME_W;
const CELL_W = GRID_W / 7;
const ROW_H = 52;
const NODE_R = Math.min(11, CELL_W / 2 - 2);

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Returns the 7 Date objects for the week at `offset` (0 = current week).
function getWeekDays(offset) {
  const today = new Date();
  // Sunday = 0 in JS; normalise to ISO Mon=1 … Sun=7
  const dow = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtDate(d) {
  // Local YYYY-MM-DD without UTC shift
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtWeekRange(days) {
  const opts = { month: 'short', day: 'numeric' };
  return `${days[0].toLocaleDateString('en-US', opts)} – ${days[6].toLocaleDateString('en-US', opts)}`;
}

export default function HistoryScreen({ habits, onBack }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = getWeekDays(weekOffset);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = fmtDate(today);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={SK.PAPER} />
      <SafeAreaView style={styles.safeArea}>

        {/* Back */}
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTag}>← back to ring</Text>
        </TouchableOpacity>

        {/* Week navigator */}
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={() => setWeekOffset(o => o - 1)}
            disabled={weekOffset <= -3}
            activeOpacity={0.7}
            style={styles.navBtn}
          >
            <Text style={[styles.navArrow, weekOffset <= -3 && styles.navArrowDisabled]}>←</Text>
          </TouchableOpacity>

          <Text style={styles.weekLabel}>{fmtWeekRange(weekDays)}</Text>

          <TouchableOpacity
            onPress={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= 0}
            activeOpacity={0.7}
            style={styles.navBtn}
          >
            <Text style={[styles.navArrow, weekOffset >= 0 && styles.navArrowDisabled]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Column headers */}
        <View style={styles.colHeaders}>
          <View style={{ width: NAME_W }} />
          {weekDays.map((d, i) => {
            const isToday = fmtDate(d) === todayStr;
            return (
              <View key={i} style={{ width: CELL_W, alignItems: 'center' }}>
                <Text style={[styles.colLabel, isToday && styles.colLabelToday]}>
                  {DAY_LABELS[i]}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* Rows */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {habits.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>no habits yet</Text>
            </View>
          )}

          {habits.map((h, hi) => (
            <View key={h.id} style={styles.habitRow}>
              <Text style={styles.habitName} numberOfLines={1}>{h.name}</Text>

              <Svg width={GRID_W} height={ROW_H} viewBox={`0 0 ${GRID_W} ${ROW_H}`}>
                {weekDays.map((d, di) => {
                  const key = fmtDate(d);
                  const done = h.log?.[key] === true;
                  const isFuture = d > today;
                  const isToday = key === todayStr;
                  const cx = di * CELL_W + CELL_W / 2;
                  const cy = ROW_H / 2;
                  // Unique seeds per cell — large enough to not collide with ring screen seeds
                  const baseSeed = hi * 100 + di + 500;

                  if (isFuture) return null;

                  return (
                    <G key={key}>
                      {done ? (
                        <>
                          <SketchCircle
                            cx={cx} cy={cy} r={NODE_R}
                            stroke={SK.ACCENT} strokeWidth={1.8}
                            fill="none" seed={baseSeed}
                          />
                          <SketchHatch
                            x={cx - NODE_R + 1} y={cy - NODE_R + 1}
                            w={(NODE_R - 1) * 2} h={(NODE_R - 1) * 2}
                            stroke={SK.ACCENT} spacing={3}
                            seed={baseSeed + 200} opacity={0.4}
                          />
                          <SketchCheck
                            cx={cx} cy={cy} size={5}
                            stroke={SK.ACCENT} strokeWidth={2}
                            seed={baseSeed + 400}
                          />
                        </>
                      ) : (
                        <SketchCircle
                          cx={cx} cy={cy} r={NODE_R}
                          stroke={isToday ? SK.INK : SK.FAINT}
                          strokeWidth={isToday ? 1.4 : 0.9}
                          fill="none" seed={baseSeed}
                        />
                      )}
                    </G>
                  );
                })}
              </Svg>
            </View>
          ))}
        </ScrollView>
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
  backBtn: {
    paddingHorizontal: PADDING,
    paddingTop: 18,
    paddingBottom: 8,
  },
  backTag: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: SK.MUTED,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingVertical: 6,
  },
  navBtn: {
    padding: 4,
  },
  navArrow: {
    fontFamily: 'Kalam_400Regular',
    fontSize: 20,
    color: SK.INK,
  },
  navArrowDisabled: {
    color: SK.FAINT,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Caveat_700Bold',
    fontSize: 22,
    color: SK.INK,
  },
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingTop: 8,
    paddingBottom: 6,
  },
  colLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: SK.MUTED,
  },
  colLabelToday: {
    color: SK.ACCENT,
  },
  divider: {
    height: 1,
    marginHorizontal: PADDING,
    backgroundColor: SK.FAINT,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    height: ROW_H + 10,
    borderBottomWidth: 1,
    borderBottomColor: SK.FAINT,
  },
  habitName: {
    width: NAME_W,
    fontFamily: 'Caveat_700Bold',
    fontSize: 18,
    color: SK.INK,
    paddingRight: 6,
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: SK.MUTED,
  },
});
