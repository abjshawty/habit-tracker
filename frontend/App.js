import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Kalam_400Regular, Kalam_700Bold } from '@expo-google-fonts/kalam';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

import RingScreen from './src/RingScreen';
import AddHabitScreen from './src/AddHabitScreen';
import HistoryScreen from './src/HistoryScreen';

// On a physical device, replace with your machine's local IP e.g. 'http://192.168.1.x:8080'
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function App() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('today'); // 'today' | 'add' | 'history'
  const [historyData, setHistoryData] = useState([]);

  const [fontsLoaded] = useFonts({
    Caveat_700Bold,
    Kalam_400Regular,
    Kalam_700Bold,
    JetBrainsMono_400Regular,
  });

  const fetchHabits = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/habits`);
      const data = await res.json();
      setHabits(data ?? []);
    } catch (e) {
      console.error(`Failed to fetch habits from ${API_BASE}/api/habits:`, e);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (id, currentlyDone) => {
    // Optimistic update so the ring reacts instantly
    setHabits(prev =>
      prev.map(h => h.id === id ? { ...h, today_done: !currentlyDone } : h)
    );
    try {
      await fetch(`${API_BASE}/api/toggles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: id, completed: !currentlyDone }),
      });
      fetchHabits();
    } catch (e) {
      console.error('Failed to toggle habit:', e);
      // Revert on network failure
      setHabits(prev =>
        prev.map(h => h.id === id ? { ...h, today_done: currentlyDone } : h)
      );
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history`);
      const data = await res.json();
      setHistoryData(data ?? []);
    } catch (e) {
      console.error(`Failed to fetch history from ${API_BASE}/api/history:`, e);
    }
  };

  const addHabit = async (name) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await fetchHabits();
        setScreen('today');
      }
    } catch (e) {
      console.error('Failed to add habit:', e);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3d8c7c" />
      </View>
    );
  }

  if (screen === 'add') {
    return (
      <AddHabitScreen
        habits={habits}
        onBack={() => setScreen('today')}
        onAdd={addHabit}
      />
    );
  }

  if (screen === 'history') {
    return (
      <HistoryScreen
        habits={historyData}
        onBack={() => setScreen('today')}
      />
    );
  }

  return (
    <RingScreen
      habits={habits}
      onToggle={toggleHabit}
      onAddPress={() => setScreen('add')}
      onHistoryPress={() => { setScreen('history'); fetchHistory(); }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f3ef',
  },
});
