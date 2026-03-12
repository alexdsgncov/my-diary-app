import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert, Share, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, Menu, LayoutGrid, Plus, Home, Bookmark, Heart, MoreHorizontal, X, Check, Trash2, ChevronLeft, ChevronRight, Settings, Info, FileText, Share2, Download, Upload, Globe } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

type DiaryEntry = {
  id: string;
  title: string;
  content: string;
  date: string;
  emoji: string;
  isDraft?: boolean;
  isFavorite?: boolean;
  isBookmarked?: boolean;
};

const COLORS = {
  black: '#000000',
  darkGrey: '#121212',
  cardGrey: '#1c1c1c',
  textMuted: '#a0a0a0',
  accent: '#ffffff',
  red: '#ef4444',
  blue: '#60a5fa',
  green: '#4ade80',
  yellow: '#facc15'
};

const EMOJIS = ['📝', '☀️', '🌙', '🌧️', '🎉', '😔', '🤔', '❤️', '🍂', '☕', '💡', '🚀', '⭐', '🔥', '🌿'];

const DAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
};

const T = {
  en: {
    title: 'MY DIARY',
    daily: 'Daily',
    searchPlaceholder: 'Search entries...',
    settings: 'Settings',
    theme: 'Theme',
    themeDesc: 'Dark mode is currently active',
    about: 'About',
    exportBackup: 'Export Backup',
    exportDesc: 'Save all entries to a file',
    importBackup: 'Import Backup',
    importDesc: 'Restore entries from a file',
    clearAll: 'Clear All Data',
    clearDesc: 'Delete all diary entries',
    titlePlaceholder: 'Title...',
    contentPlaceholder: 'Write your thoughts...',
    saveDraft: 'Save as Draft',
    confirmDelete: 'Are you sure you want to delete this entry?',
    cancel: 'Cancel',
    delete: 'Delete',
    error: 'Error',
    shareError: 'Could not share entry',
    exportError: 'Could not export backup',
    importError: 'Could not read backup file',
    invalidFormat: 'Invalid backup format',
    restoreBackup: 'Restore Backup',
    restore: 'Restore',
    foundBackup: (n: number) => `Found ${n} entries. Replace current diary?`,
    clearConfirm: 'Delete all entries?',
    language: 'Language',
    languageDesc: 'English',
    untitled: 'Untitled'
  },
  ru: {
    title: 'МОЙ ДНЕВНИК',
    daily: 'Дни',
    searchPlaceholder: 'Поиск записей...',
    settings: 'Настройки',
    theme: 'Тема',
    themeDesc: 'Темная тема активна',
    about: 'О приложении',
    exportBackup: 'Экспорт данных',
    exportDesc: 'Сохранить все записи в файл',
    importBackup: 'Импорт данных',
    importDesc: 'Восстановить записи из файла',
    clearAll: 'Очистить все данные',
    clearDesc: 'Удалить все записи дневника',
    titlePlaceholder: 'Заголовок...',
    contentPlaceholder: 'Напишите свои мысли...',
    saveDraft: 'В черновики',
    confirmDelete: 'Вы уверены, что хотите удалить эту запись?',
    cancel: 'Отмена',
    delete: 'Удалить',
    error: 'Ошибка',
    shareError: 'Не удалось поделиться записью',
    exportError: 'Не удалось экспортировать данные',
    importError: 'Не удалось прочитать файл',
    invalidFormat: 'Неверный формат файла',
    restoreBackup: 'Восстановление',
    restore: 'Восстановить',
    foundBackup: (n: number) => `Найдено ${n} записей. Заменить текущий дневник?`,
    clearConfirm: 'Удалить все записи?',
    language: 'Язык',
    languageDesc: 'Русский',
    untitled: 'Без названия'
  }
};

