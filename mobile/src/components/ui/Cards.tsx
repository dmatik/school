import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Pencil, KeyRound, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useDirection } from '../../i18n';
import { ChildBadge, StatusBadge, SubjectIconBadge, UserAvatar } from './Badges';
import { formatShortDate } from '../../lib/dateUtils';
import { getHomeworkText } from '../../lib/homeworkUtils';
import type {
  ConsolidatedHomeworkItem,
  Incident,
  ExamItem,
  User,
} from '../../../../src/types';

export function HomeworkCard({
  item,
  childColor,
}: {
  item: ConsolidatedHomeworkItem;
  childColor?: string | null;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  const hoursLabel =
    item.hourNums.length > 1
      ? t('homework.lesson_hours', { hours: item.hourNums.join(', ') })
      : item.hourNums.length === 1
      ? t('homework.lesson_hour', { hour: item.hourNums[0] })
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={[styles.topRow, { flexDirection: flexRow }]}>
        <SubjectIconBadge subject={item.subject} variant="tinted" />

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.subjectTitle,
              {
                color: palette.foreground,
                textAlign,
              },
            ]}
          >
            {item.subject}
          </Text>
          {item.teacher ? (
            <Text style={[styles.subMeta, { color: palette.mutedForeground, textAlign }]}>
              {t('homework.teacher_label')} {item.teacher}
            </Text>
          ) : null}
        </View>

        {item.studentName ? (
          <ChildBadge name={item.studentName} colorId={childColor} size="xs" />
        ) : null}
      </View>

      <Text
        style={[
          styles.description,
          {
            color: palette.foreground,
            textAlign,
          },
        ]}
      >
        {getHomeworkText(item)}
      </Text>

      {hoursLabel ? (
        <View style={[styles.footerRow, { flexDirection: flexRow }]}>
          <StatusBadge label={hoursLabel} variant="neutral" />
        </View>
      ) : null}
    </View>
  );
}

export function IncidentCard({
  item,
  childColor,
}: {
  item: Incident;
  childColor?: string | null;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <View style={[styles.topRow, { flexDirection: flexRow }]}>
        <SubjectIconBadge subject={item.subject || item.type} variant="tinted" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.subjectTitle, { color: palette.foreground, textAlign }]}>
            {item.type}
          </Text>
          {item.subject ? (
            <Text style={[styles.subMeta, { color: palette.mutedForeground, textAlign }]}>
              {item.subject}
              {item.teacher ? ` · ${item.teacher}` : ''}
            </Text>
          ) : null}
        </View>
        {item.studentName ? (
          <ChildBadge name={item.studentName} colorId={childColor} size="xs" />
        ) : null}
      </View>

      {item.description ? (
        <Text style={[styles.description, { color: palette.foreground, textAlign }]}>
          {item.description}
        </Text>
      ) : null}

      <View style={[styles.footerRow, { flexDirection: flexRow }]}>
        {item.hourNum ? (
          <StatusBadge
            label={t('incidents.lesson_hour', { hour: item.hourNum })}
            variant="neutral"
          />
        ) : (
          <View />
        )}
        <StatusBadge
          label={item.isJustified ? t('incidents.justified') : t('incidents.not_justified')}
          variant={item.isJustified ? 'success' : 'destructive'}
        />
      </View>
    </View>
  );
}

export function ExamCard({
  exam,
  childColor,
  canEdit,
  onEdit,
  onDelete,
}: {
  exam: ExamItem;
  childColor?: string | null;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <View style={[styles.topRow, { flexDirection: flexRow }]}>
        <SubjectIconBadge subject={exam.name} variant="tinted" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.subjectTitle, { color: palette.foreground, textAlign }]}>
            {exam.name}
          </Text>
          <Text style={[styles.subMeta, { color: palette.mutedForeground, textAlign }]}>
            {formatShortDate(exam.date)}
          </Text>
        </View>
        <ChildBadge name={exam.studentName} colorId={childColor} size="xs" />
      </View>

      {exam.description ? (
        <Text style={[styles.description, { color: palette.foreground, textAlign }]}>
          {exam.description}
        </Text>
      ) : null}

      <View style={[styles.footerRow, { flexDirection: flexRow }]}>
        {exam.grade ? (
          <StatusBadge
            label={t('exams.grade_badge', { grade: exam.grade })}
            variant="primary"
          />
        ) : (
          <StatusBadge label={t('common.no_grade')} variant="neutral" />
        )}

        {canEdit && (
          <View style={[styles.actionIcons, { flexDirection: flexRow }]}>
            <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
              <Pencil size={15} color={palette.mutedForeground} />
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8} style={styles.iconBtn}>
              <Trash2 size={15} color={palette.destructive} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export function AdminUserRow({
  user,
  isSelf,
  linkedChildName,
  onEdit,
  onResetPassword,
  onDelete,
}: {
  user: User;
  isSelf: boolean;
  linkedChildName?: string | null;
  onEdit: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <View style={[styles.topRow, { flexDirection: flexRow }]}>
        <UserAvatar user={user} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.subjectTitle, { color: palette.foreground, textAlign }]}>
            {fullName} {isSelf ? `(${t('admin.you')})` : ''}
          </Text>
          <Text style={[styles.subMeta, { color: palette.mutedForeground, textAlign }]}>
            @{user.username}
          </Text>
        </View>
        <StatusBadge
          label={user.role === 'admin' ? t('account.role_admin') : t('account.role_user')}
          variant={user.role === 'admin' ? 'primary' : 'neutral'}
        />
      </View>

      <View style={[styles.footerRow, { flexDirection: flexRow }]}>
        <View style={[styles.actionIcons, { flexDirection: flexRow }]}>
          <StatusBadge
            label={
              user.familyRole === 'child'
                ? t('account.role_child')
                : t('account.role_parent')
            }
            variant="neutral"
          />
          {user.familyRole === 'child' && (
            <StatusBadge
              label={linkedChildName || t('admin.unlinked_child_badge')}
              variant={linkedChildName ? 'success' : 'warning'}
            />
          )}
        </View>

        <View style={[styles.actionIcons, { flexDirection: flexRow }]}>
          <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
            <Pencil size={15} color={palette.mutedForeground} />
          </Pressable>
          <Pressable onPress={onResetPassword} hitSlop={8} style={styles.iconBtn}>
            <KeyRound size={15} color={palette.mutedForeground} />
          </Pressable>
          {!isSelf && (
            <Pressable onPress={onDelete} hitSlop={8} style={styles.iconBtn}>
              <Trash2 size={15} color={palette.destructive} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    alignItems: 'center',
    gap: 10,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  subMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionIcons: {
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 4,
  },
});
