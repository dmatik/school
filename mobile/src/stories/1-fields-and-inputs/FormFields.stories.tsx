import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { Globe, User } from 'lucide-react-native';
import {
  FieldLabel,
  FilledInput,
  IconInput,
  SearchInput,
  SelectField,
  SwitchField,
} from '../../components/ui/FormFields';

const meta: Meta = {
  title: '1 - Fields & Inputs/FormFields',
};

export default meta;

export const InputsShowcase: StoryObj = {
  render: () => {
    const [text, setText] = useState('');
    const [search, setSearch] = useState('');
    const [lang, setLang] = useState('he');
    const [enabled, setEnabled] = useState(true);

    return (
      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <FieldLabel label="FilledInput" description="Standard form field" />
          <FilledInput
            value={text}
            onChangeText={setText}
            placeholder="Enter value..."
          />
        </View>

        <View style={{ gap: 6 }}>
          <FieldLabel label="IconInput (Server URL)" />
          <IconInput
            icon={Globe}
            forceLtr
            value="https://school.example.com"
            onChangeText={() => {}}
            placeholder="https://school.example.com"
          />
        </View>

        <View style={{ gap: 6 }}>
          <FieldLabel label="IconInput (Username)" />
          <IconInput
            icon={User}
            value=""
            onChangeText={() => {}}
            placeholder="Username"
          />
        </View>

        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search..."
        />

        <SelectField
          label="SelectField"
          value={lang}
          options={[
            { label: 'עברית', value: 'he' },
            { label: 'English', value: 'en' },
          ]}
          onValueChange={setLang}
        />

        <SwitchField
          label="Automatic Sync"
          description="Sync with Webtop every ~3 hours"
          value={enabled}
          onValueChange={setEnabled}
        />
      </View>
    );
  },
};
