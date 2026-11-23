import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Pencil, KeyRound, Trash2, Calendar, Fingerprint } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';
import { useDirection } from '../../i18n';
import { ChildBadge, StatusBadge, SubjectIconBadge, UserAvatar } from './Badges';
import { CardSurface } from './Surfaces';
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
  childFirstName,
  showChildBadge = true,
}: {
  item: ConsolidatedHomeworkItem;
  childColor?: string | null;
  childFirstName?: string | null;
  showChildBadge?: boolean;
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

  const hwText = getHomeworkText(item);
  const childLabel = showChildBadge
    ? childFirstName ||
      (item.studentName ? item.studentName.trim().split(/\s+/)[0] : null)
    : null;

  return (
    <CardSurface style={styles.card}>
      {/* Top Row: Subject Icon + Title & Lesson (Start), Child Name badge (End) */}
      <View style={[styles.hwTopRow, { flexDirection: flexRow }]}>
        <View style={[styles.hwIdentityGroup, { flexDirection: flexRow }]}>
          <SubjectIconBadge subject={item.subject} variant="solid" size="lg" />

          <View style={styles.hwTitleStack}>
            <Text
              numberOfLines={1}
              style={[
                styles.hwSubjectTitle,
                { color: palette.foreground, textAlign },
              ]}
            >
              {item.subject}
            </Text>
            {hoursLabel ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.hwLessonSubtitle,
                  { color: palette.mutedForeground, textAlign },
                ]}
              >
                {hoursLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {childLabel ? (
          <View style={{ marginTop: 2 }}>
            <ChildBadge name={childLabel} colorId={childColor} size="sm" />
          </View>
        ) : null}
      </View>

      {/* Teacher Name */}
      {item.teacher ? (
        <Text
          numberOfLines={1}
          style={[
            styles.hwTeacher,
            { color: palette.mutedForeground, textAlign },
          ]}
        >
          {item.teacher}
        </Text>
      ) : null}

      {/* Homework Details */}
      {hwText ? (
        <View
          style={[
            styles.hwDetailsWrap,
            { borderTopColor: palette.border },
          ]}
        >
          <Text
            style={[
              styles.hwDetailsText,
              { color: palette.foreground, textAlign },
            ]}
          >
            {`${t('homework.homework_prefix')}  ${hwText}`}
          </Text>
        </View>
      ) : null}
    </CardSurface>
  );
}

export function IncidentCard({
  item,
  childColor,
  childFirstName,
  showChildBadge = true,
}: {
  item: Incident;
  childColor?: string | null;
  childFirstName?: string | null;
  showChildBadge?: boolean;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  const hasSubject = Boolean(item.subject?.trim());
  const subjectTitle = hasSubject ? item.subject! : item.type;
  const childLabel = showChildBadge
    ? childFirstName ||
      (item.studentName ? item.studentName.trim().split(/\s+/)[0] : null)
    : null;
  const incidentDetail = hasSubject ? item.type || item.description : item.description;

  return (
    <CardSurface style={styles.card}>
      {/* Top Row: Subject Icon + Title & Lesson (Start), Child Name badge (End) */}
      <View style={[styles.hwTopRow, { flexDirection: flexRow }]}>
        <View style={[styles.hwIdentityGroup, { flexDirection: flexRow }]}>
          <SubjectIconBadge subject={subjectTitle} variant="solid" size="lg" />

          <View style={styles.hwTitleStack}>
            <Text
              numberOfLines={1}
              style={[styles.hwSubjectTitle, { color: palette.foreground, textAlign }]}
            >
              {subjectTitle}
            </Text>
            {item.hourNum ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.hwLessonSubtitle,
                  { color: palette.mutedForeground, textAlign },
                ]}
              >
                {t('incidents.lesson_hour', { hour: item.hourNum })}
              </Text>
            ) : null}
          </View>
        </View>

        {childLabel ? (
          <View style={{ marginTop: 2 }}>
            <ChildBadge name={childLabel} colorId={childColor} size="sm" />
          </View>
        ) : null}
      </View>

      {/* Teacher Name */}
      {item.teacher ? (
        <Text
          numberOfLines={1}
          style={[styles.hwTeacher, { color: palette.mutedForeground, textAlign }]}
        >
          {item.teacher}
        </Text>
      ) : null}

      {/* Incident Details below hairline divider */}
      {incidentDetail ? (
        <View style={[styles.hwDetailsWrap, { borderTopColor: palette.border }]}>
          <Text
            style={[styles.hwDetailsText, { color: palette.foreground, textAlign }]}
          >
            {hasSubject && item.type
              ? item.description
                ? `${item.type}:  ${item.description}`
                : item.type
              : item.description}
          </Text>
        </View>
      ) : null}
    </CardSurface>
  );
}

