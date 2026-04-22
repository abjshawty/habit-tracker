import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, SafeAreaView,
  StatusBar, ScrollView,
} from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { SK, SketchCircle } from './sketch';

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_HABITS = 8;
const STARTERS = ['Walk', 'Water', 'Floss', 'Stretch', 'No screens'];

export default function AddHabitScreen({ habits, onBack, onAdd }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const atLimit = habits.length >= MAX_HABITS;
  const previewCount = habits.length + 1; // existing + new slot

  // Mini ring preview — existing habits as solid nodes, new one dashed
  const previewCX = 140, previewCY = 110, previewR = 80;
  const existingNodes = habits.slice(0, MAX_HABITS - 1).map((_, i) => {
    const a = -Math.PI / 2 + (i / previewCount) * Math.PI * 2;
    return { x: previewCX + Math.cos(a) * previewR, y: previewCY + Math.sin(a) * previewR, i };
  });
  const newAngle = -Math.PI / 2 + ((previewCount - 1) / previewCount) * Math.PI * 2;
  const newX = previewCX + Math.cos(newAngle) * previewR;
  const newY = previewCY + Math.sin(newAngle) * previewR;

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting || atLimit) return;
    setSubmitting(true);
    await onAdd(trimmed);
    setSubmitting(false);
    setName('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={SK.PAPER} />
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTag}>← back to ring</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Mini ring preview */}
          <View style={styles.previewWrap}>
            <Svg width={280} height={220} viewBox="0 0 280 220">
              <SketchCircle cx={previewCX} cy={previewCY} r={previewR} stroke={SK.FAINT} strokeWidth={1} seed={5} />

              {existingNodes.map(n => (
                <SketchCircle key={n.i} cx={n.x} cy={n.y} r={11} stroke={SK.INK} strokeWidth={1.2} seed={n.i + 20} />
              ))}

              {/* New node — dashed accent circle */}
              <Circle
                cx={newX} cy={newY} r={13}
                fill="none"
                stroke={SK.ACCENT}
                strokeWidth={1.8}
                strokeDasharray="3 3"
              />
              <SvgText
                x={newX} y={newY + 7}
                textAnchor="middle"
                fontFamily="Caveat_700Bold"
                fontSize={20}
                fill={SK.ACCENT}
              >
                +
              </SvgText>

              {/* Center count */}
              <SvgText
                x={previewCX} y={previewCY + 10}
                textAnchor="middle"
                fontFamily="Caveat_700Bold"
                fontSize={28}
                fill={SK.INK}
              >
                {previewCount}
              </SvgText>
            </Svg>
          </View>

          {/* Input */}
          <View style={styles.formWrap}>
            <Text style={styles.formTag}>what should we add?</Text>

            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Stretch"
                placeholderTextColor={SK.FAINT}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                editable={!atLimit}
              />
              <View style={styles.inputUnderline} />
            </View>

            {/* Starter pills */}
            <View style={styles.starterSection}>
              <Text style={styles.formTag}>or pick a starter</Text>
              <View style={styles.pills}>
                {STARTERS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pill, name === s && styles.pillActive]}
                    onPress={() => setName(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, name === s && styles.pillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.limitTag}>
            {atLimit ? 'ring is full (8 max)' : 'max 8 habits fit in the ring'}
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, (!name.trim() || atLimit || submitting) && styles.addBtnDisabled]}
            onPress={handleAdd}
            activeOpacity={0.7}
            disabled={!name.trim() || atLimit || submitting}
          >
            <Text style={styles.addBtnText}>{submitting ? '…' : 'add'}</Text>
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
  backBtn: {
    paddingHorizontal: 24,
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
  scroll: {
    paddingBottom: 16,
  },
  previewWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  formWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  formTag: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: SK.MUTED,
  },
  inputWrap: {
    marginTop: 10,
    marginBottom: 8,
  },
  input: {
    fontFamily: 'Caveat_700Bold',
    fontSize: 28,
    color: SK.INK,
    paddingBottom: 8,
    paddingTop: 0,
  },
  inputUnderline: {
    height: 1.6,
    backgroundColor: SK.INK,
    borderRadius: 1,
  },
  starterSection: {
    marginTop: 32,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.6,
    borderColor: SK.INK,
    borderRadius: 3,
  },
  pillActive: {
    backgroundColor: SK.INK,
  },
  pillText: {
    fontFamily: 'Kalam_400Regular',
    fontSize: 15,
    color: SK.INK,
    lineHeight: 18,
  },
  pillTextActive: {
    color: SK.PAPER,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: SK.FAINT,
  },
  limitTag: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: SK.MUTED,
  },
  addBtn: {
    width: 80,
    height: 36,
    backgroundColor: SK.INK,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.35,
  },
  addBtnText: {
    fontFamily: 'Kalam_700Bold',
    fontSize: 16,
    color: SK.PAPER,
  },
});
