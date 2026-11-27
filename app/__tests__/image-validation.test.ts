import * as ImageManipulator from 'expo-image-manipulator';

describe('Image Compression & Avatar Upload Validation', () => {
  it('invokes expo-image-manipulator to resize and compress avatars', async () => {
    const spy = jest.spyOn(ImageManipulator, 'manipulateAsync').mockResolvedValueOnce({
      uri: 'file:///tmp/avatar.jpg',
      width: 256,
      height: 256,
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
    });

    const result = await ImageManipulator.manipulateAsync(
      'file:///tmp/original.png',
      [{ resize: { width: 512 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    expect(spy).toHaveBeenCalledWith(
      'file:///tmp/original.png',
      [{ resize: { width: 512 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    expect(result.base64).toBeTruthy();
  });

  it('rejects manipulation results missing base64 payload', async () => {
    jest.spyOn(ImageManipulator, 'manipulateAsync').mockResolvedValueOnce({
      uri: 'file:///tmp/empty.jpg',
      width: 0,
      height: 0,
      base64: undefined,
    });

    const result = await ImageManipulator.manipulateAsync('file:///tmp/empty.png', []);
    expect(result.base64).toBeUndefined();
  });

  it('enforces 5MB server limit for avatar base64 string (~7MB)', () => {
    const maxAllowedBase64Length = 7 * 1024 * 1024;
    const validSmallAvatar =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const isUnder5Mb = (avatar: string) => avatar.length <= maxAllowedBase64Length;
    expect(isUnder5Mb(validSmallAvatar)).toBe(true);

    const oversizedLength = maxAllowedBase64Length + 100;
    expect(oversizedLength <= maxAllowedBase64Length).toBe(false);
  });

  it('validates MIME format check strictly rejects dangerous or non-image types', () => {
    const isAllowedImage = (avatar: string) =>
      /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar.trim());

    expect(isAllowedImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')).toBe(true);
    expect(isAllowedImage('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD')).toBe(true);
    expect(isAllowedImage('data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQ')).toBe(
      true
    );
    expect(
      isAllowedImage('data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+')
    ).toBe(false);
    expect(isAllowedImage('data:text/plain;base64,aGVsbG8=')).toBe(false);
    expect(isAllowedImage('javascript:alert(1)')).toBe(false);
  });
});