export function ExamCard({
  exam,
  childColor,
  childFirstName,
  showChildBadge = true,
  canEdit,
  onEdit,
}: {
  exam: ExamItem;
  childColor?: string | null;
  childFirstName?: string | null;
  showChildBadge?: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();

  const childLabel = showChildBadge
    ? childFirstName ||
      (exam.studentName ? exam.studentName.trim().split(/\s+/)[0] : null)
    : null;

  return (
    <CardSurface style={styles.card}>
      {/* Top Row: Subject Icon + Title & Date/Grade (Start), Child Badge & Edit (End) */}
      <View style={[styles.hwTopRow, { flexDirection: flexRow }]}>
        <View style={[styles.hwIdentityGroup, { flexDirection: flexRow }]}>
          <SubjectIconBadge subject={exam.name} variant="solid" size="lg" />

          <View style={styles.hwTitleStack}>
            <Text
              numberOfLines={1}
              style={[styles.hwSubjectTitle, { color: palette.foreground, textAlign }]}
            >
              {exam.name}
            </Text>

            <View style={[styles.examMetaRow, { flexDirection: flexRow }]}>
              <View style={[styles.examDateInline, { flexDirection: flexRow }]}>
                <Calendar size={13} color={palette.mutedForeground} />
                <Text
                  numberOfLines={1}
                  style={[styles.examDateText, { color: palette.mutedForeground }]}
                >
                  {formatShortDate(exam.date)}
                </Text>
              </View>

              {exam.grade ? (
                <StatusBadge
                  label={t('exams.grade_badge', { grade: exam.grade })}
                  variant="primary"
                />
              ) : null}
            </View>
          </View>
        </View>

        <View style={[styles.examActionsRow, { flexDirection: flexRow }]}>
          {childLabel ? (
            <ChildBadge name={childLabel} colorId={childColor} size="sm" />
          ) : null}

          {canEdit && (
            <Pressable
              onPress={onEdit}
              hitSlop={10}
              accessibilityLabel={t('exams.edit_exam_button')}
              style={styles.examEditBtn}
            >
              <Pencil size={15} color={palette.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Description below hairline divider */}
      {exam.description ? (
        <View style={[styles.hwDetailsWrap, { borderTopColor: palette.border }]}>
          <Text
            style={[styles.hwDetailsText, { color: palette.foreground, textAlign }]}
          >
            {exam.description}
          </Text>
        </View>
      ) : null}
    </CardSurface>
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
    <CardSurface style={styles.card}>
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
    </CardSurface>
  );
}

export function PasskeyAccountRow({
  username,
  firstName,
  lastName,
  deviceName,
  onPress,
  testID,
}: {
  username: string;
  firstName?: string;
  lastName?: string;
  deviceName?: string;
  onPress: () => void;
  testID?: string;
}) {
  const { palette } = useTheme();
  const { flexRow, textAlign } = useDirection();
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username;
  const metaText = deviceName ? `@${username} · ${deviceName}` : `@${username}`;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.78 }]}
    >
      <CardSurface style={styles.passkeyAccountCard}>
        <View style={[styles.topRow, { flexDirection: flexRow }]}>
          <UserAvatar
            user={{
              username,
              firstName: firstName || '',
              lastName: lastName || '',
              avatar: '',
            }}
            size={38}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={[styles.subjectTitle, { color: palette.foreground, textAlign }]}
            >
              {displayName}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.subMeta, { color: palette.mutedForeground, textAlign }]}
            >
              {metaText}
            </Text>
          </View>
          <View
            style={[
              styles.passkeyIconBadge,
              { backgroundColor: 'rgba(59, 130, 196, 0.12)' },
            ]}
          >
            <Fingerprint size={18} color={palette.primary} />
          </View>
        </View>
      </CardSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 10,
  },
  hwTopRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  hwIdentityGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  hwTitleStack: {
    flex: 1,
    justifyContent: 'center',
  },
  hwSubjectTitle: {
    fontSize: 16,
    letterSpacing: -0.3,
    ...heeboFont('700'),
  },
  hwLessonSubtitle: {
    fontSize: 12,
    ...heeboFont('400'),
  },
  hwTeacher: {
    fontSize: 14,
    ...heeboFont('500'),
  },
  hwDetailsWrap: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hwDetailsText: {
    fontSize: 16,
    lineHeight: 24,
    ...heeboFont('400'),
  },
  examMetaRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  examDateInline: {
    alignItems: 'center',
    gap: 5,
  },
  examDateText: {
    fontSize: 12,
    ...heeboFont('500'),
  },
  examActionsRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  examEditBtn: {
    width: 28,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    alignItems: 'center',
    gap: 10,
  },
  subjectTitle: {
    fontSize: 14,
    ...heeboFont('700'),
  },
  subMeta: {
    fontSize: 12,
    marginTop: 1,
    ...heeboFont('400'),
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    ...heeboFont('400'),
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
  passkeyAccountCard: {
    padding: 12,
  },
  passkeyIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
