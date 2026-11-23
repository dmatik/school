import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { BookOpen, GraduationCap, Palette, Trash2 } from 'lucide-react-native';
import {
  SectionCard,
  InfoBox,
  InfoItem,
  EmptyStateCard,
  NoticeBanner,
  SectionDateHeader,
} from '../../components/ui/Surfaces';
import { StatusBadge } from '../../components/ui/Badges';
import {
  CounterField,
  FilledInput,
  FilledTextarea,
  SelectField,
} from '../../components/ui/FormFields';
import { Button } from '../../components/ui/Buttons';
import { ConfirmModal, Modal } from '../../components/ui/Modal';
import {
  HomeworkCard,
  IncidentCard,
  ExamCard,
  AdminUserRow,
  PasskeyAccountRow,
} from '../../components/ui/Cards';
import { ScheduleTable } from '../../components/ui/ScheduleTable';
import { useTheme } from '../../theme/ThemeContext';
import { heeboFont } from '../../theme/typography';

const meta: Meta = {
  title: '4 - Surfaces & Cards/SurfacesAndCards',
};

export default meta;

export const CardsAndSurfaces: StoryObj = {
  render: () => {
    const { palette } = useTheme();
    const [lang, setLang] = React.useState('he');
    const [themeMode, setThemeMode] = React.useState('system');

    return (
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
        <SectionDateHeader title="היום · יום חמישי, 20/11/2026" />

        <HomeworkCard
          childColor="emerald"
          item={{
            id: 'hw-1',
            ids: ['hw-1'],
            hourNums: [2, 3],
            subject: 'מדעים',
            teacher: 'רונית כהן',
            studentName: 'כפיר',
            dueDate: '2026-11-20',
            description: 'עמוד 45 תרגילים 1-4 בחוברת',
            completed: false,
          }}
        />

        <IncidentCard
          childColor="purple"
          item={{
            id: 'inc-1',
            date: '2026-11-20',
            type: 'מילה טובה',
            subject: 'מתמטיקה',
            teacher: 'דוד לוי',
            studentName: 'יובל',
            description: 'השתתפות פעילה ומצוינת בשיעור',
            hourNum: 1,
            isJustified: true,
          }}
        />

        <ExamCard
          childColor="blue"
          canEdit
          onEdit={() => {}}
          onDelete={() => {}}
          exam={{
            id: 'ex-1',
            childId: '1',
            studentName: 'כפיר',
            name: 'מתמטיקה - שברים',
            description: 'פרקים ג-ה',
            date: '2026-11-28',
            grade: '96',
          }}
        />

        <AdminUserRow
          user={{
            id: 'u-1',
            username: 'admin',
            firstName: 'Dmitry',
            lastName: 'T',
            role: 'admin',
            familyRole: 'parent',
          }}
          isSelf
          onEdit={() => {}}
          onResetPassword={() => {}}
          onDelete={() => {}}
        />

        <PasskeyAccountRow
          username="parent1"
          firstName="דנה"
          lastName="כהן"
          deviceName="מפתח גישה ל-iPhone"
          onPress={() => {}}
        />

        <SectionCard
          icon={Palette}
          title="תצוגה ושפה"
          description="התאמה אישית של ערכת הנושא ושפת התצוגה"
          divided
          contentStyle={{ paddingTop: 6, paddingBottom: 8 }}
        >
          <SelectField
            label="שפה"
            description="בחירת שפת התצוגה המועדפת"
            layout="responsive"
            variant="filled"
            value={lang}
            options={[
              { label: 'עברית', value: 'he' },
              { label: 'English', value: 'en' },
            ]}
            onValueChange={setLang}
          />
          <SelectField
            label="ערכת נושא"
            description="בחירה בין מצב בהיר, כהה או מערכת"
            layout="responsive"
            variant="filled"
            value={themeMode}
            options={[
              { label: 'בהיר', value: 'light' },
              { label: 'כהה', value: 'dark' },
              { label: 'מערכת', value: 'system' },
            ]}
            onValueChange={setThemeMode}
          />
        </SectionCard>

        <SectionCard
          icon={GraduationCap}
          title="חיבור למערכת Webtop"
          description="סנכרון אוטומטי של אירועים ושיעורי בית"
          action={<StatusBadge variant="success" label="מחובר ומסונכרן" />}
        >
          <InfoBox columns={2}>
            <InfoItem label="שם משתמש Webtop" value="parent@school" />
            <InfoItem
              label="סנכרון אחרון"
              value="21/11/2026 08:42"
              isLtr
              valueStyle={{ fontSize: 12, ...heeboFont('500') }}
            />
          </InfoBox>
        </SectionCard>

        <NoticeBanner
          variant="info"
          title="עדכון מערכת"
          badge="Webtop"
          description="הסנכרון האחרון הושלם בהצלחה."
        />
        <NoticeBanner
          variant="warning"
          title="הסנכרון האוטומטי הושהה"
          description="Webtop דחה את פרטי ההתחברות השמורים. בדקו את הפרטים בהגדרות ואז המשיכו."
        >
          <Pressable onPress={() => {}}>
            <Text style={[heeboFont('600'), { fontSize: 12, color: palette.primary }]}>
              חידוש סנכרון אוטומטי
            </Text>
          </Pressable>
        </NoticeBanner>
        <NoticeBanner
          variant="destructive"
          description="שגיאת סנכרון: שם משתמש או סיסמה שגויים"
        />

        <EmptyStateCard
          icon={BookOpen}
          title="אין שיעורי בית להצגה"
          description="מטלות ושיעורי בית יופיעו כאן לאחר סנכרון."
        />

        <ScheduleTable
          lessons={[
            { id: '1', childId: '1', dayOfWeek: 0, hourNum: 1, subject: 'מתמטיקה' },
            { id: '2', childId: '1', dayOfWeek: 0, hourNum: 2, subject: 'אנגלית' },
            { id: '3', childId: '1', dayOfWeek: 1, hourNum: 1, subject: 'עברית' },
            { id: '4', childId: '1', dayOfWeek: 1, hourNum: 2, subject: 'מדעים' },
            { id: '5', childId: '1', dayOfWeek: 2, hourNum: 1, subject: 'תנ״ך' },
            { id: '6', childId: '1', dayOfWeek: 2, hourNum: 3, subject: 'חינוך גופני' },
            { id: '7', childId: '1', dayOfWeek: 3, hourNum: 1, subject: 'היסטוריה' },
          ]}
          finishTimes={[
            { id: 'f1', childId: '1', dayOfWeek: 0, finishTime: '13:30' },
            { id: 'f2', childId: '1', dayOfWeek: 1, finishTime: '14:15' },
            { id: 'f3', childId: '1', dayOfWeek: 2, finishTime: '12:45' },
          ]}
          childColorId="blue"
          currentDayOfWeek={1}
          isEditMode={false}
          onPressCell={() => {}}
          onPressFinishTime={() => {}}
        />

        <ScheduleTable
          lessons={[
            { id: 'e1', childId: '2', dayOfWeek: 0, hourNum: 1, subject: 'מתמטיקה' },
            { id: 'e2', childId: '2', dayOfWeek: 1, hourNum: 1, subject: 'מדעים' },
          ]}
          finishTimes={[{ id: 'ef1', childId: '2', dayOfWeek: 0, finishTime: '13:30' }]}
          childColorId="rose"
          currentDayOfWeek={1}
          isEditMode
          canEdit
          onPressCell={() => {}}
          onPressFinishTime={() => {}}
        />
      </ScrollView>
    );
  },
};

