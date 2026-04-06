import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JamaatCard } from '../components/JamaatCard';
import { DatePickerField } from '../components/DatePickerField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import {
  getJamaatsForUser,
  insertJamaat,
  insertMember,
  reconcileJamaatDateBounds,
  updateJamaatCloudIds,
} from '../db/repositories';
import type { RootStackParamList } from '../navigation/types';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { createJamaatCloud } from '../services/jamaatService';
import { getCurrentUser, getUserDisplayName } from '../services/authService';
import { colors } from '../theme/colors';
import type { Jamaat } from '../types/models';
import { toYMD } from '../utils/dateUtils';
import { isValidJamaatRange } from '../utils/calculations';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const db = useSQLiteContext();
  const [list, setList] = useState<Jamaat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [start, setStart] = useState(toYMD(new Date()));
  const [end, setEnd] = useState(toYMD(new Date()));

  const firebaseOn = isFirebaseConfigured();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user) {
        setList([]);
        return;
      }
      let rows = await getJamaatsForUser(db, user.uid);
      for (const j of rows) {
        await reconcileJamaatDateBounds(db, j.id);
      }
      rows = await getJamaatsForUser(db, user.uid);
      setList(rows);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openCreate = () => {
    const today = toYMD(new Date());
    setName('');
    setStart(today);
    setEnd(today);
    setModal(true);
  };

  const saveJamaat = async () => {
    const n = name.trim();
    if (!n) return;
    if (!isValidJamaatRange(start, end)) {
      Alert.alert(t('error'), t('invalidJamaatRange'));
      return;
    }
    Keyboard.dismiss();
    const user = getCurrentUser();
    let localId: number;
    try {
      localId = await insertJamaat(db, n, start, end, user?.uid ?? null);
    } catch (e) {
      console.warn(e);
      Alert.alert(t('error'), t('networkError'));
      return;
    }
    setModal(false);
    await load();
    if (firebaseOn) {
      if (!user) {
        Alert.alert(t('error'), t('signInRequired'));
        return;
      }
      try {
        const { firebaseDocId, inviteCode, creatorMemberFirestoreId } = await createJamaatCloud({
          name: n,
          startDate: start,
          endDate: end,
          createdBy: user.uid,
          creatorDisplayName: getUserDisplayName(user),
        });
        await updateJamaatCloudIds(db, localId, firebaseDocId, inviteCode);
        await insertMember(db, localId, getUserDisplayName(user), 0, start, null, {
          userId: user.uid,
          firestoreMemberId: creatorMemberFirestoreId,
        });
        await load();
      } catch (e) {
        console.warn('createJamaatCloud', e);
        Alert.alert(t('error'), t('firebaseCreateFailed'));
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('appName')}</Text>
          <Text style={styles.sub}>{t('homeSubtitle')}</Text>
        </View>
        <Pressable onPress={() => nav.navigate('Settings')} style={styles.gear}>
          <Text style={styles.gearText}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('jamaats')}</Text>
        <View style={styles.sectionBtns}>
          <PrimaryButton
            title={t('joinJamaat')}
            variant="outline"
            onPress={() => nav.navigate('JoinJamaat')}
            style={styles.joinBtn}
          />
          <PrimaryButton title={t('addJamaat')} onPress={openCreate} style={styles.addBtn} />
        </View>
      </View>
      {!firebaseOn ? (
        <Text style={styles.cloudHint}>{t('cloudSyncJoinHintShort')}</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(j) => String(j.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('noJamaats')}</Text>}
          renderItem={({ item }) => (
            <JamaatCard jamaat={item} onPress={() => nav.navigate('JamaatDetail', { jamaatId: item.id })} />
          )}
        />
      )}

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('addJamaat')}</Text>
            <LabeledInput label={t('jamaatName')} value={name} onChangeText={setName} />
            <DatePickerField label={t('startDate')} valueYmd={start} onChangeYmd={setStart} />
            <DatePickerField
              label={t('endDate')}
              valueYmd={end}
              onChangeYmd={setEnd}
              minimumDate={new Date(start + 'T12:00:00')}
            />
            <View style={styles.modalActions}>
              <PrimaryButton title={t('cancel')} variant="outline" onPress={() => setModal(false)} />
              <PrimaryButton title={t('save')} onPress={saveJamaat} />
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryDark,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, maxWidth: '88%' },
  gear: { padding: 8 },
  gearText: { fontSize: 22, color: '#fff' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryDark, flexShrink: 0 },
  sectionBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', flex: 1 },
  cloudHint: {
    marginHorizontal: 20,
    marginTop: -8,
    marginBottom: 8,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  joinBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  addBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
  loader: { marginTop: 40 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primaryDark, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
