import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerField } from '../components/DatePickerField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { AppCard } from '../components/ui/AppCard';
import { LabeledInput } from '../components/ui/LabeledInput';
import {
  deleteJamaat,
  getExpensesByJamaat,
  getJamaatById,
  getMembersByJamaat,
  reconcileJamaatDateBounds,
  updateJamaat,
} from '../db/repositories';
import type { RootStackParamList } from '../navigation/types';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { subscribeJamaatRealtime, updateJamaatDocumentCloud } from '../services/jamaatService';
import { colors } from '../theme/colors';
import type { Expense, Jamaat, Member } from '../types/models';
import { buildJamaatSettlement, isValidJamaatRange } from '../utils/calculations';
import { formatINR } from '../utils/currency';

type Nav = NativeStackNavigationProp<RootStackParamList, 'JamaatDetail'>;
type R = RouteProp<RootStackParamList, 'JamaatDetail'>;

export function JamaatDetailScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { jamaatId } = route.params;
  const db = useSQLiteContext();

  const [jamaat, setJamaat] = useState<Jamaat | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const load = useCallback(async () => {
    await reconcileJamaatDateBounds(db, jamaatId);
    const j = await getJamaatById(db, jamaatId);
    setJamaat(j);
    if (j) {
      setName(j.name);
      setStart(j.startDate);
      setEnd(j.endDate);
    }
    setMembers(await getMembersByJamaat(db, jamaatId));
    setExpenses(await getExpensesByJamaat(db, jamaatId));
  }, [db, jamaatId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!jamaat?.firebaseDocId || !isFirebaseConfigured()) return;
    const unsub = subscribeJamaatRealtime(jamaat.firebaseDocId, db, jamaat.id, () => {
      void loadRef.current();
    });
    return unsub;
  }, [db, jamaat?.firebaseDocId, jamaat?.id]);

  useLayoutEffect(() => {
    nav.setOptions({ title: jamaat?.name ?? t('details') });
  }, [nav, jamaat?.name, t]);

  const summary = jamaat ? buildJamaatSettlement(jamaat, members, expenses) : null;

  const saveEdit = async () => {
    if (!jamaat) return;
    const n = name.trim();
    if (!n) return;
    if (!isValidJamaatRange(start, end)) {
      Alert.alert(t('error'), t('invalidJamaatRange'));
      return;
    }
    await updateJamaat(db, jamaat.id, n, start, end);
    if (jamaat.firebaseDocId && isFirebaseConfigured()) {
      try {
        await updateJamaatDocumentCloud(jamaat.firebaseDocId, {
          name: n,
          startDate: start,
          endDate: end,
        });
      } catch (e) {
        console.warn('updateJamaatDocumentCloud', e);
      }
    }
    setEditOpen(false);
    await load();
  };

  const shareInvite = async () => {
    const code = jamaat?.inviteCode;
    if (!code) return;
    try {
      await Share.share({
        message: `${t('shareInviteMessage')}\n${code}`,
      });
    } catch {
      /* user dismissed */
    }
  };

  const confirmDelete = () => {
    Alert.alert(t('delete'), t('confirmDeleteJamaat'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteJamaat(db, jamaatId);
          nav.navigate('Home');
        },
      },
    ]);
  };

  if (!jamaat) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppCard>
          <Text style={styles.range}>
            {jamaat.startDate} — {jamaat.endDate}
          </Text>
          <Text style={styles.dateHint}>{t('datesAutoExpandHint')}</Text>
          {summary && (
            <>
              <Text style={styles.stat}>
                {t('totalExpense')}: {formatINR(summary.totalExpenses)}
              </Text>
              <Text style={styles.stat}>
                {t('totalContribution')}: {formatINR(summary.totalContributions)}
              </Text>
              <Text style={styles.stat}>
                {t('perDayExpense')}: {formatINR(summary.perDayExpense)}
              </Text>
              <Text style={styles.stat}>
                {t('members')}: {members.length} · {t('expenses')}: {expenses.length}
              </Text>
            </>
          )}
          <View style={styles.inviteBlock}>
            <Text style={styles.inviteBlockLabel}>{t('inviteCode')}</Text>
            {jamaat.inviteCode ? (
              <Text style={styles.inviteCodeText} selectable>
                {jamaat.inviteCode}
              </Text>
            ) : (
              <Text style={styles.noInviteHint}>{t('noInviteCodeHint')}</Text>
            )}
          </View>
        </AppCard>

        {jamaat.inviteCode ? (
          <PrimaryButton title={t('shareInviteCode')} variant="outline" onPress={shareInvite} />
        ) : null}

        <PrimaryButton title={t('members')} onPress={() => nav.navigate('Members', { jamaatId })} />
        <PrimaryButton title={t('expenses')} onPress={() => nav.navigate('Expenses', { jamaatId })} />
        <PrimaryButton title={t('settlement')} onPress={() => nav.navigate('Settlement', { jamaatId })} />
        <PrimaryButton
          title={t('jamaatCompleted')}
          variant="outline"
          onPress={() => nav.navigate('JamaatCompleted', { jamaatId })}
        />

        <PrimaryButton title={t('editJamaat')} variant="outline" onPress={() => setEditOpen(true)} />
        <PrimaryButton title={t('delete')} variant="danger" onPress={confirmDelete} />
      </ScrollView>

      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('editJamaat')}</Text>
            <LabeledInput label={t('jamaatName')} value={name} onChangeText={setName} />
            <DatePickerField label={t('startDate')} valueYmd={start} onChangeYmd={setStart} />
            <DatePickerField
              label={t('endDate')}
              valueYmd={end}
              onChangeYmd={setEnd}
              minimumDate={new Date(start + 'T12:00:00')}
            />
            <View style={styles.row}>
              <PrimaryButton title={t('cancel')} variant="outline" onPress={() => setEditOpen(false)} />
              <PrimaryButton title={t('save')} onPress={saveEdit} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  range: { fontSize: 15, color: colors.textMuted, marginBottom: 6 },
  dateHint: { fontSize: 12, color: colors.textMuted, marginBottom: 10, lineHeight: 16 },
  stat: { fontSize: 15, color: colors.text, marginBottom: 6 },
  inviteBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inviteBlockLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  inviteCodeText: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.5 },
  noInviteHint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  muted: { padding: 20, color: colors.textMuted },
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
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primaryDark, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
