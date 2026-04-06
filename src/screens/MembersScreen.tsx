import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberCard } from '../components/MemberCard';
import { DatePickerField } from '../components/DatePickerField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LabeledInput } from '../components/ui/LabeledInput';
import {
  deleteMember,
  getExpensesByJamaat,
  getJamaatById,
  getMembersByJamaat,
  insertMember,
  reconcileJamaatDateBounds,
  updateMember,
} from '../db/repositories';
import type { RootStackParamList } from '../navigation/types';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import {
  addMemberDocumentCloud,
  deleteMemberDocumentCloud,
  updateMemberDocumentCloud,
} from '../services/jamaatService';
import { colors } from '../theme/colors';
import type { Member } from '../types/models';
import { validateMemberDates } from '../utils/calculations';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Members'>;
type R = RouteProp<RootStackParamList, 'Members'>;

export function MembersScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { jamaatId } = route.params;
  const db = useSQLiteContext();

  const [jamaatStart, setJamaatStart] = useState('');
  const [jamaatEnd, setJamaatEnd] = useState('');
  const [list, setList] = useState<Member[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [name, setName] = useState('');
  const [contribution, setContribution] = useState('');
  const [join, setJoin] = useState('');
  const [leave, setLeave] = useState<string | null>(null);
  const [leaveEnabled, setLeaveEnabled] = useState(false);

  const load = useCallback(async () => {
    await reconcileJamaatDateBounds(db, jamaatId);
    const j = await getJamaatById(db, jamaatId);
    if (j) {
      setJamaatStart(j.startDate);
      setJamaatEnd(j.endDate);
    }
    setList(await getMembersByJamaat(db, jamaatId));
  }, [db, jamaatId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    nav.setOptions({ title: t('members') });
  }, [nav, t]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setContribution('');
    setJoin(jamaatStart || '');
    setLeave(null);
    setLeaveEnabled(false);
    setModal(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setName(m.name);
    setContribution(String(m.contribution));
    setJoin(m.joinDate);
    setLeave(m.leaveDate);
    setLeaveEnabled(!!m.leaveDate);
    setModal(true);
  };

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    const c = parseFloat(contribution.replace(/,/g, '')) || 0;
    const v = validateMemberDates(jamaatStart, jamaatEnd, join, leaveEnabled ? leave : null);
    if (!v.ok) {
      Alert.alert(t('error'), t(v.message));
      return;
    }
    const leaveVal = leaveEnabled && leave ? leave : null;
    const j = await getJamaatById(db, jamaatId);
    const cloud = Boolean(j?.firebaseDocId) && isFirebaseConfigured();

    if (editing) {
      if (cloud && editing.firestoreMemberId && j?.firebaseDocId) {
        try {
          await updateMemberDocumentCloud(j.firebaseDocId, editing.firestoreMemberId, {
            name: n,
            contribution: c,
            joinDate: join,
            leaveDate: leaveVal,
          });
        } catch (e) {
          console.warn(e);
          Alert.alert(t('error'), t('networkError'));
          return;
        }
      }
      await updateMember(db, editing.id, n, c, join, leaveVal);
    } else if (cloud && j?.firebaseDocId) {
      try {
        const fsId = await addMemberDocumentCloud(j.firebaseDocId, {
          uid: null,
          name: n,
          contribution: c,
          joinDate: join,
          leaveDate: leaveVal,
        });
        await insertMember(db, jamaatId, n, c, join, leaveVal, { firestoreMemberId: fsId });
      } catch (e) {
        console.warn(e);
        Alert.alert(t('error'), t('networkError'));
        return;
      }
    } else {
      await insertMember(db, jamaatId, n, c, join, leaveVal);
    }
    setModal(false);
    await load();
  };

  const remove = async (m: Member) => {
    const ex = await getExpensesByJamaat(db, jamaatId);
    const paid = ex.some((e) => e.paidByMemberId === m.id);
    if (paid) {
      Alert.alert(t('error'), t('cannotDeleteMember'));
      return;
    }
    Alert.alert(t('delete'), t('confirmDeleteMember'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const jamaat = await getJamaatById(db, jamaatId);
            if (m.firestoreMemberId && isFirebaseConfigured() && jamaat?.firebaseDocId) {
              try {
                await deleteMemberDocumentCloud(jamaat.firebaseDocId, m.firestoreMemberId);
              } catch (e) {
                console.warn(e);
                Alert.alert(t('error'), t('networkError'));
                return;
              }
            }
            await deleteMember(db, m.id);
            await load();
          } catch {
            Alert.alert(t('error'), t('cannotDeleteMember'));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.toolbar}>
        <PrimaryButton title={t('addMember')} onPress={openCreate} style={styles.addBtn} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('noMembers')}</Text>}
        renderItem={({ item }) => (
          <MemberCard
            member={item}
            jamaatStart={jamaatStart}
            jamaatEnd={jamaatEnd}
            onPress={() => openEdit(item)}
          />
        )}
      />

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? t('editMember') : t('addMember')}</Text>
            <LabeledInput label={t('memberName')} value={name} onChangeText={setName} />
            <LabeledInput
              label={t('contribution')}
              value={contribution}
              onChangeText={setContribution}
              keyboardType="decimal-pad"
            />
            <DatePickerField
              label={t('joinDate')}
              valueYmd={join || jamaatStart}
              onChangeYmd={setJoin}
              minimumDate={new Date(jamaatStart + 'T12:00:00')}
              maximumDate={new Date(jamaatEnd + 'T12:00:00')}
            />
            <View style={styles.leaveRow}>
              <PrimaryButton
                title={leaveEnabled ? `${t('leaveDate')} ✓` : `${t('leaveDate')}`}
                variant="outline"
                onPress={() => {
                  if (!leaveEnabled) {
                    setLeaveEnabled(true);
                    setLeave(jamaatEnd);
                  } else {
                    setLeaveEnabled(false);
                    setLeave(null);
                  }
                }}
                style={styles.leaveToggle}
              />
            </View>
            {leaveEnabled && (
              <DatePickerField
                label={`${t('leaveDate')}`}
                valueYmd={leave || jamaatEnd}
                onChangeYmd={setLeave}
                minimumDate={new Date(join + 'T12:00:00')}
                maximumDate={new Date(jamaatEnd + 'T12:00:00')}
              />
            )}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  leaveRow: { marginBottom: 8 },
  leaveToggle: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12 },
});
