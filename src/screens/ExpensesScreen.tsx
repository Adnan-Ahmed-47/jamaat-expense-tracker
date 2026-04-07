import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpenseCard } from '../components/ExpenseCard';
import { DatePickerField } from '../components/DatePickerField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import {
  deleteExpense,
  getExpensesByJamaat,
  getJamaatById,
  getMemberByFirestoreMemberId,
  getMembersByJamaat,
  insertExpense,
  reconcileJamaatDateBounds,
  updateExpense,
} from '../db/repositories';
import type { RootStackParamList } from '../navigation/types';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import {
  addExpenseDocumentCloud,
  deleteExpenseDocumentCloud,
  updateExpenseDocumentCloud,
} from '../services/jamaatService';
import { colors } from '../theme/colors';
import type { Expense, ExpenseCategory, Member } from '../types/models';
import { toYMD } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Expenses'>;
type R = RouteProp<RootStackParamList, 'Expenses'>;

const CATS: ExpenseCategory[] = ['Food', 'Travel', 'Misc'];

export function ExpensesScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { jamaatId } = route.params;
  const db = useSQLiteContext();

  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [payerId, setPayerId] = useState<number | null>(null);

  const load = useCallback(async () => {
    await reconcileJamaatDateBounds(db, jamaatId);
    const m = await getMembersByJamaat(db, jamaatId);
    setMembers(m);
    setExpenses(await getExpensesByJamaat(db, jamaatId));
  }, [db, jamaatId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    nav.setOptions({ title: t('expenses') });
  }, [nav, t]);

  const payerName = (id: number) => members.find((x) => x.id === id)?.name ?? '?';

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setAmount('');
    setDate(toYMD(new Date()));
    setCategory('Food');
    setPayerId(members[0]?.id ?? null);
    setModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setTitle(e.title);
    setAmount(String(e.amount));
    setDate(e.expenseDate);
    setCategory(e.category);
    setPayerId(e.paidByMemberId);
    setModal(true);
  };

  const save = async () => {
    const tit = title.trim();
    if (!tit) return;
    const amt = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert(t('error'), t('amount'));
      return;
    }
    if (payerId === null || !members.some((m) => m.id === payerId)) {
      Alert.alert(t('error'), t('selectMember'));
      return;
    }
    const j = await getJamaatById(db, jamaatId);
    const payer = members.find((m) => m.id === payerId);
    const cloud = Boolean(j?.firebaseDocId) && isFirebaseConfigured();

    if (editing) {
      if (cloud && j?.firebaseDocId && editing.firestoreExpenseId) {
        if (!payer?.firestoreMemberId) {
          Alert.alert(t('error'), t('memberNotSynced'));
          return;
        }
        try {
          await updateExpenseDocumentCloud(j.firebaseDocId, editing.firestoreExpenseId, {
            title: tit,
            amount: amt,
            expenseDate: date,
            category,
            paidByMemberFirestoreId: payer.firestoreMemberId,
          });
        } catch (e) {
          console.warn(e);
          Alert.alert(t('error'), t('networkError'));
          return;
        }
      }
      await updateExpense(db, editing.id, tit, amt, date, payerId, category);
    } else if (cloud && j?.firebaseDocId) {
      if (!payer?.firestoreMemberId) {
        Alert.alert(t('error'), t('memberNotSynced'));
        return;
      }
      const payerFsId = payer.firestoreMemberId;
      let fsId = '';
      try {
        fsId = await addExpenseDocumentCloud(j.firebaseDocId, {
          title: tit,
          amount: amt,
          expenseDate: date,
          category,
          paidByMemberFirestoreId: payerFsId,
        });
      } catch (e) {
        console.warn(e);
        Alert.alert(t('error'), t('networkError'));
        return;
      }
      try {
        const freshPayer = await getMemberByFirestoreMemberId(db, jamaatId, payerFsId);
        if (!freshPayer) {
          Alert.alert(t('error'), t('memberNotSynced'));
          return;
        }
        await insertExpense(db, jamaatId, tit, amt, date, freshPayer.id, category, {
          firestoreExpenseId: fsId,
        });
      } catch (e) {
        console.warn(e);
        Alert.alert(t('error'), t('error'));
        return;
      }
    } else {
      await insertExpense(db, jamaatId, tit, amt, date, payerId, category);
    }
    setModal(false);
    await load();
  };

  const remove = async (e: Expense) => {
    Alert.alert(t('delete'), e.title, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          if (e.firestoreExpenseId && isFirebaseConfigured()) {
            try {
              const jamaat = await getJamaatById(db, jamaatId);
              if (!jamaat?.firebaseDocId) {
                Alert.alert(t('error'), t('memberNotSynced'));
                return;
              }
              await deleteExpenseDocumentCloud(jamaat.firebaseDocId, e.firestoreExpenseId);
            } catch (err) {
              console.warn(err);
              Alert.alert(t('error'), t('networkError'));
              return;
            }
          }
          await deleteExpense(db, e.id);
          await load();
          setModal(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.toolbar}>
        <PrimaryButton
          title={t('addExpense')}
          onPress={openCreate}
          disabled={members.length === 0}
          style={styles.addBtn}
        />
        {members.length === 0 && (
          <Text style={styles.hint}>{t('noMembers')}</Text>
        )}
      </View>
      <FlatList
        data={expenses}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('noExpenses')}</Text>}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            payerName={payerName(item.paidByMemberId)}
            onPress={() => openEdit(item)}
          />
        )}
      />

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? t('editExpense') : t('addExpense')}</Text>
            <LabeledInput label={t('expenseTitle')} value={title} onChangeText={setTitle} />
            <LabeledInput
              label={t('amount')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <DatePickerField label={t('date')} valueYmd={date} onChangeYmd={setDate} />
            <Text style={styles.catLabel}>{t('category')}</Text>
            <View style={styles.catRow}>
              {CATS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, category === c && styles.chipOn]}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextOn]}>
                    {t(c === 'Food' ? 'food' : c === 'Travel' ? 'travel' : 'misc')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.catLabel}>{t('paidBy')}</Text>
            <View style={styles.payerWrap}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setPayerId(m.id)}
                  style={[styles.chip, payerId === m.id && styles.chipOn]}
                >
                  <Text style={[styles.chipText, payerId === m.id && styles.chipTextOn]}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              {editing && (
                <PrimaryButton title={t('delete')} variant="danger" onPress={() => remove(editing)} />
              )}
              <PrimaryButton title={t('cancel')} variant="outline" onPress={() => setModal(false)} />
              <PrimaryButton title={t('save')} onPress={save} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  toolbar: { paddingHorizontal: 20, paddingTop: 12 },
  addBtn: { alignSelf: 'flex-start' },
  hint: { marginTop: 8, color: colors.textMuted, fontSize: 13 },
  list: { padding: 20, paddingBottom: 40 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32 },
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
    maxHeight: '92%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primaryDark, marginBottom: 16 },
  catLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  payerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
});
