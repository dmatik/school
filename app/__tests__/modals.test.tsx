import React from 'react';
import * as RN from 'react-native';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { TestProviders } from './testHelpers';
import { Modal, ConfirmModal, FullScreenModal } from '../src/components/ui/Modal';

describe('Modal, FullScreenModal & ConfirmModal', () => {
  afterEach(() => {
    act(() => {
      RN.Dimensions.set({
        window: { width: 390, height: 844, scale: 1, fontScale: 1 },
        screen: { width: 390, height: 844, scale: 1, fontScale: 1 },
      });
    });
    jest.restoreAllMocks();
  });

  it('renders Modal content and footer when visible=true on mobile width (< 640)', () => {
    const onClose = jest.fn();

    const { getByText } = render(
      <TestProviders>
        <Modal
          visible={true}
          onClose={onClose}
          title="Edit Lesson"
          description="Choose subject"
          footer={<Text>Footer Actions</Text>}
        >
          <Text>Modal Body Content</Text>
        </Modal>
      </TestProviders>
    );

    expect(getByText('Edit Lesson')).toBeTruthy();
    expect(getByText('Choose subject')).toBeTruthy();
    expect(getByText('Modal Body Content')).toBeTruthy();
    expect(getByText('Footer Actions')).toBeTruthy();
  });

  it('renders Modal on desktop/tablet width (>= 640) and hides when visible=false', () => {
    act(() => {
      RN.Dimensions.set({
        window: { width: 1024, height: 768, scale: 1, fontScale: 1 },
        screen: { width: 1024, height: 768, scale: 1, fontScale: 1 },
      });
    });
    const onClose = jest.fn();

    const { queryByText, rerender } = render(
      <TestProviders>
        <Modal visible={false} onClose={onClose} title="Hidden Modal">
          <Text>Secret Body</Text>
        </Modal>
      </TestProviders>
    );

    expect(queryByText('Hidden Modal')).toBeNull();
    expect(queryByText('Secret Body')).toBeNull();

    rerender(
      <TestProviders>
        <Modal visible={true} onClose={onClose} title="Desktop Modal">
          <Text>Visible Body</Text>
        </Modal>
      </TestProviders>
    );

    expect(queryByText('Desktop Modal')).toBeTruthy();
    expect(queryByText('Visible Body')).toBeTruthy();
  });

  it('calls onClose when Modal backdrop is pressed on tablet/desktop', () => {
    act(() => {
      RN.Dimensions.set({
        window: { width: 900, height: 768, scale: 1, fontScale: 1 },
        screen: { width: 900, height: 768, scale: 1, fontScale: 1 },
      });
    });
    const onClose = jest.fn();

    const { root } = render(
      <TestProviders>
        <Modal visible={true} onClose={onClose} title="Closable Modal">
          <Text>Body</Text>
        </Modal>
      </TestProviders>
    );

    const pressables = root.findAll((node) => typeof node.props?.onPress === 'function');
    expect(pressables.length).toBeGreaterThan(0);
    fireEvent.press(pressables[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders FullScreenModal when visible and hides when visible=false', () => {
    const onClose = jest.fn();
    const { queryByText, rerender } = render(
      <TestProviders>
        <FullScreenModal visible={false} onClose={onClose} title="Full Form">
          <Text>Form Fields</Text>
        </FullScreenModal>
      </TestProviders>
    );
    expect(queryByText('Full Form')).toBeNull();

    rerender(
      <TestProviders>
        <FullScreenModal visible={true} onClose={onClose} title="Full Form">
          <Text>Form Fields</Text>
        </FullScreenModal>
      </TestProviders>
    );
    expect(queryByText('Full Form')).toBeTruthy();
    expect(queryByText('Form Fields')).toBeTruthy();
  });

  it('renders ConfirmModal and triggers onConfirm and onClose', () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    const { getByText } = render(
      <TestProviders>
        <ConfirmModal
          visible={true}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Delete Exam"
          description="Are you sure?"
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </TestProviders>
    );

    expect(getByText('Delete Exam')).toBeTruthy();
    expect(getByText('Are you sure?')).toBeTruthy();

    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables ConfirmModal cancel button while loading', () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    const { getByText } = render(
      <TestProviders>
        <ConfirmModal
          visible={true}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Deleting"
          description="Please wait"
          confirmText="Delete"
          cancelText="Cancel"
          loading={true}
        />
      </TestProviders>
    );

    fireEvent.press(getByText('Cancel'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