export default function App() {
  const [lang, setLang] = useState<'en' | 'ru'>('ru');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [activeNav, setActiveNav] = useState<'home' | 'bookmarks' | 'favorites' | 'more'>('home');
  const [homeTab, setHomeTab] = useState<'daily' | 'search'>('daily');
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | 'new' | null>(null);
  const [editForm, setEditForm] = useState<Partial<DiaryEntry>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const t = T[lang];

  useEffect(() => {
    loadSettings();
    loadEntries();
  }, []);

  const loadSettings = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('diary_lang');
      if (savedLang === 'en' || savedLang === 'ru') setLang(savedLang);
    } catch (e) {}
  };

  const toggleLang = async () => {
    const newLang = lang === 'en' ? 'ru' : 'en';
    setLang(newLang);
    await AsyncStorage.setItem('diary_lang', newLang);
  };

  const loadEntries = async () => {
    try {
      const saved = await AsyncStorage.getItem('diary_entries');
      if (saved) setEntries(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load entries', e);
    }
  };

  const saveEntries = async (newEntries: DiaryEntry[]) => {
    try {
      await AsyncStorage.setItem('diary_entries', JSON.stringify(newEntries));
      setEntries(newEntries);
    } catch (e) {
      console.error('Failed to save entries', e);
    }
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries]);

  const publishedEntries = useMemo(() => sortedEntries.filter(e => !e.isDraft), [sortedEntries]);

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatDateLabel = (isoString: string) => {
    const d = new Date(isoString);
    const dayName = DAYS[lang][d.getDay()];
    const dateNum = d.getDate();
    
    if (lang === 'ru') return `${dayName}, ${dateNum}`;
    
    const suffix = dateNum % 10 === 1 && dateNum !== 11 ? 'st' : dateNum % 10 === 2 && dateNum !== 12 ? 'nd' : dateNum % 10 === 3 && dateNum !== 13 ? 'rd' : 'th';
    return `${dayName}, ${dateNum}${suffix}`;
  };

  const openEditor = (entry: DiaryEntry | 'new') => {
    setEditingEntry(entry);
    if (entry === 'new') {
      setEditForm({ title: '', content: '', emoji: '📝', isDraft: false, isFavorite: false, isBookmarked: false });
    } else {
      setEditForm({ ...entry });
    }
  };

  const closeEditor = () => {
    setEditingEntry(null);
    setEditForm({});
  };

  const handleSave = (asDraft = false) => {
    if (!editForm.title?.trim() && !editForm.content?.trim()) {
      closeEditor();
      return;
    }

    const newEntry: DiaryEntry = {
      id: editingEntry === 'new' ? Date.now().toString() : (editingEntry as DiaryEntry).id,
      title: editForm.title || t.untitled,
      content: editForm.content || '',
      date: editingEntry === 'new' ? new Date().toISOString() : (editingEntry as DiaryEntry).date,
      emoji: editForm.emoji || '📝',
      isDraft: asDraft,
      isFavorite: editForm.isFavorite || false,
      isBookmarked: editForm.isBookmarked || false,
    };

    const updatedEntries = editingEntry === 'new' 
      ? [newEntry, ...entries] 
      : entries.map(e => e.id === newEntry.id ? newEntry : e);
      
    saveEntries(updatedEntries);
    closeEditor();
  };

  const deleteEntry = (id: string) => {
    Alert.alert(t.delete, t.confirmDelete, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => {
        saveEntries(entries.filter(e => e.id !== id));
        closeEditor();
      }}
    ]);
  };

  const handleShare = async () => {
    const textToShare = `${editForm.emoji || '📝'} ${editForm.title || t.untitled}\n\n${editForm.content || ''}`;
    try {
      await Share.share({ message: textToShare });
    } catch (error) {
      Alert.alert(t.error, t.shareError);
    }
  };

  const handleExport = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + `diary_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(entries));
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert(t.error, t.exportError);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;
      
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const imported = JSON.parse(fileContent);
      
      if (Array.isArray(imported)) {
        Alert.alert(t.restoreBackup, t.foundBackup(imported.length), [
          { text: t.cancel, style: 'cancel' },
          { text: t.restore, onPress: () => saveEntries(imported) }
        ]);
      } else {
        Alert.alert(t.error, t.invalidFormat);
      }
    } catch (error) {
      Alert.alert(t.error, t.importError);
    }
  };

  const renderEntryCard = (entry: DiaryEntry) => (
    <TouchableOpacity 
      key={entry.id} 
      style={styles.card}
      onPress={() => openEditor(entry)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTime}>{formatTime(entry.date)}</Text>
        <Text style={styles.cardEmoji}>{entry.emoji}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{entry.title}</Text>
      <Text style={styles.cardContent} numberOfLines={2}>{entry.content}</Text>
    </TouchableOpacity>
  );

  const renderList = (list: DiaryEntry[]) => {
    const grouped: Record<string, DiaryEntry[]> = {};
    list.forEach(entry => {
      const key = formatDateLabel(entry.date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    return (
      <ScrollView style={styles.scrollView}>
        {Object.entries(grouped).map(([dateLabel, dayEntries]) => (
          <View key={dateLabel}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{dateLabel}</Text>
            </View>
            {dayEntries.map(renderEntryCard)}
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
      </View>

      {/* Main Content */}
      {activeNav === 'home' && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, homeTab === 'daily' && styles.tabActive]} onPress={() => setHomeTab('daily')}>
              <Text style={[styles.tabText, homeTab === 'daily' && styles.tabTextActive]}>{t.daily}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, homeTab === 'search' && styles.tabActive]} onPress={() => setHomeTab('search')}>
              <Search color={homeTab === 'search' ? COLORS.accent : COLORS.textMuted} size={20} />
            </TouchableOpacity>
          </View>
          
          {homeTab === 'daily' ? renderList(publishedEntries) : (
            <View>
              <TextInput 
                style={styles.searchInput}
                placeholder={t.searchPlaceholder}
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {renderList(publishedEntries.filter(e => e.title.includes(searchQuery) || e.content.includes(searchQuery)))}
            </View>
          )}
        </View>
      )}

      {activeNav === 'more' && (
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={styles.sectionTitle}>{t.settings}</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingsRow} onPress={toggleLang}>
              <Globe color={COLORS.yellow} size={24} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsText}>{t.language}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{t.languageDesc}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsRow} onPress={handleExport}>
              <Download color={COLORS.green} size={24} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsText}>{t.exportBackup}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{t.exportDesc}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsRow} onPress={handleImport}>
              <Upload color={COLORS.blue} size={24} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsText}>{t.importBackup}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{t.importDesc}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsRow} onPress={() => {
              Alert.alert(t.clearAll, t.clearConfirm, [
                { text: t.cancel, style: 'cancel' },
                { text: t.delete, style: 'destructive', onPress: () => saveEntries([]) }
              ]);
            }}>
              <Trash2 color={COLORS.red} size={24} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsText, { color: COLORS.red }]}>{t.clearAll}</Text>
                <Text style={{ color: COLORS.red, opacity: 0.7, fontSize: 12 }}>{t.clearDesc}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => openEditor('new')}>
        <Plus color={COLORS.black} size={32} />
      </TouchableOpacity>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => setActiveNav('home')}>
          <Home color={activeNav === 'home' ? COLORS.accent : COLORS.textMuted} size={28} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveNav('bookmarks')}>
          <Bookmark color={activeNav === 'bookmarks' ? COLORS.accent : COLORS.textMuted} size={28} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveNav('favorites')}>
          <Heart color={activeNav === 'favorites' ? COLORS.accent : COLORS.textMuted} size={28} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveNav('more')}>
          <MoreHorizontal color={activeNav === 'more' ? COLORS.accent : COLORS.textMuted} size={28} />
        </TouchableOpacity>
      </View>

      {/* Editor Modal */}
      <Modal visible={!!editingEntry} animationType="slide">
        <SafeAreaView style={styles.editorContainer}>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={closeEditor}><X color={COLORS.accent} size={28} /></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={() => setEditForm({...editForm, isFavorite: !editForm.isFavorite})}>
                <Heart color={editForm.isFavorite ? COLORS.red : COLORS.accent} fill={editForm.isFavorite ? COLORS.red : 'transparent'} size={28} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSave(false)}><Check color={COLORS.accent} size={28} /></TouchableOpacity>
            </View>
          </View>
          
          <ScrollView style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity 
                style={styles.emojiBtn}
                onPress={() => {
                  const next = (EMOJIS.indexOf(editForm.emoji || '📝') + 1) % EMOJIS.length;
                  setEditForm({...editForm, emoji: EMOJIS[next]});
                }}
              >
                <Text style={{ fontSize: 32 }}>{editForm.emoji}</Text>
              </TouchableOpacity>
              <TextInput 
                style={styles.titleInput}
                placeholder={t.titlePlaceholder}
                placeholderTextColor={COLORS.textMuted}
                value={editForm.title}
                onChangeText={text => setEditForm({...editForm, title: text})}
              />
            </View>
            <TextInput 
              style={styles.contentInput}
              placeholder={t.contentPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={editForm.content}
              onChangeText={text => setEditForm({...editForm, content: text})}
            />
          </ScrollView>

          <View style={styles.editorFooter}>
            {editingEntry !== 'new' ? (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={() => deleteEntry((editingEntry as DiaryEntry).id)}>
                  <Trash2 color={COLORS.red} size={24} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare}>
                  <Share2 color={COLORS.blue} size={24} />
                </TouchableOpacity>
              </View>
            ) : <View />}
            <TouchableOpacity onPress={() => handleSave(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FileText color={COLORS.textMuted} size={20} />
              <Text style={{ color: COLORS.textMuted }}>{t.saveDraft}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  header: { padding: 20, alignItems: 'center' },
  headerTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '600', letterSpacing: 2 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.darkGrey, padding: 4, borderRadius: 12, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.cardGrey },
  tabText: { color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive: { color: COLORS.accent },
  scrollView: { flex: 1 },
  dateHeader: { backgroundColor: COLORS.darkGrey, padding: 12, borderRadius: 12, marginVertical: 16 },
  dateHeaderText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  card: { backgroundColor: COLORS.cardGrey, padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTime: { color: COLORS.accent, fontSize: 18, fontWeight: '300' },
  cardEmoji: { fontSize: 24 },
  cardTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '500', marginBottom: 4 },
  cardContent: { color: COLORS.textMuted, fontSize: 14 },
  fab: { position: 'absolute', right: 24, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.black, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, borderTopWidth: 1, borderTopColor: COLORS.cardGrey },
  editorContainer: { flex: 1, backgroundColor: COLORS.black },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.cardGrey },
  emojiBtn: { width: 64, height: 64, backgroundColor: COLORS.cardGrey, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  titleInput: { flex: 1, color: COLORS.accent, fontSize: 24, fontWeight: '500' },
  contentInput: { color: COLORS.accent, fontSize: 18, minHeight: 200, textAlignVertical: 'top' },
  editorFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.cardGrey },
  searchInput: { backgroundColor: COLORS.cardGrey, color: COLORS.accent, padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 },
  sectionTitle: { color: COLORS.accent, fontSize: 24, fontWeight: '500', marginBottom: 16 },
  settingsCard: { backgroundColor: COLORS.cardGrey, borderRadius: 16, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.black, gap: 16 },
  settingsText: { color: COLORS.accent, fontSize: 16, fontWeight: '500' }
});