export const ModalsShowcase: StoryObj = {
  render: () => {
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [name, setName] = React.useState('');
    const [notes, setNotes] = React.useState('');

    return (
      <View style={{ gap: 12 }}>
        <Button label="פתח מודאל גיליון (Bottom Sheet)" onPress={() => setSheetOpen(true)} />
        <Button
          label="פתח מודאל אישור (Confirm Alert)"
          variant="destructive"
          onPress={() => setConfirmOpen(true)}
        />

        <Modal
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="הוספת מבחן"
          description="הזן את פרטי המבחן עבור התלמיד/ה."
          footer={
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Button
                label="ביטול"
                variant="outline"
                size="sm"
                onPress={() => setSheetOpen(false)}
              />
              <Button
                label="שמירה"
                size="sm"
                onPress={() => setSheetOpen(false)}
              />
            </View>
          }
        >
          <CounterField label="שם המבחן / מקצוע" currentLength={name.length} maxLength={50}>
            <FilledInput
              value={name}
              maxLength={50}
              onChangeText={setName}
              placeholder="למשל: מתמטיקה - שברים"
            />
          </CounterField>
          <CounterField label="תיאור (אופציונלי)" currentLength={notes.length} maxLength={200}>
            <FilledTextarea
              value={notes}
              maxLength={200}
              onChangeText={setNotes}
              placeholder="פרקים ג׳-ה׳, חומר ללימוד..."
            />
          </CounterField>
        </Modal>

        <ConfirmModal
          visible={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          icon={Trash2}
          title="מחיקת מבחן"
          description="האם אתה בטוח שברצונך למחוק מבחן זה?"
          confirmText="מחיקה"
          cancelText="ביטול"
        />
      </View>
    );
  },
};
