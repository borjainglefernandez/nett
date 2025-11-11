import { renderHook, act } from '@testing-library/react';
import useAppAlert from '../appAlert';

describe('useAppAlert', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useAppAlert());

    expect(result.current.open).toBe(false);
    expect(result.current.message).toBe(null);
    expect(result.current.severity).toBe('info');
  });

  it('triggers alert with message and severity', () => {
    const { result } = renderHook(() => useAppAlert());

    act(() => {
      result.current.trigger('Test message', 'error');
    });

    expect(result.current.open).toBe(true);
    expect(result.current.message).toBe('Test message');
    expect(result.current.severity).toBe('error');
  });

  it('triggers alert with default severity', () => {
    const { result } = renderHook(() => useAppAlert());

    act(() => {
      result.current.trigger('Test message', 'info');
    });

    expect(result.current.open).toBe(true);
    expect(result.current.message).toBe('Test message');
    expect(result.current.severity).toBe('info');
  });

  it('closes alert', () => {
    const { result } = renderHook(() => useAppAlert());

    // First trigger an alert
    act(() => {
      result.current.trigger('Test message', 'error');
    });

    expect(result.current.open).toBe(true);

    // Then close it
    act(() => {
      result.current.close();
    });

    expect(result.current.open).toBe(false);
  });

  it('handles multiple trigger calls', () => {
    const { result } = renderHook(() => useAppAlert());

    act(() => {
      result.current.trigger('First message', 'error');
    });

    expect(result.current.message).toBe('First message');
    expect(result.current.severity).toBe('error');

    act(() => {
      result.current.trigger('Second message', 'success');
    });

    expect(result.current.message).toBe('Second message');
    expect(result.current.severity).toBe('success');
  });

  it('handles different severity levels', () => {
    const { result } = renderHook(() => useAppAlert());

    const severities = ['info', 'success', 'warning', 'error'] as const;

    severities.forEach((severity) => {
      act(() => {
        result.current.trigger(`Test ${severity} message`, severity);
      });

      expect(result.current.severity).toBe(severity);
      expect(result.current.open).toBe(true);

      act(() => {
        result.current.close();
      });
    });
  });

  it('handles empty message', () => {
    const { result } = renderHook(() => useAppAlert());

    act(() => {
      result.current.trigger('');
    });

    expect(result.current.open).toBe(true);
    expect(result.current.message).toBe('');
  });

  it('handles very long messages', () => {
    const { result } = renderHook(() => useAppAlert());

    const longMessage = 'This is a very long message that might be used for detailed error descriptions or success messages that contain a lot of information about what happened during the operation.';

    act(() => {
      result.current.trigger(longMessage, 'info');
    });

    expect(result.current.open).toBe(true);
    expect(result.current.message).toBe(longMessage);
  });

  it('handles special characters in message', () => {
    const { result } = renderHook(() => useAppAlert());

    const specialMessage = 'Test message with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';

    act(() => {
      result.current.trigger(specialMessage, 'warning');
    });

    expect(result.current.open).toBe(true);
    expect(result.current.message).toBe(specialMessage);
  });

  it('handles unicode characters in message', () => {
    const { result } = renderHook(() => useAppAlert());

    const unicodeMessage = 'Test message with unicode: 🚀 ✅ ❌ ⚠️ 💡';

    act(() => {
      result.current.trigger(unicodeMessage, 'success');
    });

    expect(result.current.open).toBe(true);
    expect(result.current.message).toBe(unicodeMessage);
  });

  it('maintains state across multiple open/close cycles', () => {
    const { result } = renderHook(() => useAppAlert());

    // First cycle
    act(() => {
      result.current.trigger('First message', 'error');
    });
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.open).toBe(false);

    // Second cycle
    act(() => {
      result.current.trigger('Second message', 'success');
    });
    expect(result.current.open).toBe(true);
    expect(result.current.message).toBe('Second message');

    act(() => {
      result.current.close();
    });
    expect(result.current.open).toBe(false);
  });

  it('handles rapid trigger calls', () => {
    const { result } = renderHook(() => useAppAlert());

    act(() => {
      result.current.trigger('Message 1', 'info');
      result.current.trigger('Message 2', 'error');
      result.current.trigger('Message 3', 'success');
    });

    // Should show the last message
    expect(result.current.message).toBe('Message 3');
    expect(result.current.severity).toBe('success');
    expect(result.current.open).toBe(true);
  });

  it('handles rapid close calls', () => {
    const { result } = renderHook(() => useAppAlert());

    act(() => {
      result.current.trigger('Test message', 'error');
    });

    expect(result.current.open).toBe(true);

    act(() => {
      result.current.close();
      result.current.close();
      result.current.close();
    });

    expect(result.current.open).toBe(false);
  });
});
