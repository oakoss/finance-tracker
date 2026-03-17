import { act, renderHook } from '@testing-library/react';

import { useFileUpload } from './use-file-upload';

const mockCreateObjectURL = vi.fn((file: File) => `blob:${file.name}`);
const mockRevokeObjectURL = vi.fn();

function createFile(name: string, size: number, type = 'text/plain'): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

describe('useFileUpload', () => {
  beforeEach(() => {
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with empty files and no errors', () => {
    const { result } = renderHook(() => useFileUpload());
    const [state] = result.current;

    expect(state.files).toEqual([]);
    expect(state.errors).toEqual([]);
    expect(state.isDragging).toBe(false);
  });

  it('adds a file in single mode', () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createFile('test.txt', 100);

    act(() => {
      result.current[1].addFiles([file]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(1);
    expect(state.files[0].file).toBe(file);
  });

  it('replaces file in single mode', () => {
    const { result } = renderHook(() => useFileUpload());
    const file1 = createFile('first.txt', 100);
    const file2 = createFile('second.txt', 200);

    act(() => {
      result.current[1].addFiles([file1]);
    });

    act(() => {
      result.current[1].addFiles([file2]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(1);
    expect(state.files[0].file).toBe(file2);
  });

  it('appends files in multiple mode', () => {
    const { result } = renderHook(() => useFileUpload({ multiple: true }));
    const file1 = createFile('a.txt', 100);
    const file2 = createFile('b.txt', 200);

    act(() => {
      result.current[1].addFiles([file1]);
    });

    act(() => {
      result.current[1].addFiles([file2]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(2);
  });

  it('rejects files exceeding maxSize', () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFileUpload({ maxSize: 50, onError }),
    );
    const file = createFile('big.txt', 100);

    act(() => {
      result.current[1].addFiles([file]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(0);
    expect(state.errors.length).toBeGreaterThan(0);
    expect(onError).toHaveBeenCalled();
  });

  it('rejects files not matching accept MIME type', () => {
    const { result } = renderHook(() => useFileUpload({ accept: 'image/png' }));
    const file = createFile('doc.txt', 100, 'text/plain');

    act(() => {
      result.current[1].addFiles([file]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(0);
    expect(state.errors.length).toBeGreaterThan(0);
  });

  it('accepts files matching wildcard MIME type', () => {
    const { result } = renderHook(() => useFileUpload({ accept: 'image/*' }));
    const file = createFile('photo.jpg', 100, 'image/jpeg');

    act(() => {
      result.current[1].addFiles([file]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(1);
  });

  it('accepts files matching extension', () => {
    const { result } = renderHook(() => useFileUpload({ accept: '.csv' }));
    const file = createFile('data.csv', 100, 'text/csv');

    act(() => {
      result.current[1].addFiles([file]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(1);
  });

  it('rejects files not matching extension', () => {
    const { result } = renderHook(() => useFileUpload({ accept: '.csv' }));
    const file = createFile('data.json', 100, 'application/json');

    act(() => {
      result.current[1].addFiles([file]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(0);
    expect(state.errors.length).toBeGreaterThan(0);
  });

  it('skips duplicate files in multiple mode', () => {
    const { result } = renderHook(() => useFileUpload({ multiple: true }));
    const file = createFile('same.txt', 100);

    act(() => {
      result.current[1].addFiles([file]);
    });

    act(() => {
      result.current[1].addFiles([file]);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(1);
  });

  it('enforces maxFiles in multiple mode', () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFileUpload({ maxFiles: 2, multiple: true, onError }),
    );
    const files = [
      createFile('a.txt', 10),
      createFile('b.txt', 10),
      createFile('c.txt', 10),
    ];

    act(() => {
      result.current[1].addFiles(files);
    });

    const [state] = result.current;
    expect(state.files).toHaveLength(0);
    expect(state.errors.length).toBeGreaterThan(0);
    expect(onError).toHaveBeenCalled();
  });

  it('removes a file by id', () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createFile('test.txt', 100);

    act(() => {
      result.current[1].addFiles([file]);
    });

    const fileId = result.current[0].files[0].id;

    act(() => {
      result.current[1].removeFile(fileId);
    });

    expect(result.current[0].files).toHaveLength(0);
  });

  it('revokes object URL when removing a File', () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createFile('test.txt', 100);

    act(() => {
      result.current[1].addFiles([file]);
    });

    const preview = result.current[0].files[0].preview;
    const fileId = result.current[0].files[0].id;

    act(() => {
      result.current[1].removeFile(fileId);
    });

    expect(mockRevokeObjectURL).toHaveBeenCalledWith(preview);
  });

  it('clears all files and revokes URLs', () => {
    const { result } = renderHook(() => useFileUpload({ multiple: true }));

    act(() => {
      result.current[1].addFiles([
        createFile('a.txt', 10),
        createFile('b.txt', 10),
      ]);
    });

    expect(result.current[0].files).toHaveLength(2);

    act(() => {
      result.current[1].clearFiles();
    });

    expect(result.current[0].files).toHaveLength(0);
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('calls onFilesChange when files are added', () => {
    const onFilesChange = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onFilesChange }));

    act(() => {
      result.current[1].addFiles([createFile('test.txt', 100)]);
    });

    expect(onFilesChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ file: expect.any(File) }),
      ]),
    );
  });

  it('calls onFilesAdded with newly added files', () => {
    const onFilesAdded = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onFilesAdded }));

    act(() => {
      result.current[1].addFiles([createFile('test.txt', 100)]);
    });

    expect(onFilesAdded).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ file: expect.any(File) }),
      ]),
    );
  });

  it('clears errors', () => {
    const { result } = renderHook(() => useFileUpload({ maxSize: 10 }));

    act(() => {
      result.current[1].addFiles([createFile('big.txt', 100)]);
    });

    expect(result.current[0].errors.length).toBeGreaterThan(0);

    act(() => {
      result.current[1].clearErrors();
    });

    expect(result.current[0].errors).toEqual([]);
  });

  it('initializes with provided FileMetadata', () => {
    const initialFiles = [
      {
        id: 'existing-1',
        name: 'old.txt',
        size: 50,
        type: 'text/plain',
        url: 'https://example.com/old.txt',
      },
    ];

    const { result } = renderHook(() => useFileUpload({ initialFiles }));

    const [state] = result.current;
    expect(state.files).toHaveLength(1);
    expect(state.files[0].id).toBe('existing-1');
    expect(state.files[0].preview).toBe('https://example.com/old.txt');
  });

  it('does not revoke URL for FileMetadata on remove', () => {
    const initialFiles = [
      {
        id: 'meta-1',
        name: 'old.txt',
        size: 50,
        type: 'text/plain',
        url: 'https://example.com/old.txt',
      },
    ];

    const { result } = renderHook(() => useFileUpload({ initialFiles }));

    act(() => {
      result.current[1].removeFile('meta-1');
    });

    expect(mockRevokeObjectURL).not.toHaveBeenCalled();
  });

  it('creates object URL preview for File instances', () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createFile('photo.jpg', 100, 'image/jpeg');

    act(() => {
      result.current[1].addFiles([file]);
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    expect(result.current[0].files[0].preview).toBe(`blob:${file.name}`);
  });

  it('does nothing when addFiles is called with empty list', () => {
    const onFilesChange = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onFilesChange }));

    act(() => {
      result.current[1].addFiles([]);
    });

    expect(onFilesChange).not.toHaveBeenCalled();
    expect(result.current[0].files).toHaveLength(0);
  });
});
