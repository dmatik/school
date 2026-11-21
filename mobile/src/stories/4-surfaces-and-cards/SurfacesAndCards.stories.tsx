import React from 'react';
import { ScrollView } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { BookOpen, GraduationCap } from 'lucide-react-native';
import {
  CardSurface,
  SectionCard,
  InfoBox,
  InfoItem,
  EmptyStateCard,
  NoticeBanner,
  SectionDateHeader,
} from '../../components/ui/Surfaces';
import {
  HomeworkCard,
  IncidentCard,
  ExamCard,
  AdminUserRow,
} from '../../components/ui/Cards';
import { ScheduleTable } from '../../components/ui/ScheduleTable';

const meta: Meta = {
  title: '4 - Surfaces & Cards/SurfacesAndCards',
};

export default meta;

export const CardsAndSurfaces: StoryObj = {
  render: () => (
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

      <SectionCard icon={GraduationCap} title="SectionCard" description="InfoBox container">
        <InfoBox>
          <InfoItem label="Username" value="parent@school" />
        </InfoBox>
      </SectionCard>

      <NoticeBanner variant="warning" description="Sample warning banner" />

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
  ),
};
