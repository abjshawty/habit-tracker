import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, ActivityIndicator } from 'react-native';

// On a physical device, replace with your machine's local IP e.g. 'http://192.168.1.x:8080'
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function App() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHabits = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/habits`);
      const data = await res.json();
      setHabits(data ?? []);
    } catch (e) {
      console.error('Failed to fetch habits:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (id, currentCompleted) => {
    try {
      await fetch(`${API_BASE}/api/toggles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: id, completed: !currentCompleted }),
      });
      fetchHabits();
    } catch (e) {
      console.error('Failed to toggle habit:', e);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Habit Tracker</Text>
      <FlatList
        data={habits}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const todayDone = item.done > 0; // simplistic: treat done > 0 as toggled today
          return (
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.progress}>{item.done}/{item.total} this week</Text>
              </View>
              <Button
                title={todayDone ? 'Undo' : 'Done'}
                onPress={() => toggleHabit(item.id, todayDone)}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20, backgroundColor: '#fff' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  info:      { flex: 1 },
  name:      { fontSize: 16, fontWeight: '600' },
  progress:  { fontSize: 13, color: '#888', marginTop: 2 },
});
