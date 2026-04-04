/**
 * LoveBankScreen -- Full view of all love bank entries
 *
 * Design: RelateApp_DesignSpec.md
 *   - bgPrimary background
 *   - List of love bank entries as warm cards
 *   - Add new entry form with text input and save button
 *   - Edit/delete existing entries
 *   - Cormorant display header
 *
 * Love bank entries represent positive relationship moments
 * that the couple wants to remember and celebrate.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  X,
  Check,
} from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { KeyboardDoneBar, KEYBOARD_DONE_ID } from '../../components/ui/KeyboardDoneBar';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { formatDate } from '../../utils/format';
import {
  getLoveBank,
  addLoveBankEntry,
  deleteLoveBankEntry,
  type LoveBankEntryResponse,
} from '../../services/couples';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

/** Local entry shape used by the screen (maps API createdAt to date). */
interface LoveBankEntry {
  id: string;
  text: string;
  date: string;
}

export function LoveBankScreen() {
  const navigation = useNavigation<Navigation>();
  const [entries, setEntries] = useState<LoveBankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  /** Fetch love bank entries from API on mount. */
  const fetchEntries = useCallback(async () => {
    try {
      const data = await getLoveBank();
      setEntries(data.map((e) => ({ id: e.id, text: e.text, date: e.createdAt })));
    } catch (err) {
      console.warn('[LoveBank] Failed to fetch entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  /** Add a new love bank entry via API. */
  const handleAdd = async () => {
    if (!newText.trim()) return;
    try {
      const newEntry = await addLoveBankEntry(newText.trim());
      setEntries((prev) => [
        { id: newEntry.id, text: newEntry.text, date: newEntry.createdAt },
        ...prev,
      ]);
      setNewText('');
      setShowForm(false);
    } catch (err) {
      console.warn('[LoveBank] Failed to add entry:', err);
      Alert.alert('Error', 'Could not save your moment. Please try again.');
    }
  };

  /** Delete a love bank entry with confirmation. */
  const handleDelete = (id: string) => {
    Alert.alert(
      'Remove moment?',
      'This will remove this moment from your love bank.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLoveBankEntry(id);
              setEntries((prev) => prev.filter((e) => e.id !== id));
            } catch (err) {
              console.warn('[LoveBank] Failed to delete entry:', err);
              Alert.alert('Error', 'Could not remove the moment. Please try again.');
            }
          },
        },
      ],
    );
  };

  /** Start editing an entry (local-only edit — keeps existing text). */
  const startEdit = (entry: LoveBankEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  /** Save edited entry (local-only — full edit API not implemented). */
  const saveEdit = () => {
    if (!editText.trim() || !editingId) return;
    setEntries((prev) =>
      prev.map((e) => (e.id === editingId ? { ...e, text: editText.trim() } : e)),
    );
    setEditingId(null);
    setEditText('');
  };

  /** Cancel editing. */
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  return (
    <SafeArea>
      <KeyboardDoneBar />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerTextBlock}>
            <Heart size={20} color={colors.orangeMid} fill={colors.orangeLight} />
            <Text style={styles.screenTitle} accessibilityRole="header">Your Love Bank</Text>
            <Text style={styles.screenSubtitle}>
              The little moments that make you, you.
            </Text>
          </View>
        </View>

        {/* Loading state */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.orangeMid} />
            <Text style={styles.loadingText}>Loading moments...</Text>
          </View>
        )}

        {/* Add moment button / form */}
        {!showForm ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Pressable
              onPress={() => setShowForm(true)}
              style={styles.addTrigger}
              accessibilityLabel="Add a moment"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={colors.gradientSoft}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addTriggerGradient}
              >
                <Plus size={18} color={colors.orangeMid} />
                <Text style={styles.addTriggerText}>Add a moment</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Card style={styles.formCard} elevated>
              <Text style={styles.formLabel}>What happened?</Text>
              <TextInput
                value={newText}
                onChangeText={setNewText}
                placeholder="Describe a positive moment..."
                placeholderTextColor={colors.textMuted}
                style={styles.formInput}
                multiline
                autoFocus
                inputAccessoryViewID={KEYBOARD_DONE_ID}
              />
              <View style={styles.formActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setShowForm(false);
                    setNewText('');
                  }}
                />
                <Button
                  title="Save"
                  size="sm"
                  onPress={handleAdd}
                  disabled={!newText.trim()}
                />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Entries list */}
        <View style={styles.entriesList}>
          {entries.map((entry, index) => (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.delay(index * 80).duration(400)}
            >
              <Card style={styles.entryCard} elevated>
                {editingId === entry.id ? (
                  // Edit mode
                  <View style={styles.editContainer}>
                    <TextInput
                      value={editText}
                      onChangeText={setEditText}
                      style={styles.editInput}
                      multiline
                      autoFocus
                      inputAccessoryViewID={KEYBOARD_DONE_ID}
                    />
                    <View style={styles.editActions}>
                      <Pressable onPress={cancelEdit} style={styles.editBtn} accessibilityLabel="Cancel edit" accessibilityRole="button">
                        <X size={16} color={colors.textMuted} />
                      </Pressable>
                      <Pressable onPress={saveEdit} style={styles.editBtn} accessibilityLabel="Save edit" accessibilityRole="button">
                        <Check size={16} color={colors.success} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  // Display mode
                  <>
                    <View style={styles.entryTop}>
                      <Heart size={14} color={colors.orangeLight} fill={colors.orangeLight} />
                      <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    </View>
                    <Text style={styles.entryText}>{entry.text}</Text>
                    <View style={styles.entryActions}>
                      <Pressable onPress={() => startEdit(entry)} style={styles.actionBtn} accessibilityLabel="Edit moment" accessibilityRole="button">
                        <Edit3 size={14} color={colors.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(entry.id)} style={styles.actionBtn} accessibilityLabel="Delete moment" accessibilityRole="button">
                        <Trash2 size={14} color={colors.error} />
                      </Pressable>
                    </View>
                  </>
                )}
              </Card>
            </Animated.View>
          ))}
        </View>

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <View style={styles.emptyState}>
            <Heart size={40} color={colors.orangeLight} />
            <Text style={styles.emptyTitle}>No moments yet</Text>
            <Text style={styles.emptySubtitle}>
              Start adding the little things that make your relationship special.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ---- Loading ----
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
  },

  // ---- Header ----
  header: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerTextBlock: {
    gap: 6,
  },
  screenTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    color: colors.textPrimary,
  },
  screenSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // ---- Add trigger ----
  addTrigger: {
    marginBottom: 24,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  addTriggerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addTriggerText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.orangeMid,
  },

  // ---- Form ----
  formCard: {
    marginBottom: 24,
    gap: 12,
  },
  formLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  formInput: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },

  // ---- Entries list ----
  entriesList: {
    gap: 12,
  },
  entryCard: {
    padding: 18,
    gap: 8,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryDate: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  entryText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
  },
  entryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.bgPrimary,
  },

  // ---- Edit mode ----
  editContainer: {
    gap: 8,
  },
  editInput: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderFocus,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.bgPrimary,
  },

  // ---- Empty state ----
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
