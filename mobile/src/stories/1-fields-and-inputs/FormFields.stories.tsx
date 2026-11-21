import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { Clock, Globe, Lock, Shield, User } from 'lucide-react-native';
import {
  CounterField,
  FieldLabel,
  FilledInput,
  FilledTextarea,
  IconInput,
  ReadOnlyPillField,
  SearchInput,
  SelectField,
  SwitchField,
  TimePresetInput,
} from '../../components/ui/FormFields';
import { DatePickerField } from '../../components/ui/LiquidDatePicker';
import { SectionCard } from '../../components/ui/Surfaces';

const meta: Meta = {
  title: '1 - Fields & Inputs/FormFields',
};

export default meta;

export const InputsShowcase: StoryObj = {
  render: () => {
    const [text, setText] = useState('');
    const [cardText, setCardText] = useState('');
    const [notes, setNotes] = useState('פרקים א׳-ד׳ בספר שמות, כולל שאלות חזרה בעמוד 45.');
    const [examName, setExamName] = useState('מבחן אמצע במתמטיקה');
    const [examDate, setExamDate] = useState<Date | undefined>(new Date());
    const [finishTime, setFinishTime] = useState('13:30');
    const [search, setSearch] = useState('');
    const [eventType, setEventType] = useState('behavior');
    const [lang, setLang] = useState('he');
    const [themeMode, setThemeMode] = useState('system');
    const [enabled, setEnabled] = useState(true);

    return (
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 40 }}>
        <View style={{ gap: 8 }}>
          <FieldLabel
            label="FilledInput (Filled / Modal)"
            description="שדה גלולה מלא ללא מסגרת"
          />
          <FilledInput
            value={text}
            onChangeText={setText}
            placeholder="הכנס שם מלא..."
          />
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel label="FilledInput (Card Variant)" />
          <FilledInput
            variant="card"
            value={cardText}
            onChangeText={setCardText}
            placeholder="הקלד כאן..."
          />
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel label="FilledInput (Disabled)" />
          <FilledInput editable={false} value="מנהל קבוע (ברירת מחדל)" />
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel label="IconInput" />
          <IconInput
            icon={Globe}
            forceLtr
            value="https://school.example.com"
            onChangeText={() => {}}
            placeholder="https://school.example.com"
          />
          <IconInput
            icon={User}
            value=""
            onChangeText={() => {}}
            placeholder="הכנס שם משתמש..."
          />
          <IconInput
            icon={Lock}
            secureTextEntry
            value=""
            onChangeText={() => {}}
            placeholder="••••••••"
          />
        </View>

        <CounterField
          label="CounterField + FilledInput"
          currentLength={examName.length}
          maxLength={50}
        >
          <FilledInput
            value={examName}
            maxLength={50}
            onChangeText={setExamName}
          />
        </CounterField>

        <CounterField
          label="FilledTextarea"
          currentLength={notes.length}
          maxLength={200}
        >
          <FilledTextarea
            value={notes}
            maxLength={200}
            onChangeText={setNotes}
            placeholder="הזן חומר למבחן..."
          />
        </CounterField>

        <View style={{ gap: 10 }}>
          <ReadOnlyPillField label="שם משתמש במערכת" value="admin" />
          <ReadOnlyPillField label="תפקיד" value="מנהל מערכת" icon={Shield} />
          <ReadOnlyPillField label="שעת סיום משוערת" value="13:30" icon={Clock} />
        </View>

        <TimePresetInput
          label="שעת סיום"
          value={finishTime}
          onChange={setFinishTime}
          presetsLabel="שעות נפוצות"
        />

        <DatePickerField
          label="DatePickerField (Modal Form)"
          date={examDate}
          setDate={setExamDate}
          clearable={false}
          formatPattern="dd/MM/yyyy"
        />

        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="חיפוש..."
        />

        <SelectField
          label="SelectField (Stacked Modal Field)"
          value={eventType}
          layout="stacked"
          variant="filled"
          options={[
            { label: 'התנהגות', value: 'behavior' },
            { label: 'נוכחות', value: 'attendance' },
            { label: 'לימודי', value: 'academic' },
          ]}
          onValueChange={setEventType}
        />

        <SectionCard
          title="SelectField (Responsive Divided Settings)"
          description="תצוגת הגדרות עם קווי הפרדה"
          divided
          contentStyle={{ paddingTop: 6, paddingBottom: 8 }}
        >
          <SelectField
            label="שפה"
            description="בחירת שפת התצוגה המועדפת"
            value={lang}
            layout="responsive"
            variant="filled"
            options={[
              { label: 'עברית', value: 'he' },
              { label: 'English', value: 'en' },
            ]}
            onValueChange={setLang}
          />
          <SelectField
            label="ערכת נושא"
            description="בחירה בין מצב בהיר, כהה או מערכת"
            value={themeMode}
            layout="responsive"
            variant="filled"
            options={[
              { label: 'בהיר', value: 'light' },
              { label: 'כהה', value: 'dark' },
              { label: 'מערכת', value: 'system' },
            ]}
            onValueChange={setThemeMode}
          />
        </SectionCard>

        <SwitchField
          label="סנכרון אוטומטי"
          description="סנכרון מול Webtop כל כ-3 שעות (לא בלילה)"
          value={enabled}
          onValueChange={setEnabled}
        />
      </ScrollView>
    );
  },
};
